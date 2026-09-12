/* Reposer les env vars sur le nouveau service + surveiller le build. */
const KEY = 'rnd_nDqJ0f6Naomtqoqh8vE5Isa6qstU'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' }
const SVC = 'srv-daijj1u7bikc738ttq40'
import { randomBytes } from 'node:crypto'

/* 1. Env vars (mêmes que la config Render précédente) */
const envVars = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'DB_HOST', value: 'PENDING_TIDB' },
  { key: 'DB_PORT', value: '4000' },
  { key: 'DB_USER', value: 'PENDING' },
  { key: 'DB_PASSWORD', value: 'PENDING' },
  { key: 'DB_NAME', value: 'tontigest' },
  { key: 'JWT_SECRET', value: randomBytes(48).toString('hex') },
  { key: 'JWT_EXPIRES', value: '7d' },
  { key: 'SUPERADMIN_EMAIL', value: 'admin@tontigest.cm' },
  { key: 'SUPERADMIN_PASSWORD', value: 'SuperAdmin2026!' },
  { key: 'GENIUSPAY_PUBLIC_KEY', value: 'pk_sandbox_BbXStrikRiCWuEBL4Gfg55OJNImArlex' },
  { key: 'GENIUSPAY_SECRET_KEY', value: 'sk_sandbox_4ee6ef810e955fb5948e430f8c0fca90369abcc62357d0a32f6a50f4b432e00d' },
  { key: 'GENIUSPAY_BASE_URL', value: 'https://geniuspay.ci/api/v1/merchant' },
  { key: 'GENIUSPAY_SANDBOX', value: 'true' },
  { key: 'MAILJET_API_KEY', value: 'd0fc7eb695adde1e272c4d6892bb227f' },
  { key: 'MAILJET_SECRET_KEY', value: 'dfda3a77b83fff5a3d8e23868964721e' },
  { key: 'MAILJET_SENDER_EMAIL', value: 'ngoumkwegildas@gmail.com' },
  { key: 'MAILJET_SENDER_NAME', value: 'TontiGest' },
]

const evRes = await fetch(`https://api.render.com/v1/services/${SVC}/env-vars`, {
  method: 'PUT', headers: H, body: JSON.stringify(envVars),
})
console.log('env vars :', evRes.status, evRes.ok ? 'OK' : (await evRes.text()).slice(0, 200))

/* 2. Surveiller le build initial */
let deployId = 'dep-daijj2e7bikc738ttrkg'
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 10000))
  const r = await fetch(`https://api.render.com/v1/services/${SVC}/deploys/${deployId}`, { headers: H })
  const d = await r.json()
  const secs = Math.round((Date.now() - new Date(d.createdAt)) / 1000)
  console.log(`[${secs}s] ${d.status}`)
  if (d.status === 'succeeded') { console.log('\nBUILD REUSSI — service en ligne !'); break }
  if (d.status.includes('fail')) {
    console.log('\nBUILD ECHOUE encore — logs dashboard nécessaires')
    break
  }
}
