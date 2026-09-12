/* Vérifie que chaque compte acteur se connecte et accède au club avec le bon rôle. */
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
  ['admin@tontigest.cm', 'SuperAdmin2026!', 'SuperAdmin'],
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
