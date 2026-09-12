import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { q, upsertSql } from './db.js'
import {
  hashPassword, verifyPassword, signToken, publicUser,
  requireAuth, requireSuper, genCode,
} from './auth.js'
import { PROJECTORS, deleteProjected, projectClub } from './relational.js'
import { initiatePayment, checkPayment, handleGeniuspayNotify, simulateSuccess } from './payments.js'
import { sendTwoFactorCode, notifyExternal, emailWelcome, emailNewMessage } from './notify.js'
import { integrationsStatus, geniuspay } from './config.js'

export const ENTITIES = [
  'members', 'cotisations', 'mouvements', 'penalites', 'epargne', 'groupes_epargne',
  'prets', 'redistributions', 'aides', 'seances', 'parrainages',
  'reclamations', 'sanctions', 'rapports', 'alertes', 'annonces', 'audits',
  'notifications', 'convocations',
]

const newClubCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)]
  return c
}

/* Caisses par défaut : la caisse de cotisation et la caisse d'épargne — XAF uniquement. */
const caisseVide = () => ({ XAF: { Cotisation: 0, 'Épargne': 0 } })

function canAccessClub(user, clubId) {
  return !!user.is_superadmin || user.club_id === clubId
}

/* RBAC serveur : chaque entité a un rôle minimal requis pour l'écriture.
   Avant, seule l'appartenance au club était vérifiée — la séparation des
   rôles n'existait que dans l'UI. Le superadmin passe partout. */
const WRITE_ROLES = {
  members: 'President', ordre: 'President', clubs: 'President',
  cotisations: 'Tresorier', mouvements: 'Tresorier', penalites: 'Tresorier',
  epargne: 'Tresorier', groupes_epargne: 'Tresorier',
  prets: 'Tresorier', redistributions: 'Tresorier', aides: 'Tresorier',
  seances: 'Secretaire', convocations: 'Secretaire', notifications: 'Secretaire',
  parrainages: 'Secretaire', reclamations: 'Membre',
  sanctions: 'President', rapports: 'Commissaire', alertes: 'Commissaire',
  audits: 'Commissaire', annonces: 'President',
}

/* Hiérarchie de rôles : chacun peut écrire ce que les rôles inférieurs peuvent. */
const ROLE_RANK = { Membre: 0, Secretaire: 1, Tresorier: 2, Commissaire: 2, President: 3, SuperAdmin: 4 }

function canWriteEntity(user, entity) {
  if (user.is_superadmin) return true
  const minRole = WRITE_ROLES[entity]
  if (!minRole) return true // entités libres (notifications personnelles…)
  return (ROLE_RANK[user.role] ?? 0) >= (ROLE_RANK[minRole] ?? 99)
}

const router = Router()

/* ============================ AUTH ============================ */

