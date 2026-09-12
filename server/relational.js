// TontiGest — projections relationnelles
// Chaque entité du transport `records` est projetée dans ses tables dédiées
// (schéma complet). Les fonctions reçoivent la payload telle qu'envoyée
// par le front et écrivent/remplacent les lignes relationnelles.
// Les upserts passent par les helpers polyglottes de db.js
// (MySQL : ON DUPLICATE KEY UPDATE — PostgreSQL : ON CONFLICT DO UPDATE).

import { q, upsertSql, insertIgnoreSql } from './db.js'

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
    upsertSql({
      table: 'membres',
      cols: ['id', 'club_id', 'user_id', 'nom', 'telephone', 'email', 'profession', 'role', 'statut', 'date_adhesion'],
      key: 'id',
      updateCols: ['user_id', 'nom', 'telephone', 'email', 'profession', 'role', 'statut', 'date_adhesion'],
    }),
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
    upsertSql({
      table: 'cotisations',
      cols: ['id', 'club_id', 'membre_id', 'montant', 'devise', 'periode', 'date_paiement', 'methode', 'reference', 'statut'],
      key: 'id',
      updateCols: ['montant', 'devise', 'periode', 'date_paiement', 'methode', 'reference', 'statut'],
    }),
    [p.id, clubId, str(p.membreId), num(p.montant), str(p.devise || 'XAF'), str(p.periode),
      dateOrNull(p.date), str(p.methode), str(p.ref), str(p.statut || 'En attente')]
  )
}

/* ---------- mouvements ---------- */
export async function projectMouvement(clubId, p) {
  await q(
    upsertSql({
      table: 'mouvements',
      cols: ['id', 'club_id', 'membre_id', 'type', 'sens', 'compte', 'montant', 'devise', 'date_mvt', 'note', 'piece'],
      key: 'id',
      updateCols: ['membre_id', 'type', 'sens', 'compte', 'montant', 'devise', 'date_mvt', 'note', 'piece'],
    }),
    [p.id, clubId, p.membreId ? str(p.membreId) : null, str(p.type), p.sens === 'out' ? 'out' : 'in',
      str(p.compte || 'Caisse'), num(p.montant), str(p.devise || 'XAF'), dateOrNull(p.date),
      p.note ? str(p.note).slice(0, 2000) : null, p.piece ? str(p.piece).slice(0, 2000) : null]
  )
}

/* ---------- penalites ---------- */
export async function projectPenalite(clubId, p) {
  await q(
    upsertSql({
      table: 'penalites',
      cols: ['id', 'club_id', 'membre_id', 'montant', 'motif', 'date_pen', 'payee'],
      key: 'id',
      updateCols: ['montant', 'motif', 'date_pen', 'payee'],
    }),
    [p.id, clubId, str(p.membreId), num(p.montant), str(p.motif).slice(0, 250), dateOrNull(p.date), p.payee ? 1 : 0]
  )
}

/* ---------- epargne (+ versements) ---------- */
export async function projectEpargne(clubId, p) {
  await q(
    upsertSql({
      table: 'epargne',
      cols: ['id', 'club_id', 'membre_id', 'type', 'solde', 'bloquee'],
      key: 'id',
      updateCols: ['membre_id', 'type', 'solde', 'bloquee'],
    }),
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
    upsertSql({
      table: 'groupes_epargne',
      cols: ['id', 'club_id', 'nom', 'solde', 'objectif'],
      key: 'id',
      updateCols: ['nom', 'solde', 'objectif'],
    }),
    [p.id, clubId, str(p.nom), num(p.solde), num(p.objectif)]
  )
  await q('DELETE FROM groupe_membres WHERE groupe_id = ?', [p.id])
  const ms = Array.isArray(p.membres) ? p.membres : []
  for (const mid of ms) {
    if (!mid) continue
    await q(
      insertIgnoreSql({ table: 'groupe_membres', cols: ['groupe_id', 'membre_id'], key: ['groupe_id', 'membre_id'] }),
      [p.id, mid]
    )
  }
}

