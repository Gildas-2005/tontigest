// TontiGest — projections relationnelles
// Chaque entité du transport `records` est projetée dans ses tables MySQL
// dédiées (schéma complet). Les fonctions reçoivent la payload telle
// qu'envoyée par le front et écrivent/remplacent les lignes relationnelles.

import { q } from './db.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const str = (v) => (v === null || v === undefined ? '' : String(v))
const dateOrNull = (v) => {
  if (!v) return null
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}
const dtOrNull = (v) => {
  if (!v) return null
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 19).replace('T', ' ')
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ')
}

/* ---------- membres ---------- */
// Signature uniforme (clubId, payload) ; l'userId est porté par la payload (_userId).
export async function projectMembre(clubId, p) {
  const userId = p._userId || p.user_id || null
  await q(
    `INSERT INTO membres (id, club_id, user_id, nom, telephone, email, profession, role, statut, date_adhesion)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), nom=VALUES(nom), telephone=VALUES(telephone),
       email=VALUES(email), profession=VALUES(profession), role=VALUES(role), statut=VALUES(statut),
       date_adhesion=VALUES(date_adhesion)`,
    [p.id, clubId, userId, str(p.nom), str(p.tel), str(p.email),
      str(p.profession), str(p.role || 'Membre'), str(p.statut || 'Actif'), dateOrNull(p.dateAdhesion)]
  )
  if (userId) {
    await q('UPDATE users SET club_id = ? WHERE id = ?', [clubId, userId])
  }
}

/* ---------- cotisations ---------- */
export async function projectCotisation(clubId, p) {
  await q(
    `INSERT INTO cotisations (id, club_id, membre_id, montant, devise, periode, date_paiement, methode, reference, statut)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE montant=VALUES(montant), devise=VALUES(devise), periode=VALUES(periode),
       date_paiement=VALUES(date_paiement), methode=VALUES(methode), reference=VALUES(reference), statut=VALUES(statut)`,
    [p.id, clubId, str(p.membreId), num(p.montant), str(p.devise || 'XAF'), str(p.periode),
      dateOrNull(p.date), str(p.methode), str(p.ref), str(p.statut || 'En attente')]
  )
}

/* ---------- mouvements ---------- */
export async function projectMouvement(clubId, p) {
  await q(
    `INSERT INTO mouvements (id, club_id, membre_id, type, sens, compte, montant, devise, date_mvt, note, piece)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE membre_id=VALUES(membre_id), type=VALUES(type), sens=VALUES(sens), compte=VALUES(compte),
       montant=VALUES(montant), devise=VALUES(devise), date_mvt=VALUES(date_mvt), note=VALUES(note), piece=VALUES(piece)`,
    [p.id, clubId, p.membreId ? str(p.membreId) : null, str(p.type), p.sens === 'out' ? 'out' : 'in',
      str(p.compte || 'Caisse'), num(p.montant), str(p.devise || 'XAF'), dateOrNull(p.date),
      p.note ? str(p.note).slice(0, 2000) : null, p.piece ? str(p.piece).slice(0, 2000) : null]
  )
}

/* ---------- penalites ---------- */
export async function projectPenalite(clubId, p) {
  await q(
    `INSERT INTO penalites (id, club_id, membre_id, montant, motif, date_pen, payee)
     VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE montant=VALUES(montant), motif=VALUES(motif), date_pen=VALUES(date_pen), payee=VALUES(payee)`,
    [p.id, clubId, str(p.membreId), num(p.montant), str(p.motif).slice(0, 250), dateOrNull(p.date), p.payee ? 1 : 0]
  )
}

/* ---------- epargne (+ versements) ---------- */
export async function projectEpargne(clubId, p) {
  await q(
    `INSERT INTO epargne (id, club_id, membre_id, type, solde, bloquee)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE membre_id=VALUES(membre_id), type=VALUES(type), solde=VALUES(solde), bloquee=VALUES(bloquee)`,
    [p.id, clubId, str(p.membreId), str(p.type || 'Volontaire'), num(p.solde), num(p.bloquee)]
  )
  await q('DELETE FROM epargne_versements WHERE epargne_id = ?', [p.id])
  const verses = Array.isArray(p.versements) ? p.versements : []
  for (const v of verses) {
    if (!v?.id) continue
    await q('INSERT INTO epargne_versements (id, epargne_id, montant, date_v) VALUES (?,?,?,?)',
      [v.id, p.id, num(v.montant), dateOrNull(v.date)])
  }
}

