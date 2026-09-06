import { useEffect, useState } from 'react'
import { StoreProvider, useAuth, useStore } from './lib/store'
import { Shell } from './components/layout'
import AuthPage, { Splash, ClubSetup, Onboarding } from './pages/auth'
import { ProfilPage } from './pages/profil'
import { PresidentHome, TontinePage, OrdrePage, MembresPage, BureauPage, SanctionsPage, RapportsPage, AlertesPage, DiffusionPage } from './pages/president'
import { TresorierHome, CotisationsPage, CaissePage, BanqueOpsPage, PenalitesPage, EpargnePage, PretsPage, InteretsPage, AidesPage, EncheresPage, RapportsFinPage } from './pages/tresorier'
import { SecretariatHome, SeancesPage, ConvocationsPage, ParrainagePage, ReclamationsPage, ArchivesPage } from './pages/secretaire'
import { AuditHome, AuditTransactionsPage, AuditRapportsPage, FraudePage } from './pages/commissaire'
import { MembreHome, PayerPage, HistoriquePage, CalendrierPage, PretsMembrePage, AidesMembrePage, EpargneMembrePage, EncherePage, AttestationPage } from './pages/membre'

/* Minimal hash router */
function useRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\/?/, '') || 'accueil')
  useEffect(() => {
    const h = () => setRoute(window.location.hash.replace(/^#\/?/, '') || 'accueil')
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  const go = (id) => { window.location.hash = `#/${id}` }
  return [route, go]
}

const NAV = {
  President: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Tableau de bord', icon: '📊', el: PresidentHome },
      { id: 'profil', label: 'Mon profil', icon: '👤', el: ProfilPage },
    ]},
    { group: 'Pilotage', items: [
      { id: 'tontine', label: 'Ma tontine', icon: '⚙️', el: TontinePage },
      { id: 'ordre', label: 'Calendrier de passage', icon: '🗓️', el: OrdrePage },
      { id: 'membres', label: 'Membres', icon: '👥', el: MembresPage },
      { id: 'bureau', label: 'Bureau exécutif', icon: '👑', el: BureauPage },
      { id: 'sanctions', label: 'Sanctions', icon: '⚖️', el: SanctionsPage },
    ]},
    { group: 'Contrôle', items: [
      { id: 'rapports', label: 'Rapports financiers', icon: '📑', el: RapportsPage },
      { id: 'alertes', label: 'Alertes & anomalies', icon: '🚨', el: AlertesPage },
      { id: 'diffusion', label: 'Notification de masse', icon: '📣', el: DiffusionPage },
    ]},
  ],
  Tresorier: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Tableau de bord', icon: '📊', el: TresorierHome },
      { id: 'profil', label: 'Mon profil', icon: '👤', el: ProfilPage },
    ]},
    { group: 'Trésorerie', items: [
      { id: 'cotisations', label: 'Cotisations', icon: '📥', el: CotisationsPage },
      { id: 'caisse', label: 'Caisse multi-devises', icon: '💰', el: CaissePage },
      { id: 'banque', label: 'Banque & rapprochement', icon: '🏦', el: BanqueOpsPage },
      { id: 'penalites', label: 'Pénalités & amendes', icon: '⚖️', el: PenalitesPage },
    ]},
    { group: 'Services', items: [
      { id: 'epargne', label: 'Épargne', icon: '🐖', el: EpargnePage },
      { id: 'prets', label: 'Prêts internes', icon: '🤲', el: PretsPage },
      { id: 'interets', label: 'Intérêts & redistribution', icon: '📈', el: InteretsPage },
      { id: 'aides', label: 'Aides sociales', icon: '❤️', el: AidesPage },
      { id: 'encheres', label: 'Enchères du tour', icon: '🔨', el: EncheresPage },
    ]},
    { group: 'Reporting', items: [
      { id: 'rapports-fin', label: 'Rapports & clôtures', icon: '📑', el: RapportsFinPage },
    ]},
  ],
  Secretaire: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Tableau de bord', icon: '📊', el: SecretariatHome },
      { id: 'profil', label: 'Mon profil', icon: '👤', el: ProfilPage },
    ]},
    { group: 'Vie du club', items: [
      { id: 'seances', label: 'Séances & PV', icon: '🗓️', el: SeancesPage },
      { id: 'convocations', label: 'Convocations', icon: '✉️', el: ConvocationsPage },
      { id: 'parrainage', label: 'Parrainages', icon: '🤝', el: ParrainagePage },
      { id: 'reclamations', label: 'Réclamations & litiges', icon: '🗨️', el: ReclamationsPage },
      { id: 'archives', label: 'Archives & exports', icon: '🗄️', el: ArchivesPage },
    ]},
  ],
  Commissaire: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Tableau de bord audit', icon: '📊', el: AuditHome },
      { id: 'profil', label: 'Mon profil', icon: '👤', el: ProfilPage },
    ]},
    { group: 'Audit', items: [
      { id: 'transactions', label: 'Transactions & pièces', icon: '🔍', el: AuditTransactionsPage },
      { id: 'rapports-audit', label: 'Rapports financiers', icon: '📑', el: AuditRapportsPage },
      { id: 'fraude', label: 'Signaler une anomalie', icon: '🚨', el: FraudePage },
    ]},
  ],
  Membre: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Mon espace', icon: '🏠', el: MembreHome },
      { id: 'profil', label: 'Mon profil', icon: '👤', el: ProfilPage },
    ]},
    { group: 'Mes opérations', items: [
      { id: 'payer', label: 'Payer ma cotisation', icon: '📲', el: PayerPage },
      { id: 'historique', label: 'Historique & reçus', icon: '🧾', el: HistoriquePage },
      { id: 'calendrier', label: 'Calendrier de passage', icon: '🗓️', el: CalendrierPage },
      { id: 'enchere', label: 'Enchère du tour', icon: '🔨', el: EncherePage },
    ]},
    { group: 'Mes services', items: [
      { id: 'prets', label: 'Mes prêts', icon: '🤲', el: PretsMembrePage },
      { id: 'aides', label: 'Aides sociales', icon: '❤️', el: AidesMembrePage },
      { id: 'epargne', label: 'Mon épargne', icon: '🐖', el: EpargneMembrePage },
      { id: 'attestation', label: 'Attestation de membre', icon: '📜', el: AttestationPage },
    ]},
  ],
}

const flatten = (nav) => nav.flatMap(g => g.items.map(({ id, label, icon, group, el }) => ({ id, label, icon, group, el })))

function AppInner() {
  const { user, authReady } = useAuth()
  const { db } = useStore()
  const [route, go] = useRoute()
  const [splash, setSplash] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2000)
    return () => clearTimeout(t)
  }, [])

  if (splash || !authReady) return <Splash />
  if (!user) return <AuthPage />
  if (!user.clubId) return <ClubSetup />
  if (!user.onboardingDone) return <Onboarding />
  if (!db.tontine) return <Splash />

  const pages = flatten(NAV[user.role] || NAV.Membre)
  const current = pages.find(p => p.id === route) || pages[0]
  const Page = current.el

  return (
    <Shell nav={pages} page={current.id} setPage={go}>
      <div className="animate-fade-in"><Page /></div>
    </Shell>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