/* ---------- prets (+ garants) ---------- */
export async function projectPret(clubId, p) {
  await q(
    upsertSql({
      table: 'prets',
      cols: ['id', 'club_id', 'membre_id', 'montant', 'taux', 'interet', 'reste', 'statut', 'motif', 'date_demande'],
      key: 'id',
      updateCols: ['montant', 'taux', 'interet', 'reste', 'statut', 'motif', 'date_demande'],
    }),
    [p.id, clubId, str(p.membreId), num(p.montant), num(p.taux), num(p.interet), num(p.reste),
      str(p.statut || 'En attente'), str(p.motif).slice(0, 250), dateOrNull(p.dateDemande)]
  )
  await q('DELETE FROM pret_garants WHERE pret_id = ?', [p.id])
  const gs = Array.isArray(p.garants) ? p.garants : []
  for (const gid of gs) {
    if (!gid) continue
    await q(
      insertIgnoreSql({ table: 'pret_garants', cols: ['pret_id', 'garant_id'], key: ['pret_id', 'garant_id'] }),
      [p.id, gid]
    )
  }
}

/* ---------- redistributions (+ parts) ---------- */
export async function projectRedistribution(clubId, p) {
  await q(
    upsertSql({
      table: 'redistributions',
      cols: ['id', 'club_id', 'total', 'date_red'],
      key: 'id',
      updateCols: ['total', 'date_red'],
    }),
    [p.id, clubId, num(p.total), dateOrNull(p.date)]
  )
  await q('DELETE FROM redistribution_parts WHERE redistribution_id = ?', [p.id])
  const parts = Array.isArray(p.parts) ? p.parts : []
  for (const part of parts) {
    if (!part?.membreId) continue
    await q(
      insertIgnoreSql({ table: 'redistribution_parts', cols: ['redistribution_id', 'membre_id', 'montant'], key: ['redistribution_id', 'membre_id'] }),
      [p.id, part.membreId, num(part.montant)]
    )
  }
}

/* ---------- aides ---------- */
export async function projectAide(clubId, p) {
  await q(
    upsertSql({
      table: 'aides',
      cols: ['id', 'club_id', 'membre_id', 'type', 'montant', 'statut', 'motif', 'date_aide'],
      key: 'id',
      updateCols: ['type', 'montant', 'statut', 'motif', 'date_aide'],
    }),
    [p.id, clubId, str(p.membreId), str(p.type), num(p.montant), str(p.statut || 'En attente'),
      str(p.motif).slice(0, 250), dateOrNull(p.date)]
  )
}

/* ---------- seances (+ presences) ---------- */
export async function projectSeance(clubId, p) {
  await q(
    upsertSql({
      table: 'seances',
      cols: ['id', 'club_id', 'titre', 'date_s', 'lieu', 'statut', 'pv'],
      key: 'id',
      updateCols: ['titre', 'date_s', 'lieu', 'statut', 'pv'],
    }),
    [p.id, clubId, str(p.titre), dateOrNull(p.date), str(p.lieu), str(p.statut || 'Planifiée'),
      p.pv ? str(p.pv).slice(0, 4000) : null]
  )
  await q('DELETE FROM seance_presences WHERE seance_id = ?', [p.id])
  const pres = p.presences || {}
  for (const [mid, present] of Object.entries(pres)) {
    if (!mid) continue
    await q(
      insertIgnoreSql({ table: 'seance_presences', cols: ['seance_id', 'membre_id', 'present'], key: ['seance_id', 'membre_id'] }),
      [p.id, mid, present ? 1 : 0]
    )
  }
}

/* ---------- convocations ---------- */
export async function projectConvocation(clubId, p) {
  await q(
    upsertSql({
      table: 'convocations',
      cols: ['id', 'club_id', 'seance_id', 'canal', 'message', 'envoyees', 'date_c'],
      key: 'id',
      updateCols: ['seance_id', 'canal', 'message', 'envoyees', 'date_c'],
    }),
    [p.id, clubId, p.seanceId ? str(p.seanceId) : null, str(p.canal), p.message ? str(p.message).slice(0, 2000) : null,
      Math.trunc(num(p.envoyees)), dtOrNull(p.date)]
  )
}

