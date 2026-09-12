/* Passerelle de paiement — GeniusPay CI (https://geniuspay.ci/docs/api).
   Canaux : Orange Money, MTN MoMo, Wave, cartes — page checkout hébergée.

   FLUX RÉEL :
     1. Membre initie → POST /api/payments/initiate
     2. Serveur crée une transaction MySQL (pending) + paiement GeniusPay :
        POST {base}/payments avec X-API-Key + X-API-Secret
        → data.payment_url (méthode imposée) ou data.checkout_url (page hébergée)
     3. Le membre paie sur la page GeniusPay ; retour via success_url/error_url
     4. Au retour, le serveur RE-VÉRIFIE le statut réel :
        GET {base}/payments/{reference} (statut : pending|completed|failed|cancelled|expired)
     5. Quand completed → cotisation poussée dans le club (validation trésorier conservée).

   MODE SANDBOX : clés pk_sandbox/sk_sandbox, environment 'sandbox' — aucun argent réel.
   MODE SIMULATION (aucune clé) : cycle identique, confirmation manuelle explicite. */

import { q } from './db.js'
import { geniuspay } from './config.js'

/* Méthodes de paiement GeniusPay (payment_method).
   TontiGest propose OM / MoMo / carte ; on transmet la correspondance. */
const METHODS = { OM: 'orange_money', MoMo: 'mtn_money', Carte: 'card' }

/* ============================ CLIENT GENIUSPAY ============================ */
async function gp(path, options = {}) {
  const res = await fetch(`${geniuspay.baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-Key': geniuspay.publicKey,
      'X-API-Secret': geniuspay.secretKey,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) return { ok: false, status: res.status }
  const data = await res.json().catch(() => null)
  return { ok: true, status: res.status, data }
}

/* Crée un paiement GeniusPay. Retourne { url } ou null en cas d'échec. */
async function createGeniuspayPayment({ ref, montant, methode, tel, description, successUrl, errorUrl, metadata }) {
  const body = {
    amount: montant,
    currency: 'XOF',
    description,
    customer: { phone: tel || undefined },
    metadata,
  }
  // Méthode imposée (OM/MoMo/carte) → payment_url direct ;
  // sans méthode → checkout_url page hébergée GeniusPay (toutes méthodes).
  if (METHODS[methode]) body.payment_method = METHODS[methode]
  if (successUrl) body.success_url = successUrl
  if (errorUrl) body.error_url = errorUrl

  try {
    const r = await gp('/payments', { method: 'POST', body: JSON.stringify(body) })
    if (!r.ok) return null
    const d = r.data?.data
    const url = d?.payment_url || d?.checkout_url || null
    return url ? { url, reference: d.reference || ref, environment: d.environment } : null
  } catch {
    return null
  }
}

/* Récupère le statut réel d'un paiement auprès de GeniusPay. */
async function getGeniuspayPayment(ref) {
  try {
    const r = await gp(`/payments/${encodeURIComponent(ref)}`)
    if (!r.ok) return null
    const d = r.data?.data
    return d ? { status: d.status, raw: d } : null
  } catch {
    return null
  }
}

/* ============================ INITIATION ============================ */
export async function initiatePayment({ userId, clubId, membreId, montant, methode, tel, periode, notifyUrl }) {
  const ref = `TG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const mode = geniuspay.configured ? (geniuspay.sandbox ? 'geniuspay-sandbox' : 'geniuspay') : 'simulation'

  await q(
    `INSERT INTO payment_transactions (ref, user_id, club_id, membre_id, amount, currency, channel, phone, period, provider, status, created_at)
     VALUES (?,?,?,?,?,?,?, ?, ?,?, 'pending', NOW())
     ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
    [ref, userId, clubId, membreId, montant, 'XOF', METHODS[methode] || methode, tel || null, periode, mode]
  ).catch(async () => {
    // Colonne membre_id absente (migration pas encore passée) — insertion sans elle.
    return q(
      `INSERT INTO payment_transactions (ref, user_id, club_id, amount, currency, channel, phone, period, provider, status, created_at)
       VALUES (?,?,?,?,?,?,?, ?,?, 'pending', NOW())`,
      [ref, userId, clubId, montant, 'XOF', METHODS[methode] || methode, tel || null, periode, mode]
    )
  })

  let paymentUrl = null
  let environment = geniuspay.sandbox ? 'sandbox' : null
  if (geniuspay.configured) {
    const origin = notifyUrl.replace('/api/payments/geniuspay/notify', '')
    const session = await createGeniuspayPayment({
      ref, montant, methode, tel,
      description: `Cotisation TontiGest — période ${periode}`,
      successUrl: `${origin}/#/payer?status=success&ref=${ref}`,
      errorUrl: `${origin}/#/payer?status=error&ref=${ref}`,
      metadata: { tontigest_ref: ref, club_id: clubId, membre_id: membreId || null, periode },
    })
    if (session) {
      paymentUrl = session.url
      environment = session.environment || environment
    }
  }

  return { ref, mode, paymentUrl, sandbox: environment === 'sandbox' }
}