/* ---------- groupes_epargne (+ composition) ---------- */
export async function projectGroupe(clubId, p) {
  await q(
    `INSERT INTO groupes_epargne (id, club_id, nom, solde, objectif)
     VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE nom=VALUES(nom), solde=VALUES(solde), objectif=VALUES(objectif)`,
    [p.id, clubId, str(p.nom), num(p.solde), num(p.objectif)]
  )
  await q('DELETE FROM groupe_membres WHERE groupe_id = ?', [p.id])
  const ms = Array.isArray(p.membres) ? p.membres : []
  for (const mid of ms) {
    if (!mid) continue
    await q('INSERT IGNORE INTO groupe_membres (groupe_id, membre_id) VALUES (?,?)', [p.id, mid])
  }
}

/* ---------- prets (+ garants) ---------- */
export async function projectPret(clubId, p) {
  await q(
    `INSERT INTO prets (id, club_id, membre_id, montant, taux, interet, reste, statut, motif, date_demande)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE montant=VALUES(montant), taux=VALUES(taux), interet=VALUES(interet), reste=VALUES(reste),
       statut=VALUES(statut), motif=VALUES(motif), date_demande=VALUES(date_demande)`,
    [p.id, clubId, str(p.membreId), num(p.montant), num(p.taux), num(p.interet), num(p.reste),
      str(p.statut || 'En attente'), str(p.motif).slice(0, 250), dateOrNull(p.dateDemande)]
  )
  await q('DELETE FROM pret_garants WHERE pret_id = ?', [p.id])
  const gs = Array.isArray(p.garants) ? p.garants : []
  for (const gid of gs) {
    if (!gid) continue
    await q('INSERT IGNORE INTO pret_garants (pret_id, garant_id) VALUES (?,?)', [p.id, gid])
  }
}

/* ---------- redistributions (+ parts) ---------- */
export async function projectRedistribution(clubId, p) {
  await q(
    `INSERT INTO redistributions (id, club_id, total, date_red) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE total=VALUES(total), date_red=VALUES(date_red)`,
    [p.id, clubId, num(p.total), dateOrNull(p.date)]
  )
  await q('DELETE FROM redistribution_parts WHERE redistribution_id = ?', [p.id])
  const parts = Array.isArray(p.parts) ? p.parts : []
  for (const part of parts) {
    if (!part?.membreId) continue
    await q('INSERT IGNORE INTO redistribution_parts (redistribution_id, membre_id, montant) VALUES (?,?,?)',
      [p.id, part.membreId, num(part.montant)])
  }
}

/* ---------- aides ---------- */
export async function projectAide(clubId, p) {
  await q(
    `INSERT INTO aides (id, club_id, membre_id, type, montant, statut, motif, date_aide)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE type=VALUES(type), montant=VALUES(montant), statut=VALUES(statut),
       motif=VALUES(motif), date_aide=VALUES(date_aide)`,
    [p.id, clubId, str(p.membreId), str(p.type), num(p.montant), str(p.statut || 'En attente'),
      str(p.motif).slice(0, 250), dateOrNull(p.date)]
  )
}

/* ---------- seances (+ presences) ---------- */
export async function projectSeance(clubId, p) {
  await q(
    `INSERT INTO seances (id, club_id, titre, date_s, lieu, statut, pv) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE titre=VALUES(titre), date_s=VALUES(date_s), lieu=VALUES(lieu),
       statut=VALUES(statut), pv=VALUES(pv)`,
    [p.id, clubId, str(p.titre), dateOrNull(p.date), str(p.lieu), str(p.statut || 'Planifiée'),
      p.pv ? str(p.pv).slice(0, 4000) : null]
  )
  await q('DELETE FROM seance_presences WHERE seance_id = ?', [p.id])
  const pres = p.presences || {}
  for (const [mid, present] of Object.entries(pres)) {
    if (!mid) continue
    await q('INSERT IGNORE INTO seance_presences (seance_id, membre_id, present) VALUES (?,?,?)',
      [p.id, mid, present ? 1 : 0])
  }
}

/* ---------- convocations ---------- */
export async function projectConvocation(clubId, p) {
  await q(
    `INSERT INTO convocations (id, club_id, seance_id, canal, message, envoyees, date_c) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE seance_id=VALUES(seance_id), canal=VALUES(canal), message=VALUES(message),
       envoyees=VALUES(envoyees), date_c=VALUES(date_c)`,
    [p.id, clubId, p.seanceId ? str(p.seanceId) : null, str(p.canal), p.message ? str(p.message).slice(0, 2000) : null,
      Math.trunc(num(p.envoyees)), dtOrNull(p.date)]
  )
}