router.post('/auth/signup', async (req, res) => {
  const { nom, telephone, email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe obligatoires.' })
  if (String(password).length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' })
  const [exists] = await q('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase()])
  if (exists.length) return res.status(400).json({ error: 'Un compte existe déjà avec cet email.' })
  const id = randomUUID()
  await q(
    `INSERT INTO users (id, email, password_hash, nom, telephone, role, onboarding_done)
     VALUES (?,?,?,?,?, 'Membre', 0)`,
    [id, String(email).toLowerCase(), await hashPassword(password), nom || '', telephone || '']
  )
  const [rows] = await q('SELECT * FROM users WHERE id = ?', [id])
  const user = rows[0]
  /* Email de bienvenue automatique (ignoré silencieusement si Mailjet absent). */
  emailWelcome({ email: user.email, nom: user.nom }).catch(() => {})
  res.json({ token: signToken(user), user: publicUser(user) })
})

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const [rows] = await q('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()])
  const user = rows[0]
  if (!user || !(await verifyPassword(String(password || ''), user.password_hash))) {
    return res.status(400).json({ error: 'Email ou mot de passe incorrect.' })
  }
  if (user.statut === 'Suspendu' && !user.is_superadmin) {
    return res.status(403).json({ error: 'Votre compte a été suspendu par l\'administrateur de la plateforme.' })
  }
  // Le club suspendu bloque la connexion de tous ses membres.
  if (user.club_id && !user.is_superadmin) {
    const [clubs] = await q('SELECT statut FROM clubs WHERE id = ?', [user.club_id])
    if (clubs.length && clubs[0].statut === 'Suspendu') {
      return res.status(403).json({ error: 'Votre association a été suspendue par l\'administrateur de la plateforme.' })
    }
  }
  if (user.two_fa) {
    const code = genCode()
    await q('UPDATE users SET two_fa_code = ? WHERE id = ?', [code, user.id])
    // Envoi multicanal : SMS (Twilio) puis email (Brevo) — mode simulation si aucun canal.
    const { channels } = await sendTwoFactorCode({ email: user.email, tel: user.telephone, nom: user.nom, code })
    const delivered = channels.length > 0
    return res.json({
      need2fa: true,
      // En mode simulation uniquement, le code est retourné pour affichage honnête.
      code: delivered ? undefined : code,
      channel: delivered ? channels[0] : 'simulation',
    })
  }
  res.json({ token: signToken(user), user: publicUser(user) })
})

router.post('/auth/confirm2fa', async (req, res) => {
  const { email, password, code } = req.body || {}
  const [rows] = await q('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()])
  const user = rows[0]
  if (!user || !(await verifyPassword(String(password || ''), user.password_hash))) {
    return res.status(400).json({ error: 'Email ou mot de passe incorrect.' })
  }
  if (!user.two_fa_code || user.two_fa_code !== String(code)) {
    return res.status(400).json({ error: 'Code de vérification incorrect.' })
  }
  await q('UPDATE users SET two_fa_code = NULL WHERE id = ?', [user.id])
  res.json({ token: signToken(user), user: publicUser(user) })
})

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

router.post('/auth/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {}
  if (String(newPassword || '').length < 8) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
  if (!(await verifyPassword(String(oldPassword || ''), req.user.password_hash))) {
    return res.status(400).json({ error: 'Ancien mot de passe incorrect.' })
  }
  await q('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(newPassword), req.user.id])
  res.json({ ok: true })
})

router.post('/auth/forgot', async (req, res) => {
  const { email } = req.body || {}
  const [rows] = await q('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()])
  if (!rows.length) return res.json({ code: null }) // ne révèle pas l'existence du compte
  const code = genCode()
  await q('UPDATE users SET reset_code = ? WHERE id = ?', [code, rows[0].id])
  // Envoi multicanal ; en mode simulation le code est retourné pour affichage honnête.
  const { channels } = await sendTwoFactorCode({ email: rows[0].email, tel: rows[0].telephone, nom: rows[0].nom, code })
  const delivered = channels.length > 0
  res.json({ code: delivered ? undefined : code, channel: delivered ? channels[0] : 'simulation' })
})

router.post('/auth/reset', async (req, res) => {
  const { email, code, newPassword } = req.body || {}
  if (String(newPassword || '').length < 8) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
  const [rows] = await q('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()])
  const user = rows[0]
  if (!user || !user.reset_code || user.reset_code !== String(code)) {
    return res.status(400).json({ error: 'Code de réinitialisation incorrect.' })
  }
  await q('UPDATE users SET password_hash = ?, reset_code = NULL WHERE id = ?', [await hashPassword(newPassword), user.id])
  res.json({ ok: true })
})

/* ============================ USERS ============================ */

router.patch('/users/me', requireAuth, async (req, res) => {
  const { nom, telephone, photo, two_fa } = req.body || {}
  const fields = []
  const vals = []
  if (nom !== undefined) { fields.push('nom = ?'); vals.push(nom) }
  if (telephone !== undefined) { fields.push('telephone = ?'); vals.push(telephone) }
  if (photo !== undefined) { fields.push('photo = ?'); vals.push(photo) }
  if (two_fa !== undefined) { fields.push('two_fa = ?'); vals.push(two_fa ? 1 : 0) }
  if (fields.length) {
    vals.push(req.user.id)
    await q(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals)
  }
  const [rows] = await q('SELECT * FROM users WHERE id = ?', [req.user.id])
  res.json({ user: publicUser(rows[0]) })
})

router.post('/users/me/onboarding', requireAuth, async (req, res) => {
  await q('UPDATE users SET onboarding_done = 1 WHERE id = ?', [req.user.id])
  res.json({ ok: true })
})

/* ---- Activation 2FA réelle (plus de simulation côté client) ----
   1. POST /users/me/2fa/request : génère un code serveur, l'envoie par
      SMS (Twilio) ou email (Mailjet) ; en mode simulation (aucun canal),
      le code est retourné pour affichage honnête.
   2. POST /users/me/2fa/confirm : vérifie le code ; seul un code correct
      active two_fa sur le compte. */
router.post('/users/me/2fa/request', requireAuth, async (req, res) => {
  if (req.user.two_fa) return res.status(400).json({ error: 'La double authentification est déjà activée.' })
  const code = genCode()
  await q('UPDATE users SET two_fa_code = ? WHERE id = ?', [code, req.user.id])
  const { channels } = await sendTwoFactorCode({ email: req.user.email, tel: req.user.telephone, nom: req.user.nom, code })
  const delivered = channels.length > 0
  res.json({
    sent: true,
    // En mode simulation uniquement, le code est retourné pour affichage honnête.
    code: delivered ? undefined : code,
    channel: delivered ? channels[0] : 'simulation',
  })
})

router.post('/users/me/2fa/confirm', requireAuth, async (req, res) => {
  const { code } = req.body || {}
  const [rows] = await q('SELECT two_fa_code FROM users WHERE id = ?', [req.user.id])
  if (!rows.length) return res.status(404).json({ error: 'Compte introuvable.' })
  if (!rows[0].two_fa_code || rows[0].two_fa_code !== String(code)) {
    return res.status(400).json({ error: 'Code de vérification incorrect.' })
  }
  await q('UPDATE users SET two_fa = 1, two_fa_code = NULL WHERE id = ?', [req.user.id])
  res.json({ ok: true })
})

/* ============================ CLUBS ============================ */

router.post('/clubs', requireAuth, async (req, res) => {
  const { nom, ville } = req.body || {}
  if (!nom) return res.status(400).json({ error: "Le nom de l'association est obligatoire." })
  const id = randomUUID()
  const code = newClubCode()
  const payload = {
    frequence: 'Mensuelle', penaliteRetard: 0, tauxPret: 10,
    dateDebut: new Date().toISOString().slice(0, 10), banque: '',
    ordrePassage: [], caisse: caisseVide(),
  }
  await q(
    `INSERT INTO clubs (id, code, nom, ville, type, devise, montant_cotisation, statut, created_by, payload)
     VALUES (?,?,?,?,?, 'XAF', 0, 'Preparation', ?, ?)`,
    [id, code, nom, ville || '', 'Rotative', req.user.id, JSON.stringify(payload)]
  )
  // Le créateur devient Président + membre du club.
  const memberId = `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const memberPayload = {
    id: memberId, nom: req.user.nom || nom, role: 'President',
    tel: req.user.telephone || '', email: req.user.email || '',
    statut: 'Actif', dateAdhesion: new Date().toISOString().slice(0, 10), photo: null,
  }
  await q(
    `INSERT INTO records (entity, id, club_id, user_id, payload) VALUES ('members', ?, ?, ?, ?)`,
    [memberId, id, req.user.id, JSON.stringify(memberPayload)]
  )
  try { await PROJECTORS.members(id, { ...memberPayload, _userId: req.user.id }) } catch { /* projection best-effort */ }
  await projectClub(id, { payload, statut: 'Preparation' })
  await q('UPDATE users SET club_id = ?, role = ? WHERE id = ?', [id, 'President', req.user.id])
  const [rows] = await q('SELECT * FROM users WHERE id = ?', [req.user.id])
  res.json({ user: publicUser(rows[0]), clubId: id, code })
})

router.post('/clubs/join', requireAuth, async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase()
  const [rows] = await q('SELECT * FROM clubs WHERE code = ?', [code])
  const club = rows[0]
  if (!club) return res.status(400).json({ error: 'Aucun club trouvé avec ce code.' })
  const memberId = `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const memberPayload = {
    id: memberId, nom: req.user.nom || req.user.email, role: 'Membre',
    tel: req.user.telephone || '', email: req.user.email || '',
    statut: 'En attente', dateAdhesion: new Date().toISOString().slice(0, 10), photo: null,
  }
  await q(
    `INSERT INTO records (entity, id, club_id, user_id, payload) VALUES ('members', ?, ?, ?, ?)`,
    [memberId, club.id, req.user.id, JSON.stringify(memberPayload)]
  )
  try { await PROJECTORS.members(club.id, { ...memberPayload, _userId: req.user.id }) } catch { /* projection best-effort */ }
  await q('UPDATE users SET club_id = ?, role = ? WHERE id = ?', [club.id, 'Membre', req.user.id])
  const [urows] = await q('SELECT * FROM users WHERE id = ?', [req.user.id])
  res.json({ user: publicUser(urows[0]), clubId: club.id, code: club.code })
})

router.get('/clubs/:id', requireAuth, async (req, res) => {
  if (!canAccessClub(req.user, req.params.id)) return res.status(403).json({ error: 'Accès refusé à ce club.' })
  const [rows] = await q('SELECT * FROM clubs WHERE id = ?', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Club introuvable.' })
  res.json({ club: rows[0] })
})

router.patch('/clubs/:id', requireAuth, async (req, res) => {
  if (!canAccessClub(req.user, req.params.id)) return res.status(403).json({ error: 'Accès refusé à ce club.' })
  const { nom, ville, type, devise, montant_cotisation, statut, payload } = req.body || {}
  const fields = []
  const vals = []
  if (nom !== undefined) { fields.push('nom = ?'); vals.push(nom) }
  if (ville !== undefined) { fields.push('ville = ?'); vals.push(ville) }
  if (type !== undefined) { fields.push('type = ?'); vals.push(type) }
  if (devise !== undefined) { fields.push('devise = ?'); vals.push(devise) }
  if (montant_cotisation !== undefined) { fields.push('montant_cotisation = ?'); vals.push(Number(montant_cotisation) || 0) }
  if (statut !== undefined) { fields.push('statut = ?'); vals.push(statut) }
  if (payload !== undefined) { fields.push('payload = ?'); vals.push(JSON.stringify(payload)) }
  if (!fields.length) return res.json({ ok: true })
  vals.push(req.params.id)
  await q(`UPDATE clubs SET ${fields.join(', ')} WHERE id = ?`, vals)
  // Projeter la payload club complète (paramètres, ordre de passage, caisse) dans les tables dédiées.
  try {
    const [cur] = await q('SELECT payload, statut FROM clubs WHERE id = ?', [req.params.id])
    if (cur.length) await projectClub(req.params.id, cur[0])
  } catch { /* projection best-effort */ }
  res.json({ ok: true })
})

router.get('/clubs/:id/data', requireAuth, async (req, res) => {
  if (!canAccessClub(req.user, req.params.id)) return res.status(403).json({ error: 'Accès refusé à ce club.' })
  const [clubRows] = await q('SELECT * FROM clubs WHERE id = ?', [req.params.id])
  if (!clubRows.length) return res.status(404).json({ error: 'Club introuvable.' })
  const [recRows] = await q('SELECT entity, id, user_id, payload FROM records WHERE club_id = ?', [req.params.id])
  const grouped = {}
  for (const e of ENTITIES) grouped[e] = []
  for (const r of recRows) {
    if (!grouped[r.entity]) grouped[r.entity] = []
    grouped[r.entity].push({ id: r.id, user_id: r.user_id, payload: r.payload })
  }
  res.json({ club: clubRows[0], records: grouped })
})

router.post('/clubs/:id/records/:entity', requireAuth, async (req, res) => {
  const { id, entity } = req.params
  if (!canAccessClub(req.user, id)) return res.status(403).json({ error: 'Accès refusé à ce club.' })
  if (!ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entité inconnue.' })
  if (!canWriteEntity(req.user, entity)) {
    return res.status(403).json({ error: 'Votre rôle ne permet pas cette action.' })
  }
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
  for (const row of rows) {
    if (!row?.id) continue
    await q(
      upsertSql({
        table: 'records',
        cols: ['entity', 'id', 'club_id', 'user_id', 'payload'],
        key: ['entity', 'id'],
        updateCols: ['club_id', 'user_id', 'payload'],
      }),
      [entity, row.id, id, row.user_id || null, JSON.stringify(row.payload ?? {})]
    )
    // Propager le rôle du membre vers son compte (nomination au bureau).
    if (entity === 'members' && row.user_id && row.payload?.role) {
      await q('UPDATE users SET role = ? WHERE id = ?', [row.payload.role, row.user_id])
    }
    // Dupliquer dans les tables relationnelles (schéma complet).
    const proj = PROJECTORS[entity]
    if (proj && row.payload && typeof row.payload === 'object') {
      const payload = { ...row.payload, id: row.id }
      if (row.user_id) payload._userId = row.user_id
      try { await proj(id, payload) } catch { /* best-effort */ }
    }
  }
  res.json({ ok: true, count: rows.length })
})

router.post('/clubs/:id/records/:entity/delete', requireAuth, async (req, res) => {
  const { id, entity } = req.params
  if (!canAccessClub(req.user, id)) return res.status(403).json({ error: 'Accès refusé à ce club.' })
  if (!ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entité inconnue.' })
  if (!canWriteEntity(req.user, entity)) {
    return res.status(403).json({ error: 'Votre rôle ne permet pas cette action.' })
  }
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
  if (!ids.length) return res.json({ ok: true })
  const placeholders = ids.map(() => '?').join(',')
  await q(`DELETE FROM records WHERE entity = ? AND club_id = ? AND id IN (${placeholders})`, [entity, id, ...ids])
  try { await deleteProjected(entity, id, ids) } catch { /* best-effort */ }
  res.json({ ok: true })
})

/* ============================ MESSAGERIE INTERNE ============================ */
/* Conversations et messages entre membres d'un même club. Les tables
   conversations / conversation_participants / messages sont créées au
   bootstrap (db.js EXTRA_TABLES). */

/* Liste des conversations de l'utilisateur courant (club courant). */
router.get('/messages/conversations', requireAuth, async (req, res) => {
  if (!req.user.club_id) return res.json({ conversations: [] })
  const [rows] = await q(
    `SELECT c.id, c.club_id, c.sujet, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id
              AND m.created_at > COALESCE(cp.last_read_at, to_timestamp(0))) AS unread
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE c.club_id = ?
     ORDER BY c.updated_at DESC`,
    [req.user.id, req.user.club_id]
  )
  res.json({ conversations: rows })
})

/* Liste des membres du club avec qui ouvrir une conversation. */
router.get('/messages/contacts', requireAuth, async (req, res) => {
  if (!req.user.club_id) return res.json({ contacts: [] })
  const [rows] = await q(
    `SELECT DISTINCT u.id, u.nom, u.email, u.role
     FROM users u
     WHERE u.club_id = ? AND u.id != ? AND u.statut = 'Actif'
     ORDER BY u.nom`,
    [req.user.club_id, req.user.id]
  )
  res.json({ contacts: rows })
})

/* Ouvrir (ou réutiliser) une conversation directe avec un membre du club. */
router.post('/messages/conversations', requireAuth, async (req, res) => {
  const { contactId } = req.body || {}
  if (!req.user.club_id) return res.status(400).json({ error: 'Aucun club associé à votre compte.' })
  if (!contactId) return res.status(400).json({ error: 'Destinataire manquant.' })
  if (contactId === req.user.id) return res.status(400).json({ error: 'Impossible de s\'écrire à soi-même.' })
  const [contactRows] = await q('SELECT id, nom FROM users WHERE id = ? AND club_id = ?', [contactId, req.user.club_id])
  if (!contactRows.length) return res.status(400).json({ error: 'Ce membre n\'est pas dans votre association.' })

  /* Conversation directe existante entre les deux ? (clé = paire de participants) */
  const [existing] = await q(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = ?
     JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = ?
     WHERE c.club_id = ? AND c.sujet = ''`,
    [req.user.id, contactId, req.user.club_id]
  )
  if (existing.length) return res.json({ conversationId: existing[0].id })

  /* Créer la conversation + les deux participations. */
  const cid = randomUUID()
  await q('INSERT INTO conversations (id, club_id, created_by, sujet) VALUES (?,?,?,?)',
    [cid, req.user.club_id, req.user.id, ''])
  await q('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [cid, req.user.id])
  await q('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [cid, contactId])
  res.json({ conversationId: cid })
})

/* Conversation de groupe (sujet + plusieurs membres). */
router.post('/messages/conversations/group', requireAuth, async (req, res) => {
  const { sujet, memberIds } = req.body || {}
  if (!req.user.club_id) return res.status(400).json({ error: 'Aucun club associé à votre compte.' })
  if (!Array.isArray(memberIds) || !memberIds.length) return res.status(400).json({ error: 'Aucun membre sélectionné.' })
  const cid = randomUUID()
  await q('INSERT INTO conversations (id, club_id, created_by, sujet) VALUES (?,?,?,?)',
    [cid, req.user.club_id, req.user.id, String(sujet || '').slice(0, 180)])
  const all = [req.user.id, ...memberIds.filter((m) => m !== req.user.id)]
  for (const uid of all) {
    await q('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [cid, uid])
  }
  res.json({ conversationId: cid })
})

/* Messages d'une conversation (participant uniquement). */
router.get('/messages/conversations/:id', requireAuth, async (req, res) => {
  const [part] = await q(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  )
  if (!part.length) return res.status(403).json({ error: 'Accès refusé à cette conversation.' })
  const [conv] = await q('SELECT * FROM conversations WHERE id = ?', [req.params.id])
  if (!conv.length) return res.status(404).json({ error: 'Conversation introuvable.' })

  const [messages] = await q(
    `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at, u.nom AS sender_name, u.role AS sender_role
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC`,
    [req.params.id]
  )
  /* Marquer comme lu (last_read_at = maintenant). */
  await q('UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?',
    [req.params.id, req.user.id])
  res.json({ conversation: conv[0], messages })
})

/* Envoyer un message. */
router.post('/messages/conversations/:id/messages', requireAuth, async (req, res) => {
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'Message vide.' })
  if (body.length > 4000) return res.status(400).json({ error: 'Message trop long (4000 caractères max).' })
  const [part] = await q(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  )
  if (!part.length) return res.status(403).json({ error: 'Accès refusé à cette conversation.' })
  const id = randomUUID()
  await q('INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?,?,?,?)',
    [id, req.params.id, req.user.id, body])
  await q('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id])
  /* Relais email automatique aux autres participants (silencieux si Mailjet absent). */
  try {
    const [others] = await q(
      `SELECT u.id, u.email, u.nom FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = ? AND cp.user_id != ?`,
      [req.params.id, req.user.id]
    )
    for (const o of others) {
      emailNewMessage({ email: o.email, nom: o.nom, from: req.user.nom, body }).catch(() => {})
    }
  } catch { /* relais best-effort */ }
  res.json({ ok: true, id })
})

/* Compteur global de messages non lus (badge cloche). */
router.get('/messages/unread-count', requireAuth, async (req, res) => {
  if (!req.user.club_id) return res.json({ count: 0 })
  const [rows] = await q(
    `SELECT COUNT(*) AS n FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
     JOIN conversations c ON c.id = m.conversation_id AND c.club_id = ?
     WHERE m.sender_id != ? AND m.created_at > COALESCE(cp.last_read_at, to_timestamp(0))`,
    [req.user.id, req.user.club_id, req.user.id]
  )
  res.json({ count: Number(rows[0].n) })
})

/* ============================ ADMIN (superadmin) ============================ */

router.get('/admin/overview', requireAuth, requireSuper, async (req, res) => {
  const [clubs] = await q('SELECT id, code, nom, ville, type, statut, montant_cotisation, created_at FROM clubs ORDER BY created_at DESC')
  const [users] = await q('SELECT id, email, nom, telephone, role, club_id, statut, two_fa, is_superadmin, created_at FROM users ORDER BY created_at DESC')
  const [counts] = await q('SELECT club_id, entity, COUNT(*) AS n FROM records GROUP BY club_id, entity')
  res.json({ clubs, users, counts })
})

/* État des tables relationnelles (diagnostic superadmin). */
router.get('/admin/db-stats', requireAuth, requireSuper, async (req, res) => {
  const tables = [
    'clubs', 'users', 'membres', 'ordre_passage', 'comptes_caisse',
    'cotisations', 'mouvements', 'penalites', 'epargne', 'epargne_versements',
    'groupes_epargne', 'groupe_membres', 'prets', 'pret_garants',
    'redistributions', 'redistribution_parts', 'aides',
    'seances', 'seance_presences', 'convocations', 'parrainages', 'reclamations',
    'sanctions', 'rapports', 'alertes', 'audits', 'annonces', 'notifications', 'records',
  ]
  const stats = {}
  const detail = []
  for (const t of tables) {
    try {
      const [r] = await q(`SELECT COUNT(*) AS n FROM ${t}`)
      /* pg renvoie COUNT en bigint→string ; caster pour un JSON cohérent. */
      stats[t] = Number(r[0].n)
      detail.push({ table: t, rows: Number(r[0].n) })
    } catch {
      stats[t] = null
    }
  }
  res.json({ ok: true, stats, detail })
})

/* Suspendre / réactiver un compte utilisateur (jamais un superadmin). */
router.post('/admin/users/:id/statut', requireAuth, requireSuper, async (req, res) => {
  const { statut } = req.body || {}
  if (!['Actif', 'Suspendu'].includes(statut)) return res.status(400).json({ error: 'Statut invalide.' })
  const [rows] = await q('SELECT * FROM users WHERE id = ?', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Compte introuvable.' })
  if (rows[0].is_superadmin) return res.status(400).json({ error: 'Un compte superadministrateur ne peut pas être suspendu.' })
  await q('UPDATE users SET statut = ? WHERE id = ?', [statut, req.params.id])
  res.json({ ok: true, statut })
})

/* Suspendre / réactiver une association (club). */
router.post('/admin/clubs/:id/statut', requireAuth, requireSuper, async (req, res) => {
  const { statut } = req.body || {}
  if (!['Active', 'Preparation', 'Suspendu'].includes(statut)) return res.status(400).json({ error: 'Statut invalide.' })
  const [rows] = await q('SELECT id FROM clubs WHERE id = ?', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Club introuvable.' })
  await q('UPDATE clubs SET statut = ? WHERE id = ?', [statut, req.params.id])
  res.json({ ok: true, statut })
})

/* ============================ INTÉGRATIONS ============================ */

/* État des passerelles (paiement, email, SMS, push) — affiché honnêtement dans l'app. */
router.get('/integrations', requireAuth, (req, res) => {
  res.json(integrationsStatus())
})

/* ============================ PAIEMENTS ============================ */

/* URL de notification/webhook GeniusPay — publique (signée par GeniusPay). */
router.post('/payments/geniuspay/notify', async (req, res) => {
  const result = await handleGeniuspayNotify(req.body)
  res.json(result)
})

/* Initier un paiement de cotisation. */
router.post('/payments/initiate', requireAuth, async (req, res) => {
  const { clubId, montant, methode, tel, periode, membreId } = req.body || {}
  if (!clubId || clubId !== req.user.club_id) return res.status(403).json({ error: 'Accès refusé à ce club.' })
  const amount = Number(montant)
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide.' })
  const origin = `${req.protocol}://${req.get('host')}`
  const result = await initiatePayment({
    userId: req.user.id,
    clubId,
    membreId: membreId || null,
    montant: amount,
    methode: String(methode || 'OM'),
    tel: tel || null,
    periode: String(periode || ''),
    notifyUrl: `${origin}/api/payments/geniuspay/notify`,
  })
  if (!geniuspay.configured) {
    return res.json({ ...result, notice: 'Passerelle de paiement non configurée — mode simulation : vous validerez le paiement manuellement.' })
  }
  if (!result.paymentUrl) {
    return res.status(502).json({ error: 'Impossible de joindre la passerelle de paiement. Réessayez.', ref: result.ref })
  }
  res.json(result)
})

/* Vérifier le statut d'une transaction (polling après retour du membre). */
router.get('/payments/:ref/status', requireAuth, async (req, res) => {
  const result = await checkPayment(req.params.ref)
  if (!result.found) return res.status(404).json({ error: 'Transaction introuvable.' })
  res.json({ transaction: result.transaction })
})

/* Confirmer manuellement (mode simulation uniquement). */
router.post('/payments/:ref/simulate', requireAuth, async (req, res) => {
  const [rows] = await q('SELECT provider FROM payment_transactions WHERE ref = ? AND user_id = ?', [req.params.ref, req.user.id])
  if (!rows.length) return res.status(404).json({ error: 'Transaction introuvable.' })
  if (rows[0].provider === 'cinetpay') return res.status(400).json({ error: 'Cette transaction doit être confirmée par la passerelle.' })
  const result = await simulateSuccess(req.params.ref, req.user.id)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true })
})

/* Relais de notification externe (email/SMS) pour les actions clés. */
router.post('/notify/external', requireAuth, async (req, res) => {
  const { email, tel, titre, message } = req.body || {}
  const results = await notifyExternal({ email, tel, titre, message })
  res.json({ ok: true, channels: results })
})

export default router