/* ============================ VÉRIFICATION DU STATUT ============================ */
export async function checkPayment(ref) {
  const [rows] = await q('SELECT * FROM payment_transactions WHERE ref = ?', [ref])
  if (!rows.length) return { found: false }

  if (rows[0].provider !== 'simulation' && rows[0].status === 'pending') {
    // Vérité terrain auprès de GeniusPay — jamais le webhook/corps seul.
    const remote = await getGeniuspayPayment(ref)
    if (remote?.status) {
      const s = String(remote.status).toLowerCase()
      if (s === 'completed') {
        await markSuccess(ref, { source: 'check', remote: remote.raw })
      } else if (['failed', 'cancelled', 'expired'].includes(s)) {
        await q(`UPDATE payment_transactions SET status = ? WHERE ref = ?`, [s === 'expired' ? 'expired' : 'failed', ref])
      }
    }
  }

  const [fresh] = await q('SELECT ref, amount, currency, channel, period, provider, status FROM payment_transactions WHERE ref = ?', [ref])
  return { found: true, transaction: fresh[0] }
}

/* ============================ WEBHOOK GENIUSPAY ============================ */
/* Point d'entrée du webhook GeniusPay (si configuré dans leur dashboard).
   On ne fait jamais confiance au corps : re-vérification systématique. */
export async function handleGeniuspayNotify(body) {
  const ref = body?.reference || body?.data?.reference || body?.metadata?.tontigest_ref || body?.ref
  if (!ref) return { ok: false, error: 'reference manquante' }
  const result = await checkPayment(ref)
  return { ok: result.found, transaction: result.transaction }
}

/* ============================ FINALISATION ============================ */
/* Marque la transaction successful et pousse la cotisation dans le club
   (statut « En attente » — la validation trésorier est conservée). */
async function markSuccess(ref, meta) {
  const [rows] = await q('SELECT * FROM payment_transactions WHERE ref = ?', [ref])
  if (!rows.length || rows[0].status === 'success') return
  await q(`UPDATE payment_transactions SET status = 'success', provider_meta = ? WHERE ref = ?`, [JSON.stringify(meta || {}), ref])

  const tx = rows[0]
  const cotId = `cot-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const cotisation = {
    id: cotId, membreId: tx.membre_id, montant: tx.amount, devise: tx.currency,
    date: new Date().toISOString().slice(0, 10), periode: tx.period,
    methode: tx.channel, ref, statut: 'En attente',
  }
  await q(
    `INSERT INTO records (entity, id, club_id, user_id, payload) VALUES ('cotisations', ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [cotId, tx.club_id, tx.user_id, JSON.stringify(cotisation)]
  )
  try {
    const { PROJECTORS } = await import('./relational.js')
    if (PROJECTORS.cotisations) await PROJECTORS.cotisations(tx.club_id, cotisation)
  } catch { /* projection best-effort */ }
}

/* Le membre confirme manuellement en mode simulation uniquement. */
export async function simulateSuccess(ref, userId) {
  const [rows] = await q('SELECT * FROM payment_transactions WHERE ref = ? AND user_id = ?', [ref, userId])
  if (!rows.length) return { ok: false, error: 'Transaction introuvable.' }
  if (rows[0].status !== 'pending') return { ok: false, error: 'Transaction déjà finalisée.' }
  if (rows[0].provider !== 'simulation') return { ok: false, error: 'Cette transaction doit être confirmée par la passerelle GeniusPay.' }
  await markSuccess(ref, { simulated: true })
  return { ok: true }
}