/* ---------- parrainages ---------- */
export async function projectParrainage(clubId, p) {
  await q(
    upsertSql({
      table: 'parrainages',
      cols: ['id', 'club_id', 'membre_id', 'parrain_id', 'date_p'],
      key: 'id',
      updateCols: ['parrain_id', 'date_p'],
    }),
    [p.id, clubId, str(p.membreId), str(p.parrainId), dateOrNull(p.date)]
  )
}

/* ---------- reclamations ---------- */
export async function projectReclamation(clubId, p) {
  await q(
    upsertSql({
      table: 'reclamations',
      cols: ['id', 'club_id', 'membre_id', 'sujet', 'detail', 'statut', 'reponse', 'date_r'],
      key: 'id',
      updateCols: ['sujet', 'detail', 'statut', 'reponse', 'date_r'],
    }),
    [p.id, clubId, str(p.membreId), str(p.sujet).slice(0, 180), p.detail ? str(p.detail).slice(0, 2000) : null,
      str(p.statut || 'Ouverte'), p.reponse ? str(p.reponse).slice(0, 2000) : null, dateOrNull(p.date)]
  )
}

/* ---------- sanctions ---------- */
export async function projectSanction(clubId, p) {
  await q(
    upsertSql({
      table: 'sanctions',
      cols: ['id', 'club_id', 'membre_id', 'type', 'motif', 'date_s'],
      key: 'id',
      updateCols: ['type', 'motif', 'date_s'],
    }),
    [p.id, clubId, str(p.membreId), str(p.type), str(p.motif).slice(0, 250), dateOrNull(p.date)]
  )
}

/* ---------- rapports ---------- */
export async function projectRapport(clubId, p) {
  await q(
    upsertSql({
      table: 'rapports',
      cols: ['id', 'club_id', 'periode', 'type', 'statut', 'auteur', 'resume', 'date_r'],
      key: 'id',
      updateCols: ['periode', 'type', 'statut', 'auteur', 'resume', 'date_r'],
    }),
    [p.id, clubId, str(p.periode), str(p.type), str(p.statut || 'Soumis'), str(p.auteur),
      p.resume ? str(p.resume).slice(0, 2000) : null, dateOrNull(p.date)]
  )
}

/* ---------- alertes ---------- */
export async function projectAlerte(clubId, p) {
  await q(
    upsertSql({
      table: 'alertes',
      cols: ['id', 'club_id', 'auteur', 'type', 'message', 'statut', 'date_a'],
      key: 'id',
      updateCols: ['auteur', 'type', 'message', 'statut', 'date_a'],
    }),
    [p.id, clubId, str(p.de || p.auteur), str(p.type), p.message ? str(p.message).slice(0, 2000) : null,
      str(p.statut || 'Ouverte'), dateOrNull(p.date)]
  )
}

/* ---------- audits ---------- */
export async function projectAudit(clubId, p) {
  await q(
    upsertSql({
      table: 'audits',
      cols: ['id', 'club_id', 'cible', 'verdict', 'note', 'auditeur', 'date_au'],
      key: 'id',
      updateCols: ['cible', 'verdict', 'note', 'auditeur', 'date_au'],
    }),
    [p.id, clubId, str(p.cible), str(p.verdict), p.note ? str(p.note).slice(0, 2000) : null,
      str(p.par || p.auditeur), dateOrNull(p.date)]
  )
}

/* ---------- annonces ---------- */
export async function projectAnnonce(clubId, p) {
  await q(
    upsertSql({
      table: 'annonces',
      cols: ['id', 'club_id', 'message', 'canal', 'cible', 'date_n'],
      key: 'id',
      updateCols: ['message', 'canal', 'cible', 'date_n'],
    }),
    [p.id, clubId, p.message ? str(p.message).slice(0, 2000) : null, str(p.canal), str(p.cible), dateOrNull(p.date)]
  )
}

/* ---------- notifications ---------- */
export async function projectNotification(clubId, p) {
  await q(
    upsertSql({
      table: 'notifications',
      cols: ['id', 'club_id', 'membre_id', 'titre', 'message', 'lu', 'date_n'],
      key: 'id',
      updateCols: ['titre', 'message', 'lu', 'date_n'],
    }),
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
