import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { config } from './config.js'
import { bootstrapDatabase, countUsers } from './db.js'
import { seed } from './seed.js'
import { migrateRecordsToRelational } from './migrate.js'
import apiRoutes from './routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')

async function main() {
  console.log('TontiGest — démarrage du serveur…')
  await bootstrapDatabase()
  const users = await countUsers()
  if (users === 0) {
    console.log('Base vide — initialisation des données de démonstration…')
  }
  await seed()

  // Synchroniser les tables relationnelles avec le transport records.
  console.log('Synchronisation des tables relationnelles…')
  const { projected, errors } = await migrateRecordsToRelational()
  console.log(`  • ${projected} ligne(s) projetée(s) dans le schéma relationnel`)
  if (errors.length) console.warn(`  ! ${errors.length} erreur(s) de projection : ${errors.slice(0, 3).join(' ; ')}`)

  const app = express()
  app.use(express.json({ limit: '12mb' }))
  app.use('/api', apiRoutes)

  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'tontigest' }))

  if (existsSync(distDir)) {
    app.use(express.static(distDir))
    // SPA fallback : toute route hors /api renvoie index.html
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
      res.sendFile(join(distDir, 'index.html'))
    })
  } else {
    app.use((req, res) => {
      res.status(200).send(
        '<h1>TontiGest</h1><p>Le front-end n\'est pas encore compilé. Lancez <code>npm run build</code> puis rechargez, ou utilisez <code>npm run dev</code> (Vite sur le port 5173).</p>'
      )
    })
  }

  app.listen(config.port, () => {
    console.log(`✔ Serveur TontiGest prêt sur http://localhost:${config.port}`)
    console.log(`  MySQL : ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`)
  })
}

main().catch((err) => {
  console.error('Erreur au démarrage du serveur :', err)
  process.exit(1)
})
