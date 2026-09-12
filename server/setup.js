import { bootstrapDatabase, countUsers } from './db.js'
import { seed } from './seed.js'
import { migrateRecordsToRelational } from './migrate.js'

async function run() {
  console.log('TontiGest — initialisation de la base de données…')
  await bootstrapDatabase()
  await seed()
  console.log('Projection des données dans les tables relationnelles…')
  const { projected, errors } = await migrateRecordsToRelational()
  console.log(`  • ${projected} ligne(s) projetée(s) dans le schéma relationnel`)
  if (errors.length) console.warn(`  ! ${errors.length} erreur(s) : ${errors.slice(0, 3).join(' ; ')}`)
  const n = await countUsers()
  console.log(`✔ Base prête (${n} utilisateur(s)).`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Erreur lors de l\'initialisation :', err)
  process.exit(1)
})
