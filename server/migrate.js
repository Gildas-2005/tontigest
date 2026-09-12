// TontiGest — migration records -> tables relationnelles
// Exécuté au démarrage (et via setup-db) : projette chaque ligne de `records`
// dans les tables dédiées du schéma complet. Idempotent (upserts).

import { q } from './db.js'
import { PROJECTORS, projectClub } from './relational.js'

export async function migrateRecordsToRelational() {
  // 1. Clubs : colonnes relationnelles + ordre de passage + caisse.
  const [clubs] = await q('SELECT id, payload, statut FROM clubs')
  for (const c of clubs) {
    try {
      await projectClub(c.id, c)
    } catch (e) {
      console.warn(`  ! Projection club ${c.id} : ${e.message}`)
    }
  }

  // 2. Records -> tables dédiées (upserts idempotents).
  const [rows] = await q('SELECT entity, id, club_id, user_id, payload FROM records')
  let done = 0
  const errors = []
  for (const r of rows) {
    const proj = PROJECTORS[r.entity]
    if (!proj) continue
    let payload = r.payload
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload || '{}') } catch { payload = {} }
    }
    if (!payload || typeof payload !== 'object') continue
    // L'id fait foi : la payload peut porter un id null (notifications seed).
    const full = { ...payload, id: r.id }
    if (r.user_id) full._userId = r.user_id
    try {
      await proj(r.club_id, full)
      done++
    } catch (e) {
      errors.push(`${r.entity}/${r.id}: ${e.message}`)
    }
  }
  return { projected: done, errors }
}
