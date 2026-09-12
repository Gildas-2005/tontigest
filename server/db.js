/* Base de données — polyglotte MySQL (dev local) / PostgreSQL (production Render).
   Le client est choisi via DB_CLIENT (mysql | pg). Le wrapper q() garde la
   syntaxe ?-placeholders dans tout le code ; pour Postgres il convertit
   automatiquement ? en $1, $2… et traduit les backticks en double quotes.

   Bootstrap : bootstrapDatabase() crée la base si absente puis applique le
   schéma (statement par statement, compatible deux moteurs) + migrations
   idempotentes. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { config } from './config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* ============================ SÉLECTION DU CLIENT ============================ */
const usePg = config.db.client === 'pg'

let q, pool, rawPool

if (usePg) {
  const pg = await import('pg')
  const poolOpts = config.db.url
    ? { connectionString: config.db.url, max: 10, idleTimeoutMillis: 30000 }
    : {
        host: config.db.host, port: config.db.port,
        user: config.db.user, password: config.db.password,
        database: config.db.name, max: 10, idleTimeoutMillis: 30000,
      }
  /* Render Postgres impose TLS ; le plan free n'a pas de certificat complet. */
  if (config.db.ssl || /render|amazonaws|neon|supabase/i.test(config.db.url || config.db.host || '')) {
    poolOpts.ssl = { rejectUnauthorized: false }
  }
  rawPool = new pg.Pool(poolOpts)

  /* Convertit ? en $1..$n et ` en " hors chaînes littérales. */
  const toPg = (sql) => {
    let out = ''
    let i = 1
    let inS = false, inD = false
    for (let k = 0; k < sql.length; k++) {
      const c = sql[k]
      if (c === "'" && !inD) { inS = !inS; out += c; continue }
      if (c === '"' && !inS) { inD = !inD; out += c; continue }
      if (c === '`' && !inS && !inD) { out += '"'; continue }
      if (c === '?' && !inS && !inD) { out += `$${i++}`; continue }
      out += c
    }
    return out
  }

  /* q(sql, params) — même contrat que mysql2 : [rows, fields]. */
  q = async (sql, params = []) => {
    const res = await rawPool.query(toPg(sql), params)
    return [res.rows, res.fields ?? []]
  }
  pool = {
    query: async (sql, params = []) => (await rawPool.query(toPg(sql), params)).rows,
    end: () => rawPool.end(),
  }
} else {
  const mysql = await import('mysql2/promise')
  const needsSsl = () => !['localhost', '127.0.0.1', '::1'].includes(config.db.host)
  rawPool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4_unicode_ci',
    ssl: needsSsl() ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  })
  q = (sql, params = []) => rawPool.query(sql, params)
  pool = rawPool
}

export { q, pool, rawPool }
export const dbClient = usePg ? 'pg' : 'mysql'

/* ============================ HELPERS UPSERT PORTABLES ============================ */
/* - MySQL    : INSERT ... ON DUPLICATE KEY UPDATE col=VALUES(col)
   - Postgres : INSERT ... ON CONFLICT (key) DO UPDATE SET col=EXCLUDED.col */
