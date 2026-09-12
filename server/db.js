import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { config } from './config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let pool = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4_unicode_ci',
    })
  }
  return pool
}

export const q = (sql, params = []) => getPool().query(sql, params)

// Colonnes ajoutées après la première version du schéma — appliquées
// idempotemment (ALTER silencieux si la colonne existe déjà).
const SCHEMA_MIGRATIONS = [
  "ALTER TABLE clubs ADD COLUMN montant_tour DOUBLE NOT NULL DEFAULT 0",
  "ALTER TABLE clubs ADD COLUMN frequence VARCHAR(30) NOT NULL DEFAULT 'Mensuelle'",
  "ALTER TABLE clubs ADD COLUMN penalite_retard DOUBLE NOT NULL DEFAULT 0",
  "ALTER TABLE clubs ADD COLUMN taux_pret DOUBLE NOT NULL DEFAULT 0",
  "ALTER TABLE clubs ADD COLUMN date_debut DATE NULL",
  "ALTER TABLE clubs ADD COLUMN banque VARCHAR(190) NOT NULL DEFAULT ''",
  // Suspension / activation des comptes par le superadministrateur.
  "ALTER TABLE users ADD COLUMN statut VARCHAR(30) NOT NULL DEFAULT 'Actif'",
  // Caisses complémentaires (annuelle, scolaire…) : paramètres propres à chaque caisse.
  `CREATE TABLE IF NOT EXISTS caisse_params (
     club_id     VARCHAR(36) NOT NULL,
     devise      VARCHAR(10) NOT NULL,
     compte      VARCHAR(60) NOT NULL,
     periodicite VARCHAR(30) NOT NULL DEFAULT 'Libre',
     montant_cible DOUBLE    NOT NULL DEFAULT 0,
     date_debut  DATE NULL,
     note        VARCHAR(255) NOT NULL DEFAULT '',
     PRIMARY KEY (club_id, devise, compte)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // Transactions de paiement (CinetPay ou simulation) — traçabilité complète.
  `CREATE TABLE IF NOT EXISTS payment_transactions (
     ref            VARCHAR(64) PRIMARY KEY,
     user_id        VARCHAR(36) NOT NULL,
     club_id        VARCHAR(36) NOT NULL,
     membre_id      VARCHAR(64) NULL,
     amount         DOUBLE NOT NULL,
     currency       VARCHAR(10) NOT NULL DEFAULT 'XAF',
     channel        VARCHAR(30) NOT NULL,
     phone          VARCHAR(30) NULL,
     period         VARCHAR(10) NULL,
     provider       VARCHAR(30) NOT NULL DEFAULT 'simulation',
     status         VARCHAR(20) NOT NULL DEFAULT 'pending',
     provider_meta  TEXT NULL,
     created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     INDEX idx_pay_user (user_id),
     INDEX idx_pay_club (club_id),
     INDEX idx_pay_status (status)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // --- Scalabilité : index utiles non couverts par le schéma de base ---
  "CREATE INDEX idx_records_updated ON records (updated_at)",
]

// Nettoyages à appliquer au démarrage : colonnes et tables retirées du produit.
const SCHEMA_CLEANUPS = [
  "ALTER TABLE clubs DROP COLUMN taux_enchere_min",
  "DROP TABLE IF EXISTS enchere_offres",
  "DROP TABLE IF EXISTS encheres",
]

export async function bootstrapDatabase() {
  // 1. Connexion sans base spécifique pour créer la base si absente.
  const root = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  })
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  // 2. Application du schéma (plusieurs instructions).
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  await root.query(`USE \`${config.db.database}\``)
  await root.query(schema)
  // 3. Migrations idempotentes des colonnes ajoutées (silencieuses si présentes).
  for (const sql of SCHEMA_MIGRATIONS) {
    try { await root.query(sql) } catch { /* colonne déjà présente */ }
  }
  // 4. Nettoyage des éléments retirés du produit (enchères, colonnes obsolètes).
  for (const sql of SCHEMA_CLEANUPS) {
    try { await root.query(sql) } catch { /* déjà supprimé */ }
  }
  await root.end()
  return getPool()
}

export async function countUsers() {
  const [rows] = await q('SELECT COUNT(*) AS n FROM users')
  return rows[0].n
}
