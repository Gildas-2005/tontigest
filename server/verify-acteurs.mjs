/* Vérifie que chaque compte acteur se connecte et accède au club avec le bon rôle.
   Identifiants superadmin lus depuis .env (SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (fs.existsSync(path.join(root, '.env'))) {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const BASE = 'http://127.0.0.1:8787/api'
const PASSWORD = 'Test@2026'

async function j(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return r.json()
}

const comptes = [
  [process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD, 'SuperAdmin'],
  ['president@tontigest.cm', PASSWORD, 'President'],
  ['tresorier@tontigest.cm', PASSWORD, 'Tresorier'],
  ['secretaire@tontigest.cm', PASSWORD, 'Secretaire'],
  ['commissaire@tontigest.cm', PASSWORD, 'Commissaire'],
  ['membre1@tontigest.cm', PASSWORD, 'Membre'],
  ['membre2@tontigest.cm', PASSWORD, 'Membre'],
  ['kasir@tontigest.app', 'Awae@2026', 'Membre'],
]

let allOk = true
for (const [email, pwd, roleAttendu] of comptes) {
  const r = await j('POST', '/auth/login', { email, password: pwd })
  if (r.error) { console.log(`✗ ${email} — LOGIN ÉCHOUÉ: ${r.error}`); allOk = false; continue }
  const roleOk = r.user.role === roleAttendu
  let clubOk = true, membres = 0
  if (r.user.club_id) {
    const d = await j('GET', `/clubs/${r.user.club_id}/data`, null, r.token)
    clubOk = !d.error && !!d.club
    membres = d.records?.members?.length || 0
  }
  const ok = roleOk && clubOk
  if (!ok) allOk = false
  console.log(`${ok ? '✓' : '✗'} ${email.padEnd(28)} rôle=${r.user.role}${roleOk ? '' : ` (attendu ${roleAttendu})`}${r.user.club_id ? ` club=OK (${membres} membres)` : ' (superadmin, sans club)'}`)
}
console.log(allOk ? '\nTOUT EST OK' : '\nDES ERREURS SUBSISTENT')
process.exit(allOk ? 0 : 1)
