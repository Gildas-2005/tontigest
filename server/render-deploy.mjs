/* Relancer le déploiement Render (repo maintenant public). */
const KEY = 'rnd_nDqJ0f6Naomtqoqh8vE5Isa6qstU'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' }
const SVC = 'srv-daiiqim7bikc738r2rbg'

const pub = await fetch('https://api.github.com/repos/Gildas-2005/tontigest')
const repo = await pub.json()
console.log('repo public :', !repo.private)

const dep = await fetch(`https://api.render.com/v1/services/${SVC}/deploys`, {
  method: 'POST', headers: H, body: JSON.stringify({ clearCache: 'do_not_clear' }),
})
const depText = await dep.text()
console.log('déclenchement :', dep.status)
let deployId
try { deployId = JSON.parse(depText).id ?? JSON.parse(depText).deploy?.id } catch {}
console.log('deploy :', deployId)

if (deployId) {
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 10000))
    const r = await fetch(`https://api.render.com/v1/services/${SVC}/deploys/${deployId}`, { headers: H })
    const d = await r.json()
    const mins = Math.round((Date.now() - new Date(d.createdAt)) / 60000)
    console.log(`[${mins} min] ${d.status}`)
    if (d.status === 'succeeded') { console.log('BUILD REUSSI !'); break }
    if (d.status.includes('fail')) { console.log('BUILD ECHOUE'); break }
  }
}