/* ---------- parrainages ---------- */
export async function projectParrainage(clubId, p) {
  await q(
    `INSERT INTO parrainages (id, club_id, membre_id, parrain_id, date_p) VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE parrain_id=VALUES(parrain_id), date_p=VALUES(date_p)`,
    [p.id, clubId, str(p.membreId), str(p.parrainId), dateOrNull(p.date)]
  )
}

/* ---------- reclamations ---------- */
export async function projectReclamation(clubId, p) {
  await q(
    `INSERT INTO reclamations (id, club_id, membre_id, sujet, detail, statut, reponse, date_r) VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE sujet=VALUES(sujet), detail=VALUES(detail), statut=VALUES(statut),
       reponse=VALUES(reponse), date_r=VALUES(date_r)`,
    [p.id, clubId, str(p.membreId), str(p.sujet).slice(0, 180), p.detail ? str(p.detail).slice(0, 2000) : null,
      str(p.statut || 'Ouverte'), p.reponse ? str(p.reponse).slice(0, 2000) : null, dateOrNull(p.date)]
  )
}

/* ---------- sanctions ---------- */
export async function projectSanction(clubId, p) {
  await q(
    `INSERT INTO sanctions (id, club_id, membre_id, type, motif, date_s) VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE type=VALUES(type), motif=VALUES(motif), date_s=VALUES(date_s)`,
    [p.id, clubId, str(p.membreId), str(p.type), str(p.motif).slice(0, 250), dateOrNull(p.date)]
  )
}

/* ---------- rapports ---------- */
export async function projectRapport(clubId, p) {
  await q(
    `INSERT INTO rapports (id, club_id, periode, type, statut, auteur, resume, date_r) VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE periode=VALUES(periode), type=VALUES(type), statut=VALUES(statut),
       auteur=VALUES(auteur), resume=VALUES(resume), date_r=VALUES(date_r)`,
    [p.id, clubId, str(p.periode), str(p.type), str(p.statut || 'Soumis'), str(p.auteur),
      p.resume ? str(p.resume).slice(0, 2000) : null, dateOrNull(p.date)]
  )
}

/* ---------- alertes ---------- */
export async function projectAlerte(clubId, p) {
  await q(
    `INSERT INTO alertes (id, club_id, auteur, type, message, statut, date_a) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE auteur=VALUES(auteur), type=VALUES(type), message=VALUES(message),
       statut=VALUES(statut), date_a=VALUES(date_a)`,
    [p.id, clubId, str(p.de || p.auteur), str(p.type), p.message ? str(p.message).slice(0, 2000) : null,
      str(p.statut || 'Ouverte'), dateOrNull(p.date)]
  )
}

/* ---------- audits ---------- */
export async function projectAudit(clubId, p) {
  await q(
    `INSERT INTO audits (id, club_id, cible, verdict, note, auditeur, date_au) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE cible=VALUES(cible), verdict=VALUES(verdict), note=VALUES(note),
       auditeur=VALUES(auditeur), date_au=VALUES(date_au)`,
    [p.id, clubId, str(p.cible), str(p.verdict), p.note ? str(p.note).slice(0, 2000) : null,
      str(p.par || p.auditeur), dateOrNull(p.date)]
  )
}

/* ---------- annonces ---------- */
export async function projectAnnonce(clubId, p) {
  await q(
    `INSERT INTO annonces (id, club_id, message, canal, cible, date_n) VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE message=VALUES(message), canal=VALUES(canal), cible=VALUES(cible), date_n=VALUES(date_n)`,
    [p.id, clubId, p.message ? str(p.message).slice(0, 2000) : null, str(p.canal), str(p.cible), dateOrNull(p.date)]
  )
}

/* ---------- notifications ---------- */
export async function projectNotification(clubId, p) {
  await q(
    `INSERT INTO notifications (id, club_id, membre_id, titre, message, lu, date_n) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE titre=VALUES(titre), message=VALUES(message), lu=VALUES(lu), date_n=VALUES(date_n)`,
    [p.id, clubId, str(p.pour), str(p.titre).slice(0, 180), p.message ? str(p.message).slice(0, 2000) : null,
      p.lu ? 1 : 0, dtOrNull(p.date)]
  )
}

