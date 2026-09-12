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

/* ============================ EMAILS AUTOMATIQUES ============================ */
/* Emails transactionnels déclenchés par le serveur aux moments clés.
   Chaque template : si Mailjet n'est pas configuré, l'envoi est ignoré
   (l'in-app reste la source principale) — jamais d'échec bloquant. */

const emailShell = (title, inner, footer) => `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,#0d5c46,#0a775c);padding:28px 32px">
      <h1 style="color:#f8f4e8;margin:0;font-size:20px">TontiGest</h1>
      <p style="color:#d9c887;margin:6px 0 0;font-size:13px">${title}</p>
    </div>
    <div style="padding:28px 32px;color:#1f2937;font-size:14px;line-height:1.7">
      ${inner}
    </div>
    <div style="padding:18px 32px;background:#f8f6ef;border-top:1px solid #e5e7eb;color:#6b7280;font-size:11px">
      ${footer || 'Cet email automatique vous a été envoyé par la plateforme TontiGest.'}
    </div>
  </div>`

/* 1. Bienvenue — à l'inscription. */
export async function emailWelcome({ email, nom }) {
  return sendEmail({
    to: email,
    subject: 'Bienvenue sur TontiGest 🎉',
    text: `Bonjour ${nom || ''},\n\nBienvenue sur TontiGest ! Votre compte est créé.\n\nProchaine étape : rejoignez votre association avec son code d'invitation, ou créez votre tontine depuis l'application.\n\n— L'équipe TontiGest`,
    html: emailShell(
      'Bienvenue !',
      `<p>Bonjour <b>${nom || ''}</b>,</p>
       <p>Votre compte <b>TontiGest</b> est créé. 🎉</p>
       <p><b>Prochaine étape :</b> rejoignez votre association avec son <b>code d'invitation</b> (donné par votre président), ou créez votre tontine depuis l'application.</p>
       <p>Vous y retrouverez cotisations, épargne, séances, emprunts et la messagerie du club.</p>`,
    ),
  })
}

/* 2. Cotisation confirmée — après paiement validé (GeniusPay). */
export async function emailCotisationConfirmee({ email, nom, montant, periode, ref }) {
  const m = Number(montant || 0).toLocaleString('fr-FR')
  return sendEmail({
    to: email,
    subject: `Cotisation ${periode} confirmée — ${m} FCFA`,
    text: `Bonjour ${nom || ''},\n\nVotre cotisation de ${m} FCFA pour la période ${periode} a bien été reçue (référence ${ref}).\nElle sera visible dans votre espace membre après validation du trésorier.\n\n— L'équipe TontiGest`,
    html: emailShell(
      'Cotisation confirmée',
      `<p>Bonjour <b>${nom || ''}</b>,</p>
       <p>Votre cotisation de <b>${m} FCFA</b> pour la période <b>${periode}</b> a bien été reçue.</p>
       <p style="color:#6b7280;font-size:12px">Référence : ${ref}</p>
       <p>Elle apparaîtra dans votre espace membre après validation du trésorier.</p>`,
    ),
  })
}

/* 3. Cotisation validée par le trésorier — relayée automatiquement. */
export async function emailCotisationValidee({ email, nom, montant, periode }) {
  const m = Number(montant || 0).toLocaleString('fr-FR')
  return sendEmail({
    to: email,
    subject: `Cotisation ${periode} validée ✅`,
    text: `Bonjour ${nom || ''},\n\nVotre cotisation de ${m} FCFA (${periode}) a été validée par le trésorier. Votre situation est à jour.\n\n— L'équipe TontiGest`,
    html: emailShell(
      'Cotisation validée',
      `<p>Bonjour <b>${nom || ''}</b>,</p>
       <p>Votre cotisation de <b>${m} FCFA</b> (${periode}) a été <b style="color:#0a775c">validée</b> par le trésorier. Votre situation est à jour. ✅</p>`,
    ),
  })
}

/* 4. Rappel de cotisation — envoyé au membre en retard. */
export async function emailRappelCotisation({ email, nom, montant, periode, echeance }) {
  const m = Number(montant || 0).toLocaleString('fr-FR')
  return sendEmail({
    to: email,
    subject: `Rappel : cotisation ${periode} en attente`,
    text: `Bonjour ${nom || ''},\n\nPetit rappel : votre cotisation de ${m} FCFA pour la période ${periode} n'est pas encore enregistrée${echeance ? ` (échéance : ${echeance})` : ''}.\nVous pouvez payer en ligne depuis votre espace membre (Orange Money, MTN MoMo, carte).\n\n— L'équipe TontiGest`,
    html: emailShell(
      'Rappel de cotisation',
      `<p>Bonjour <b>${nom || ''}</b>,</p>
       <p>Petit rappel : votre cotisation de <b>${m} FCFA</b> pour la période <b>${periode}</b> n'est pas encore enregistrée${echeance ? ` (échéance : <b>${echeance}</b>)` : ''}.</p>
       <p>Vous pouvez payer en ligne depuis votre espace membre (Orange Money, MTN MoMo, carte bancaire).</p>`,
    ),
  })
}

/* 5. Séance à venir — convocation relayée par email. */
export async function emailConvocation({ email, nom, titre, date, lieu }) {
  return sendEmail({
    to: email,
    subject: `Convocation : ${titre}`,
    text: `Bonjour ${nom || ''},\n\nVous êtes convié(e) à la séance « ${titre} »${date ? ` le ${date}` : ''}${lieu ? ` à ${lieu}` : ''}.\nL'ordre du jour et le pointage sont dans votre espace membre.\n\n— L'équipe TontiGest`,
    html: emailShell(
      'Convocation à une séance',
      `<p>Bonjour <b>${nom || ''}</b>,</p>
       <p>Vous êtes convié(e) à la séance <b>« ${titre} »</b>${date ? ` le <b>${date}</b>` : ''}${lieu ? ` à <b>${lieu}</b>` : ''}.</p>
       <p>L'ordre du jour et le pointage des présences sont dans votre espace membre.</p>`,
    ),
  })
}

/* 6. Nouveau message interne — notification de messagerie. */
export async function emailNewMessage({ email, nom, from, body }) {
  const excerpt = String(body || '').slice(0, 160)
  return sendEmail({
    to: email,
    subject: `Nouveau message de ${from || 'un membre'}`,
    text: `Bonjour ${nom || ''},\n\n${from || 'Un membre'} vous a envoyé un message sur TontiGest :\n\n« ${excerpt} »\n\nOuvrez l'application pour répondre.\n\n— L'équipe TontiGest`,
    html: emailShell(
      'Nouveau message',
      `<p>Bonjour <b>${nom || ''}</b>,</p>
       <p><b>${from || 'Un membre'}</b> vous a envoyé un message :</p>
       <div style="background:#f8f6ef;border-left:3px solid #0a775c;padding:12px 16px;border-radius:8px;margin:12px 0">« ${excerpt} »</div>
       <p>Ouvrez l'application pour répondre.</p>`,
    ),
  })
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
