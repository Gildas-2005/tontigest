/* Crée les comptes de chaque acteur (Président, Trésorier, Secrétaire, Commissaire, Membres)
   et les rattache au club Awae Amie, avec le rôle demandé. Idempotent. */
const BASE = 'http://127.0.0.1:8787/api'

async function j(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return r.json()
}

const CLUB_CODE = process.argv[2] || 'H7B5NC'
const PASSWORD = 'Test@2026'

const ACTEURS = [
  { nom: 'Président Test', email: 'president@tontigest.cm', tel: '+237 699 10 10 10', role: 'President' },
  { nom: 'Trésorier Test', email: 'tresorier@tontigest.cm', tel: '+237 698 20 20 20', role: 'Tresorier' },
  { nom: 'Secrétaire Test', email: 'secretaire@tontigest.cm', tel: '+237 697 30 30 30', role: 'Secretaire' },
  { nom: 'Commissaire Test', email: 'commissaire@tontigest.cm', tel: '+237 696 40 40 40', role: 'Commissaire' },
  { nom: 'Membre Un', email: 'membre1@tontigest.cm', tel: '+237 695 50 50 50', role: 'Membre' },
  { nom: 'Membre Deux', email: 'membre2@tontigest.cm', tel: '+237 694 60 60 60', role: 'Membre' },
]

// 1. Login superadmin pour piloter
const adm = await j('POST', '/auth/login', { email: 'admin@tontigest.cm', password: 'SuperAdmin2026!' })
if (!adm.token) { console.log('Superadmin login failed:', adm); process.exit(1) }
const adminH = { Authorization: `Bearer ${adm.token}` }

// 2. Trouver le club cible
const ov = await j('GET', '/admin/overview', null, adm.token)
const club = ov.clubs.find(c => c.code === CLUB_CODE)
if (!club) { console.log('Club introuvable:', CLUB_CODE); process.exit(1) }
console.log(`Club cible : ${club.nom} (${club.code}) — ${club.id}`)

const { q, getPool } = await import('./db.js')

for (const a of ACTEURS) {
  const [existing] = await q('SELECT id, email, club_id, role FROM users WHERE email = ?', [a.email])
  if (existing.length) {
    // Déjà un compte : le rattacher au club si besoin et fixer le rôle
    const u = existing[0]
    if (u.club_id !== club.id) await q('UPDATE users SET club_id = ? WHERE id = ?', [club.id, u.id])
    if (u.role !== a.role) await q('UPDATE users SET role = ? WHERE id = ?', [a.role, u.id])
    // Rafraîchir aussi son member record
    const [mr] = await q("SELECT id, payload FROM records WHERE entity = 'members' AND user_id = ? AND club_id = ?", [u.id, club.id])
    if (mr.length) {
      const p = (typeof mr[0].payload === 'string' ? JSON.parse(mr[0].payload) : mr[0].payload) || {}
      const login = await j('POST', '/auth/login', { email: a.email, password: PASSWORD })
      if (login.token) await j('POST', `/clubs/${club.id}/records/members`, { rows: [{ id: mr[0].id, user_id: u.id, payload: { ...p, role: a.role, statut: 'Actif' } }] }, login.token)
    }
    console.log(`✓ ${a.email} — mis à jour (rôle ${a.role})`)
    continue
  }
  // Créer le compte (signup public) puis rejoindre le club
  const su = await j('POST', '/auth/signup', { nom: a.nom, telephone: a.tel, email: a.email, password: PASSWORD })
  if (su.error) { console.log(`✗ ${a.email}: ${su.error}`); continue }
  const jo = await j('POST', '/clubs/join', { code: CLUB_CODE }, su.token)
  if (jo.error) { console.log(`✗ ${a.email} join: ${jo.error}`); continue }
  // Fixer le rôle bureau dans le compte
  await q('UPDATE users SET role = ? WHERE id = ?', [a.role, su.user.id])
  // Nommer au bureau : met à jour le member record via l'API records (transport + projection)
  const [mr] = await q("SELECT id, payload FROM records WHERE entity = 'members' AND user_id = ? AND club_id = ?", [su.user.id, club.id])
  if (mr.length) {
    const p = (typeof mr[0].payload === 'string' ? JSON.parse(mr[0].payload) : mr[0].payload) || {}
    const upd = await j('POST', `/clubs/${club.id}/records/members`, { rows: [{ id: mr[0].id, user_id: su.user.id, payload: { ...p, role: a.role, statut: 'Actif' } }] }, su.token)
    console.log(`✓ ${a.email} — créé, club rejoint, rôle ${a.role} (member record ${upd.ok ? 'OK' : 'FAIL'})`)
  } else {
    console.log(`✓ ${a.email} — créé, club rejoint, rôle ${a.role} (⚠ member record introuvable)`)
  }
}

// 3. S'assurer que les membres du club existent côté records (nomination au bureau via UPDATE users → géré par le flush UI)
// On liste l'état final
const [users] = await q('SELECT email, role, club_id FROM users')
console.log('\n--- Comptes finaux ---')
for (const u of users) console.log(`  ${u.email.padEnd(30)} ${u.role.padEnd(12)} club=${(u.club_id || '—').slice(0, 8)}`)
await getPool().end()
