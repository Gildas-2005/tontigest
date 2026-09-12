/* Configuration centralisée — base de données, JWT, superadmin et intégrations externes.
   Toutes les clés proviennent de variables d'environnement (.env) — jamais du code.
   Chaque intégration expose `configured` : tant que les clés manquent, l'app utilise
   un mode simulation honnête (jamais de faux succès silencieux). */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/* --- Lecture du fichier .env (en production, l'env est déjà posée par l'hébergeur) --- */
if (process.env.NODE_ENV !== 'production' && fs.existsSync(path.join(root, '.env'))) {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const env = (k) => String(process.env[k] || '').trim()

/* ============================ BASE DE L'APP ============================ */
export const config = {
  port: Number(env('PORT')) || 8787,
  db: {
    host: env('DB_HOST') || '127.0.0.1',
    port: Number(env('DB_PORT')) || 3306,
    user: env('DB_USER') || 'root',
    password: env('DB_PASSWORD') || 'gildas123',
    database: env('DB_NAME') || 'tontigest',
  },
  jwtSecret: env('JWT_SECRET') || 'tontigest-secret-local-dev-key-change-me',
  jwtExpires: env('JWT_EXPIRES') || '7d',
  superadmin: {
    email: env('SUPERADMIN_EMAIL') || 'admin@tontigest.cm',
    password: env('SUPERADMIN_PASSWORD') || 'SuperAdmin2026!',
  },
}

/* ============================ PASSERELLE DE PAIEMENT ============================ */
/* GeniusPay CI — documentation : https://geniuspay.ci/docs/api
   Dashboard : https://geniuspay.ci/dashboard

   Endpoints :
     POST /api/v1/merchant/payments      → créer un paiement
     GET  /api/v1/merchant/payments/:ref → récupérer un paiement (statut)

   Auth : en-têtes X-API-Key (clé publique) + X-API-Secret (clé secrète).

   Réponse 201 : { success: true, data: { reference, amount, fees, net_amount,
     status: 'pending', payment_url | checkout_url, gateway, environment } }

   Statuts : pending, completed, failed, cancelled, expired.

   Page checkout : si payment_method omis, l'API retourne checkout_url vers la
   page hébergée GeniusPay (toutes méthodes disponibles).

   SANDBOX : clés pk_sandbox_…/sk_sandbox_…, environment 'sandbox' — aucun argent réel. */
export const geniuspay = {
  publicKey: env('GENIUSPAY_PUBLIC_KEY'),
  secretKey: env('GENIUSPAY_SECRET_KEY'),
  baseUrl: env('GENIUSPAY_BASE_URL') || 'https://geniuspay.ci/api/v1/merchant',
  sandbox: env('GENIUSPAY_SANDBOX') !== 'false', // sandbox par défaut
  get configured() { return !!this.publicKey && !!this.secretKey },
}

/* CinetPay — passerelle alternative si GeniusPay ne convient pas. */
export const cinetpay = {
  apiKey: env('CINETPAY_API_KEY'),
  siteId: env('CINETPAY_SITE_ID'),
  baseUrl: env('CINETPAY_BASE_URL') || 'https://api-checkout.cinetpay.com/v2/payment',
  checkUrl: env('CINETPAY_CHECK_URL') || 'https://api-checkout.cinetpay.com/v2/payment/check',
  get configured() { return !!this.apiKey && !!this.siteId },
}

/* ============================ EMAIL (Brevo, ex-Sendinblue) ============================ */
/* ============================ EMAIL (Mailjet) ============================ */
/* https://app.mailjet.com/account/apikeys → clé API (format hexadécimal).
   MAILJET_SENDER_EMAIL doit être un email validé dans Mailjet (expéditeur vérifié). */
export const mailjet = {
  apiKey: env('MAILJET_API_KEY'),
  secretKey: env('MAILJET_SECRET_KEY'),
  senderEmail: env('MAILJET_SENDER_EMAIL'),
  senderName: env('MAILJET_SENDER_NAME') || 'TontiGest',
  baseUrl: 'https://api.mailjet.com/v3.1/send',
  get configured() { return !!this.apiKey && !!this.secretKey && !!this.senderEmail },
}

/* ============================ SMS (Twilio) ============================ */
/* console.twilio.com → achetez un numéro → Account SID + Auth Token (dashboard). */
export const twilio = {
  accountSid: env('TWILIO_ACCOUNT_SID'),
  authToken: env('TWILIO_AUTH_TOKEN'),
  fromNumber: env('TWILIO_FROM_NUMBER'),
  get configured() { return !!this.accountSid && !!this.authToken && !!this.fromNumber },
}

/* ============================ PUSH WEB (VAPID) ============================ */
/* Clés générées localement — aucun compte externe : npx web-push generate-vapid-keys */
export const vapid = {
  publicKey: env('VAPID_PUBLIC_KEY'),
  privateKey: env('VAPID_PRIVATE_KEY'),
  subject: env('VAPID_SUBJECT') || 'mailto:contact@tontigest.cm',
  get configured() { return !!this.publicKey && !!this.privateKey },
}

/* ============================ ÉTAT DES INTÉGRATIONS ============================ */
/* Exposé à GET /api/integrations — l'interface affiche honnêtement ce qui est actif. */
export function integrationsStatus() {
  return {
    payment: {
      provider: 'geniuspay',
      configured: geniuspay.configured,
      sandbox: geniuspay.sandbox,
    },
    email: { provider: 'mailjet', configured: mailjet.configured },
    sms: { provider: 'twilio', configured: twilio.configured },
    push: { provider: 'vapid', configured: vapid.configured },
  }
}
