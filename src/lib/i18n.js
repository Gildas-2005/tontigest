/* Internationalisation FR/EN — dictionnaire des textes de l'interface.
   Usage : t('nav.dashboard') → « Tableau de bord » / « Dashboard ».
   La langue active est persistée dans localStorage (tg_lang). */

const dict = {
  /* --- Barre supérieure & navigation --- */
  'app.workspace': { fr: 'Tableau de bord', en: 'Dashboard' },
  'app.install': { fr: 'Installer', en: 'Install' },
  'app.notifications': { fr: 'Notifications', en: 'Notifications' },
  'app.markAllRead': { fr: 'Tout marquer comme lu', en: 'Mark all as read' },
  'app.noNotifications': { fr: 'Aucune notification', en: 'No notifications' },
  'app.darkMode': { fr: 'Mode sombre', en: 'Dark mode' },
  'app.lightMode': { fr: 'Mode clair', en: 'Light mode' },
  'app.language': { fr: 'Langue', en: 'Language' },
  'app.profile': { fr: 'Mon profil', en: 'My profile' },
  'app.logout': { fr: 'Déconnexion', en: 'Sign out' },
  'app.login': { fr: 'Se connecter', en: 'Sign in' },
  'app.signup': { fr: 'Créer un compte', en: 'Create account' },

  /* --- Groupes du volet de navigation --- */
  'nav.group.pilotage': { fr: 'Pilotage', en: 'Management' },
  'nav.group.tresorerie': { fr: 'Trésorerie', en: 'Treasury' },
  'nav.group.organisation': { fr: 'Organisation', en: 'Organization' },
  'nav.group.documents': { fr: 'Documents', en: 'Documents' },

  /* --- Rôles --- */
  'role.president': { fr: 'Président', en: 'President' },
  'role.tresorier': { fr: 'Trésorier', en: 'Treasurer' },
  'role.secretaire': { fr: 'Secrétaire', en: 'Secretary' },
  'role.commissaire': { fr: 'Commissaire', en: 'Auditor' },
  'role.membre': { fr: 'Membre', en: 'Member' },

  /* --- Commun --- */
  'common.loading': { fr: 'Chargement…', en: 'Loading…' },
  'common.save': { fr: 'Enregistrer', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.close': { fr: 'Fermer', en: 'Close' },
  'common.validate': { fr: 'Valider', en: 'Approve' },
  'common.reject': { fr: 'Rejeter', en: 'Reject' },
  'common.search': { fr: 'Rechercher', en: 'Search' },
  'common.total': { fr: 'Total', en: 'Total' },
  'common.active': { fr: 'Actif', en: 'Active' },
  'common.suspended': { fr: 'Suspendu', en: 'Suspended' },
  'common.preparation': { fr: 'En préparation', en: 'Preparing' },
  'common.currency': { fr: 'FCFA', en: 'FCFA' },

  /* --- Paiement --- */
  'pay.title': { fr: 'Payer ma cotisation', en: 'Pay my contribution' },
  'pay.gatewayLive': { fr: 'Passerelle de paiement active (CinetPay) — Orange Money, MTN MoMo et cartes acceptés.', en: 'Payment gateway active (CinetPay) — Orange Money, MTN MoMo and cards accepted.' },
  'pay.gatewaySim': { fr: 'Passerelle de paiement non configurée — mode simulation.', en: 'Payment gateway not configured — simulation mode.' },
  'pay.amount': { fr: 'Montant (XAF)', en: 'Amount (XAF)' },
  'pay.phone': { fr: 'Numéro de téléphone', en: 'Phone number' },
  'pay.pay': { fr: 'Payer', en: 'Pay' },
  'pay.iPaid': { fr: "J'ai payé — vérifier", en: "I've paid — verify" },
  'pay.simConfirm': { fr: "J'ai réglé — enregistrer", en: "I've paid — record it" },
  'pay.processing': { fr: 'Création de la transaction…', en: 'Creating transaction…' },
  'pay.checkout': { fr: 'Terminez le paiement', en: 'Complete the payment' },
  'pay.success': { fr: 'Paiement enregistré', en: 'Payment recorded' },
  'pay.successSub': { fr: 'Le trésorier va valider votre cotisation dans quelques instants.', en: 'The treasurer will confirm your contribution shortly.' },

  /* --- 2FA --- */
  'twofa.title': { fr: 'Vérification en deux étapes', en: 'Two-step verification' },
  'twofa.smsSent': { fr: 'Un code de vérification vient de vous être envoyé par SMS.', en: 'A verification code was just sent to you by SMS.' },
  'twofa.emailSent': { fr: 'Un code de vérification vient de vous être envoyé par email.', en: 'A verification code was just sent to you by email.' },
  'twofa.simCode': { fr: 'Mode simulation — code : {code}', en: 'Simulation mode — code: {code}' },
  'twofa.codeLabel': { fr: 'Code à 6 chiffres', en: '6-digit code' },
  'twofa.confirm': { fr: 'Vérifier et me connecter', en: 'Verify and sign in' },
}

let activeLang = 'fr'

export function setLang(lang) {
  activeLang = lang === 'en' ? 'en' : 'fr'
}

export function currentLang() {
  return activeLang
}

/* Traduction : t('pay.title') ou t('twofa.simCode', { code: '123456' }). */
export function t(key, vars) {
  const entry = dict[key]
  if (!entry) return key
  let text = entry[activeLang] || entry.fr
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}
