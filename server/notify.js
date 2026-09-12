/* Canaux de notification — Mailjet (email), Twilio (SMS), push web (VAPID).
   Chaque canal vérifie sa configuration : s'il n'est pas configuré, la
   notification est simplement ignorée côté canal (l'in-app reste active),
   et l'app affiche l'état réel des canaux via /api/integrations. */

import { mailjet, twilio, vapid } from './config.js'

/* ============================ EMAIL (Mailjet) ============================ */
/* API Mailjet v3.1 — https://app.mailjet.com/account/apikeys
   Auth : Basic (API key : secret key). */
export async function sendEmail({ to, subject, text, html }) {
  if (!mailjet.configured) return { sent: false, reason: 'email non configuré' }
  try {
    const auth = Buffer.from(`${mailjet.apiKey}:${mailjet.secretKey}`).toString('base64')
    const res = await fetch(mailjet.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: mailjet.senderEmail, Name: mailjet.senderName },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
          HTMLPart: html || `<div style="font-family:sans-serif;white-space:pre-wrap">${text}</div>`,
        }],
      }),
    })
    return { sent: res.ok }
  } catch (e) {
    return { sent: false, reason: e.message }
  }
}

/* ============================ SMS (Twilio) ============================ */
export async function sendSms({ to, text }) {
  if (!twilio.configured) return { sent: false, reason: 'sms non configuré' }
  if (!to) return { sent: false, reason: 'numéro absent' }
  try {
    const body = new URLSearchParams({ To: to, From: twilio.fromNumber, Body: text })
    const res = await fetch(twilio.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64'),
      },
      body,
    })
    return { sent: res.ok }
  } catch (e) {
    return { sent: false, reason: e.message }
  }
}

/* ============================ 2FA MULTICANAL ============================ */
/* Le code 2FA est envoyé par le premier canal disponible :
   SMS si Twilio est configuré, sinon email si Mailjet est configuré.
   Si aucun canal n'est actif, le code reste retourné en mode simulation
   (affiché avec un avertissement explicite dans l'interface). */
export async function sendTwoFactorCode({ email, tel, nom, code }) {
  const channels = []
  const sms = await sendSms({
    to: tel,
    text: `TontiGest — votre code de vérification est ${code}. Il expire dans 10 minutes.`,
  })
  if (sms.sent) channels.push('sms')
  else {
    const mail = await sendEmail({
      to: email,
      subject: `TontiGest — code de vérification : ${code}`,
      text: `Bonjour ${nom || ''},\n\nVotre code de vérification TontiGest est : ${code}\nIl expire dans 10 minutes.\n\nSi vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe immédiatement.`,
    })
    if (mail.sent) channels.push('email')
  }
  return { channels }
}

/* ============================ NOTIFICATION ACTION (multicanal) ============================ */
/* Utilisée pour les actions clés : cotisation validée, prêt approuvé, etc.
   L'interface reste la source principale ; email/SMS sont des relais. */
export async function notifyExternal({ email, tel, titre, message }) {
  const results = { email: false, sms: false }
  if (email) {
    const r = await sendEmail({ to: email, subject: `TontiGest — ${titre}`, text: message })
    results.email = r.sent
  }
  if (tel) {
    const r = await sendSms({ to: tel, text: `TontiGest — ${titre} : ${message}` })
    results.sms = r.sent
  }
  return results
}

/* ============================ PUSH WEB (VAPID) ============================ */
/* Les abonnements sont stockés côté client (localStorage) et synchronisés par
   le navigateur ; l'envoi se fait via le protocole Web Push depuis ce module.
   Dépendance optionnelle : `npm i web-push` (graceful si absente). */
export async function sendPush(subscriptions, { title, body }) {
  if (!vapid.configured || !subscriptions?.length) return { sent: 0 }
  let webpush
  try { webpush = (await import('web-push')).default } catch { return { sent: 0, reason: 'web-push non installé' } }
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title, body }))
      sent++
    } catch (e) {
      if ([404, 410].includes(e.statusCode)) { /* abonnement expiré — à nettoyer côté client */ }
    }
  }
  return { sent }
}
