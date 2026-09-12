import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { q } from './db.js'
import {
  hashPassword, verifyPassword, signToken, publicUser,
  requireAuth, requireSuper, genCode,
} from './auth.js'
import { PROJECTORS, deleteProjected, projectClub } from './relational.js'
import { initiatePayment, checkPayment, handleGeniuspayNotify, simulateSuccess } from './payments.js'
import { sendTwoFactorCode, notifyExternal } from './notify.js'
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
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
  for (const row of rows) {
    if (!row?.id) continue
    await q(
      `INSERT INTO records (entity, id, club_id, user_id, payload) VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE club_id = VALUES(club_id), user_id = VALUES(user_id), payload = VALUES(payload)`,
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
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
  if (!ids.length) return res.json({ ok: true })
  const placeholders = ids.map(() => '?').join(',')
  await q(`DELETE FROM records WHERE entity = ? AND club_id = ? AND id IN (${placeholders})`, [entity, id, ...ids])
  try { await deleteProjected(entity, id, ids) } catch { /* best-effort */ }
  res.json({ ok: true })
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
      stats[t] = r[0].n
      detail.push({ table: t, rows: r[0].n })
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
