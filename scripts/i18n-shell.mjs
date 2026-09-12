/* Branche la traduction i18n dans la barre supérieure du Shell. */
import fs from 'node:fs'

const f = 'src/components/layout.jsx'
let c = fs.readFileSync(f, 'utf8')

// Groupe de navigation + badge statut traduits.
c = c.replace(
  "{current?.group || 'Tableau de bord'}",
  "{current?.group || t('app.workspace')}",
)
c = c.replace(
  "? 'En préparation' : db.tontine?.statut || 'Tontine'}",
  "? t('common.preparation') : db.tontine?.statut || 'Tontine'}",
)
// Bouton thème : libellé traduit.
c = c.replace(
  "title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}",
  "title={theme === 'dark' ? t('app.lightMode') : t('app.darkMode')}",
)
// Menu utilisateur : libellés traduits.
c = c.replace("> Mon profil</button>", "> {t('app.profile')}</button>".replace('{t', '{t'))
c = c.replace("/> Déconnexion</button>", "/> {t('app.logout')}</button>")
// Volet : déconnexion traduite.
c = c.replace("<LogOut size={16} /></span> Déconnexion", "<LogOut size={16} /></span> {t('app.logout')}")
// Cloche : titres traduits.
c = c.replace('<p className="text-sm font-bold">Notifications</p>', '<p className="text-sm font-bold">{t(\'app.notifications\')}</p>')
c = c.replace("className=\"text-xs font-semibold text-brand-600 hover:underline cursor-pointer\"", "className=\"text-xs font-semibold text-brand-600 hover:underline cursor-pointer\"")
c = c.replace('>Tout marquer lu</button>', ">{t('app.markAllRead')}</button>")
c = c.replace("text-sm text-ink/40\">Aucune notification<", "text-sm text-ink/40\">{t('app.noNotifications')}<")

fs.writeFileSync(f, c, 'utf8')
console.log('layout.jsx : i18n branché')
