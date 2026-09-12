/* Logs Render via /v1/logs avec filtres corrects. */
const KEY = 'rnd_nDqJ0f6Naomtqoqh8vE5Isa6qstU'
const H = { Authorization: `Bearer ${KEY}`, Accept: 'application/json' }

/* Doc Render API logs : params = limit, startTime, endTime, et des filtres
   "resource" comme service, source, etc. Essayons les formats documentés. */
const attempts = [
  'https://api.render.com/v1/logs?limit=100&ownerId=tea-d5c97875r7bs73areps0&service=srv-daiiqim7bikc738r2rbg',
  'https://api.render.com/v1/logs?limit=100&ownerId=tea-d5c97875r7bs73areps0&services=srv-daiiqim7bikc738r2rbg',
  'https://api.render.com/v1/logs?limit=100&ownerId=tea-d5c97875r7bs73areps0&name=tontigest',
  'https://api.render.com/v1/logs?limit=100&ownerId=tea-d5c97875r7bs73areps0&serviceId=srv-daiiqim7bikc738r2rbg',
]

const startTime = new Date(Date.now() - 30 * 60000).toISOString()

for (const base of attempts) {
  const url = `${base}&startTime=${startTime}`
  const r = await fetch(url, { headers: H })
  const text = await r.text()
  console.log(`--- ${url.split('?')[1].split('&')[1]} → ${r.status}`)
  if (r.ok) {
    try {
      const logs = JSON.parse(text)
      for (const l of (Array.isArray(logs) ? logs : [])) {
        const msg = l.message ?? JSON.stringify(l)
        if (/error|fail|npm|clone|repo|denied|private|exit/i.test(msg)) console.log('  ', msg.slice(0, 200))
      }
      break
    } catch { console.log(text.slice(0, 300)) }
  } else {
    console.log('  ', text.slice(0, 150))
  }
}