/* ---------- club (colonnes relationnelles depuis la payload) ---------- */
export async function projectClub(clubId, row) {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload || '{}') : (row.payload || {})
  await q(
    `UPDATE clubs SET montant_cotisation = ?, montant_tour = ?, frequence = ?, penalite_retard = ?,
       taux_pret = ?, date_debut = ?, banque = ?, statut = ?
     WHERE id = ?`,
    [num(payload.montantCotisation ?? row.montant_cotisation), num(payload.montantTour),
      str(payload.frequence || 'Mensuelle'), num(payload.penaliteRetard), num(payload.tauxPret),
      dateOrNull(payload.dateDebut), str(payload.banque || ''),
      str(payload.statut || row.statut || 'Preparation'), clubId]
  )
  // Ordre de passage + caisse
  await q('DELETE FROM ordre_passage WHERE club_id = ?', [clubId])
  const ordre = Array.isArray(payload.ordrePassage) ? payload.ordrePassage : []
  for (let i = 0; i < ordre.length; i++) {
    if (!ordre[i]) continue
    await q('INSERT INTO ordre_passage (club_id, position, membre_id) VALUES (?,?,?)', [clubId, i + 1, ordre[i]])
  }
  await q('DELETE FROM comptes_caisse WHERE club_id = ?', [clubId])
  const caisse = payload.caisse || {}
  for (const [devise, comptes] of Object.entries(caisse)) {
    if (!comptes || typeof comptes !== 'object') continue
    for (const [compte, solde] of Object.entries(comptes)) {
      await q('INSERT INTO comptes_caisse (club_id, devise, compte, solde) VALUES (?,?,?,?)',
        [clubId, devise, compte, num(solde)])
    }
  }
  // Paramètres des caisses complémentaires (périodicité, objectif, date de début, note)
  await q('DELETE FROM caisse_params WHERE club_id = ?', [clubId])
  const caisseMeta = (payload.tontine && payload.tontine.caisseMeta) || {}
  for (const [key, meta] of Object.entries(caisseMeta)) {
    if (!meta || typeof meta !== 'object') continue
    const [devise, ...rest] = key.split(':')
    const compte = rest.join(':')
    if (!devise || !compte) continue
    await q(
      'INSERT INTO caisse_params (club_id, devise, compte, periodicite, montant_cible, date_debut, note) VALUES (?,?,?,?,?,?,?)',
      [clubId, devise, compte, meta.periodicite || 'Libre', num(meta.cible), meta.dateDebut || null, meta.note || null]
    )
  }
}

/* ============================ Répartition ============================ */

export const PROJECTORS = {
  members: projectMembre,
  cotisations: projectCotisation,
  mouvements: projectMouvement,
  penalites: projectPenalite,
  epargne: projectEpargne,
  groupes_epargne: projectGroupe,
  prets: projectPret,
  redistributions: projectRedistribution,
  aides: projectAide,
  seances: projectSeance,
  convocations: projectConvocation,
  parrainages: projectParrainage,
  reclamations: projectReclamation,
  sanctions: projectSanction,
  rapports: projectRapport,
  alertes: projectAlerte,
  audits: projectAudit,
  annonces: projectAnnonce,
  notifications: projectNotification,
}

/* Suppression en cascade dans les tables relationnelles. */
export async function deleteProjected(entity, clubId, ids) {
  const childTables = {
    epargne: ['epargne_versements'], // handled below via FK-less delete
    groupes_epargne: ['groupe_membres'],
    prets: ['pret_garants'],
    redistributions: ['redistribution_parts'],
    seances: ['seance_presences'],
  }
  if (!ids.length) return
  const ph = ids.map(() => '?').join(',')
  const mainTable = {
    members: 'membres', cotisations: 'cotisations', mouvements: 'mouvements', penalites: 'penalites',
    epargne: 'epargne', groupes_epargne: 'groupes_epargne', prets: 'prets', redistributions: 'redistributions',
    aides: 'aides', seances: 'seances', convocations: 'convocations',
    parrainages: 'parrainages', reclamations: 'reclamations', sanctions: 'sanctions', rapports: 'rapports',
    alertes: 'alertes', audits: 'audits', annonces: 'annonces', notifications: 'notifications',
  }[entity]
  if (!mainTable) return
  if (childTables[entity]) {
    const col = { epargne: 'epargne_id', groupes_epargne: 'groupe_id', prets: 'pret_id', redistributions: 'redistribution_id', seances: 'seance_id' }[entity]
    await q(`DELETE FROM ${childTables[entity]} WHERE ${col} IN (${ph})`, ids)
  }
  await q(`DELETE FROM ${mainTable} WHERE club_id = ? AND id IN (${ph})`, [clubId, ...ids])
}