export function upsertSql({ table, cols, key = 'id', updateCols = null }) {
  const keyArr = Array.isArray(key) ? key : [key]
  const upd = (updateCols ?? cols.filter(c => !keyArr.includes(c)))
  const placeholders = cols.map(() => '?').join(',')
  if (usePg) {
    const sets = upd.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')
    return `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})
      ON CONFLICT (${keyArr.join(',')}) DO UPDATE SET ${sets || `"${keyArr[0]}" = EXCLUDED."${keyArr[0]}"`}`
  }
  const sets = upd.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ')
  return `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${sets || `\`${keyArr[0]}\` = \`${keyArr[0]}\`}`}`
}

/* INSERT IGNORE portable : Postgres → ON CONFLICT DO NOTHING. */
export function insertIgnoreSql({ table, cols, key = 'id' }) {
  const keyArr = Array.isArray(key) ? key : [key]
  const placeholders = cols.map(() => '?').join(',')
  if (usePg) {
    return `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})
      ON CONFLICT (${keyArr.join(',')}) DO NOTHING`
  }
  return `INSERT IGNORE INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES (${placeholders})`
}

/* Placeholders IN (?, ?, …). */
export const inPlaceholders = (ids) => ids.map(() => '?').join(',')

/* ============================ SCHÉMA & MIGRATIONS ============================ */
/* Migrations idempotentes : chaque statement peut échouer silencieusement
   si déjà appliqué (colonne existante). Compatible MySQL & Postgres :
   les types tiennent aux deux (TINYINT(1) → BOOLEAN géré ci-dessous). */

const SCHEMA_MIGRATIONS = [
  "ALTER TABLE clubs ADD COLUMN montant_tour DOUBLE PRECISION NOT NULL DEFAULT 0",
  "ALTER TABLE clubs ADD COLUMN frequence VARCHAR(30) NOT NULL DEFAULT 'Mensuelle'",
  "ALTER TABLE clubs ADD COLUMN penalite_retard DOUBLE PRECISION NOT NULL DEFAULT 0",
  "ALTER TABLE clubs ADD COLUMN taux_pret DOUBLE PRECISION NOT NULL DEFAULT 0",
  "ALTER TABLE clubs ADD COLUMN date_debut DATE NULL",
  "ALTER TABLE clubs ADD COLUMN banque VARCHAR(190) NOT NULL DEFAULT ''",
  // Transport JSON des clubs (source de vérité, projetée dans les colonnes ci-dessus).
  usePg
    ? "ALTER TABLE clubs ADD COLUMN payload TEXT NULL"
    : "ALTER TABLE clubs ADD COLUMN payload LONGTEXT NULL",
  // Suspension / activation des comptes par le superadministrateur.
  "ALTER TABLE users ADD COLUMN statut VARCHAR(30) NOT NULL DEFAULT 'Actif'",
]

/* Tables créées en plus du schéma de base. */
const EXTRA_TABLES = [
  `CREATE TABLE IF NOT EXISTS caisse_params (
     club_id     VARCHAR(36) NOT NULL,
     devise      VARCHAR(10) NOT NULL,
     compte      VARCHAR(60) NOT NULL,
     periodicite VARCHAR(30) NOT NULL DEFAULT 'Libre',
     montant_cible DOUBLE PRECISION NOT NULL DEFAULT 0,
     date_debut  DATE NULL,
     note        VARCHAR(255) NOT NULL DEFAULT '',
     PRIMARY KEY (club_id, devise, compte)
   )`,
  `CREATE TABLE IF NOT EXISTS payment_transactions (
     ref            VARCHAR(64) PRIMARY KEY,
     user_id        VARCHAR(36) NOT NULL,
     club_id        VARCHAR(36) NOT NULL,
     membre_id      VARCHAR(64) NULL,
     amount         DOUBLE PRECISION NOT NULL,
     currency       VARCHAR(10) NOT NULL DEFAULT 'XAF',
     channel        VARCHAR(30) NOT NULL,
     phone          VARCHAR(30) NULL,
     period         VARCHAR(10) NULL,
     provider       VARCHAR(30) NOT NULL DEFAULT 'simulation',
     status         VARCHAR(20) NOT NULL DEFAULT 'pending',
     provider_meta  TEXT NULL,
     created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS idx_pay_user ON payment_transactions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pay_club ON payment_transactions (club_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pay_status ON payment_transactions (status)`,
  /* Messagerie interne : conversations et messages entre membres. */
  `CREATE TABLE IF NOT EXISTS conversations (
     id         VARCHAR(64) PRIMARY KEY,
     club_id    VARCHAR(36) NOT NULL,
     created_by VARCHAR(36) NULL,
     sujet      VARCHAR(190) NOT NULL DEFAULT '',
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS conversation_participants (
     conversation_id VARCHAR(64) NOT NULL,
     user_id         VARCHAR(36) NOT NULL,
     last_read_at    TIMESTAMP NULL,
     PRIMARY KEY (conversation_id, user_id)
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id              VARCHAR(64) PRIMARY KEY,
     conversation_id VARCHAR(64) NOT NULL,
     sender_id       VARCHAR(36) NOT NULL,
     body            TEXT NOT NULL,
     created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages (conversation_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_part_user ON conversation_participants (user_id)`,
]

/* Nettoyages à appliquer au démarrage : éléments retirés du produit. */
const SCHEMA_CLEANUPS = usePg ? [] : [
  "ALTER TABLE clubs DROP COLUMN taux_enchere_min",
  "DROP TABLE IF EXISTS enchere_offres",
  "DROP TABLE IF EXISTS encheres",
]

/* Découpe un fichier SQL en statements exécutables : séparés par ; hors
   chaînes littérales, en ignorant les commentaires de ligne et de bloc. */
function splitStatements(sqlText) {
  const out = []
  let cur = ''
  let inS = false, inLC = false, inBC = false
  for (let i = 0; i < sqlText.length; i++) {
    const c = sqlText[i]
    const next = sqlText[i + 1] ?? ''
    if (inLC) { if (c === '\n') { inLC = false; cur += c } continue }
    if (inBC) { if (c === '*' && next === '/') { inBC = false; i++ } continue }
    if (!inS && c === '-' && next === '-') { inLC = true; continue }
    if (!inS && c === '/' && next === '*') { inBC = true; i++; continue }
    if (c === "'") { inS = !inS; cur += c; continue }
    if (c === ';' && !inS) { const s = cur.trim(); if (s) out.push(s); cur = ''; continue }
    cur += c
  }
  const tail = cur.trim()
  if (tail) out.push(tail)
  return out
}

/* Exécute une liste de statements DDL, silencieux si déjà présents
   (MySQL n'a pas IF NOT EXISTS pour les index ; le try/catch rend
   l'application idempotente sur les deux moteurs). */
async function runDdl(statements) {
  for (const sql of statements) {
    try { await q(sql) } catch { /* déjà appliqué */ }
  }
}

export async function bootstrapDatabase() {
  if (usePg) {
    /* Postgres : la base est déjà créée par l'hébergeur (Render) — on applique
       le schéma dans le schéma public, statement par statement. */
    const schemaFile = join(__dirname, 'schema.pg.sql')
    const ddl = splitStatements(readFileSync(schemaFile, 'utf8'))
    await runDdl(ddl)
  } else {
    /* MySQL : créer la base si absente puis appliquer le schéma. */
    const mysql = await import('mysql2/promise')
    const root = await mysql.createConnection({
      host: config.db.host, port: config.db.port,
      user: config.db.user, password: config.db.password,
      multipleStatements: true,
      ssl: !['localhost', '127.0.0.1', '::1'].includes(config.db.host)
        ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    })
    await root.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
    await root.query(`USE \`${config.db.name}\``)
    await root.query(schema)
    await root.end()
  }
  /* Migrations + tables supplémentaires communes. */
  await runDdl(SCHEMA_MIGRATIONS)
  await runDdl(EXTRA_TABLES)
  await runDdl(SCHEMA_CLEANUPS)

  /* Filet de sécurité : vérifier que toutes les tables attendues existent.
     Un DDL invalide avalé par le try/catch ci-dessus serait sinon détecté
     seulement via un 500 en pleine utilisation (ex. caisse_params manquante). */
  const expected = [
    'users', 'clubs', 'membres', 'ordre_passage', 'comptes_caisse', 'cotisations',
    'mouvements', 'penalites', 'epargne', 'epargne_versements', 'groupes_epargne',
    'groupe_membres', 'prets', 'pret_garants', 'redistributions', 'redistribution_parts',
    'aides', 'seances', 'seance_presences', 'convocations', 'parrainages', 'reclamations',
    'sanctions', 'rapports', 'alertes', 'audits', 'annonces', 'notifications',
    'records', 'caisse_params', 'payment_transactions',
    'conversations', 'conversation_participants', 'messages',
  ]
  const [tbl] = usePg
    ? await q("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    : await q('SHOW TABLES')
  const present = new Set(tbl.map((r) => Object.values(r)[0]))
  const missing = expected.filter((t) => !present.has(t))
  if (missing.length) {
    throw new Error(`Bootstrap DB : tables manquantes après application du schéma : ${missing.join(', ')}`)
  }
}

export async function countUsers() {
  const [rows] = await q('SELECT COUNT(*) AS n FROM users')
  return Number(rows[0].n)
}

export default q
