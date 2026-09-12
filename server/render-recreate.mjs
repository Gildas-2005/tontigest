/* Recréer le web service tontigest (repo public maintenant). */
const KEY = 'rnd_nDqJ0f6Naomtqoqh8vE5Isa6qstU'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' }
const OWNER = 'tea-d5c97875r7bs73areps0'

const body = {
  type: 'web_service',
  name: 'tontigest',
  ownerId: OWNER,
  repo: 'https://github.com/Gildas-2005/tontigest',
  branch: 'main',
  autoDeploy: 'yes',
  serviceDetails: {
    env: 'node',
    region: 'frankfurt',
    plan: 'free',
    envSpecificDetails: {
      buildCommand: 'npm install && npm run build',
      startCommand: 'npm run server',
    },
    healthCheckPath: '/api/health',
    numInstances: 1,
  },
}

const res = await fetch('https://api.render.com/v1/services', { method: 'POST', headers: H, body: JSON.stringify(body) })
const text = await res.text()
console.log('création :', res.status)
if (res.ok) {
  const d = JSON.parse(text)
  const svc = d.service ?? d
  console.log('ID :', svc.id)
  console.log('deploy initial :', d.deployId ?? 'auto')
  console.log('URL :', svc.serviceDetails?.url)
  console.log('Dashboard :', svc.dashboardUrl)
} else {
  console.log(text.slice(0, 400))
}
