import { randomUUID } from 'node:crypto'
import { q } from './db.js'
import { config } from './config.js'
import { hashPassword } from './auth.js'

/* Seed minimal : crée uniquement le compte superadministrateur.
   Aucune donnée fictive n'est insérée — tous les clubs, membres et opérations
   sont créés par les utilisateurs depuis l'application et stockés dans MySQL. */

async function ensureSuperadmin() {
  if (!config.superadmin.email || !config.superadmin.password) {
    console.log('  • Superadmin non créé : SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD absents du .env')
    return
  }
  const email = config.superadmin.email.toLowerCase()
  const [rows] = await q('SELECT id FROM users WHERE email = ?', [email])
  if (rows.length) return
  const id = randomUUID()
  await q(
    `INSERT INTO users (id, email, password_hash, nom, telephone, role, onboarding_done, is_superadmin)
     VALUES (?,?,?,?,?, 'SuperAdmin', 1, 1)`,
    [id, email, await hashPassword(config.superadmin.password), 'Super Administrateur', '']
  )
  console.log(`  • Superadmin créé : ${email}`)
}

export async function seed() {
  await ensureSuperadmin()
  console.log('  • Base prête — aucune donnée fictive insérée (les clubs sont créés depuis l\'application).')
}
