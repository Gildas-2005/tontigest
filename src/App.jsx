import { useEffect, useState } from 'react'
import { StoreProvider, useAuth, useStore } from './lib/store'
import { useServiceWorker } from './lib/pwa'
import { Button } from './components/ui'
import { Shell } from './components/layout'
import AuthPage, { Splash, ClubSetup, Onboarding } from './pages/auth'
import { Landing, Welcome } from './pages/welcome'
import { ProfilPage } from './pages/profil'
import { PresidentHome, TontinePage, OrdrePage, MembresPage, BureauPage, SanctionsPage, RapportsPage, AlertesPage, DiffusionPage } from './pages/president'
import { TresorierHome, CotisationsPage, CaissePage, BanqueOpsPage, PenalitesPage, EpargnePage, PretsPage, InteretsPage, AidesPage, RapportsFinPage } from './pages/tresorier'
import { SecretariatHome, SeancesPage, ConvocationsPage, ParrainagePage, ReclamationsPage, ArchivesPage } from './pages/secretaire'
import { AuditHome, AuditTransactionsPage, AuditMembresPage, AuditRapportsPage, FraudePage } from './pages/commissaire'
import { MembreHome, PayerPage, HistoriquePage, CalendrierPage, PretsMembrePage, AidesMembrePage, EpargneMembrePage } from './pages/membre'
import { AdminHome, AdminClubs, AdminUsers } from './pages/admin'
import {
  LayoutDashboard, User, Settings, CalendarDays, Users, Crown, Scale, FileText,
  AlertTriangle, Megaphone, CircleDollarSign, Wallet, Landmark, PiggyBank,
  HandCoins, TrendingUp, Heart, Home, Smartphone, Receipt,
  Mail, Handshake, MessageSquare, Archive, UsersRound, FileSearch, ShieldAlert,
  Building2,
} from './components/icons'

const ic = (C) => <C size={18} />

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
      { id: 'accueil', label: 'Tableau de bord', icon: ic(LayoutDashboard), el: PresidentHome },
      { id: 'profil', label: 'Mon profil', icon: ic(User), el: ProfilPage },
    ]},
    { group: 'Pilotage', items: [
      { id: 'tontine', label: 'Ma tontine', icon: ic(Settings), el: TontinePage },
      { id: 'ordre', label: 'Calendrier de passage', icon: ic(CalendarDays), el: OrdrePage },
      { id: 'membres', label: 'Membres', icon: ic(Users), el: MembresPage },
      { id: 'bureau', label: 'Bureau exécutif', icon: ic(Crown), el: BureauPage },
      { id: 'sanctions', label: 'Sanctions', icon: ic(Scale), el: SanctionsPage },
    ]},
    { group: 'Contrôle', items: [
      { id: 'rapports', label: 'Rapports financiers', icon: ic(FileText), el: RapportsPage },
      { id: 'alertes', label: 'Alertes & anomalies', icon: ic(AlertTriangle), el: AlertesPage },
      { id: 'diffusion', label: 'Notification de masse', icon: ic(Megaphone), el: DiffusionPage },
    ]},
  ],
  Tresorier: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Tableau de bord', icon: ic(LayoutDashboard), el: TresorierHome },
      { id: 'profil', label: 'Mon profil', icon: ic(User), el: ProfilPage },
    ]},
    { group: 'Trésorerie', items: [
      { id: 'cotisations', label: 'Cotisations', icon: ic(CircleDollarSign), el: CotisationsPage },
      { id: 'caisse', label: 'Caisses du club', icon: ic(Wallet), el: CaissePage },
      { id: 'banque', label: 'Banque & rapprochement', icon: ic(Landmark), el: BanqueOpsPage },
      { id: 'penalites', label: 'Pénalités & amendes', icon: ic(Scale), el: PenalitesPage },
    ]},
    { group: 'Services', items: [
      { id: 'epargne', label: 'Épargne', icon: ic(PiggyBank), el: EpargnePage },
      { id: 'prets', label: 'Prêts internes', icon: ic(HandCoins), el: PretsPage },
      { id: 'interets', label: 'Intérêts & redistribution', icon: ic(TrendingUp), el: InteretsPage },
      { id: 'aides', label: 'Aides sociales', icon: ic(Heart), el: AidesPage },
    ]},
    { group: 'Reporting', items: [
      { id: 'rapports-fin', label: 'Rapports & clôtures', icon: ic(FileText), el: RapportsFinPage },
    ]},
  ],
  Secretaire: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Tableau de bord', icon: ic(LayoutDashboard), el: SecretariatHome },
      { id: 'profil', label: 'Mon profil', icon: ic(User), el: ProfilPage },
    ]},
    { group: 'Vie du club', items: [
      { id: 'seances', label: 'Séances & PV', icon: ic(CalendarDays), el: SeancesPage },
      { id: 'convocations', label: 'Convocations', icon: ic(Mail), el: ConvocationsPage },
      { id: 'parrainage', label: 'Parrainages', icon: ic(Handshake), el: ParrainagePage },
      { id: 'reclamations', label: 'Réclamations & litiges', icon: ic(MessageSquare), el: ReclamationsPage },
      { id: 'archives', label: 'Archives & exports', icon: ic(Archive), el: ArchivesPage },
    ]},
  ],
  Commissaire: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Tableau de bord audit', icon: ic(LayoutDashboard), el: AuditHome },
      { id: 'profil', label: 'Mon profil', icon: ic(User), el: ProfilPage },
    ]},
    { group: 'Audit', items: [
      { id: 'membres-audit', label: 'Suivi par membre', icon: ic(UsersRound), el: AuditMembresPage },
      { id: 'transactions', label: 'Transactions & pièces', icon: ic(FileSearch), el: AuditTransactionsPage },
      { id: 'rapports-audit', label: 'Rapports financiers', icon: ic(FileText), el: AuditRapportsPage },
      { id: 'fraude', label: 'Signaler une anomalie', icon: ic(ShieldAlert), el: FraudePage },
    ]},
  ],
  Membre: [
    { group: 'Général', items: [
      { id: 'accueil', label: 'Mon espace', icon: ic(Home), el: MembreHome },
      { id: 'profil', label: 'Mon profil', icon: ic(User), el: ProfilPage },
    ]},
    { group: 'Mes opérations', items: [
      { id: 'payer', label: 'Payer ma cotisation', icon: ic(Smartphone), el: PayerPage },
      { id: 'historique', label: 'Historique & reçus', icon: ic(Receipt), el: HistoriquePage },
      { id: 'calendrier', label: 'Calendrier de passage', icon: ic(CalendarDays), el: CalendrierPage },
    ]},
    { group: 'Mes services', items: [
      { id: 'prets', label: 'Mes prêts', icon: ic(HandCoins), el: PretsMembrePage },
      { id: 'aides', label: 'Aides sociales', icon: ic(Heart), el: AidesMembrePage },
      { id: 'epargne', label: 'Mon épargne', icon: ic(PiggyBank), el: EpargneMembrePage },
    ]},
  ],
  SuperAdmin: [
    { group: 'Plateforme', items: [
      { id: 'accueil', label: 'Vue globale', icon: ic(LayoutDashboard), el: AdminHome },
      { id: 'clubs', label: 'Clubs', icon: ic(Building2), el: AdminClubs },
      { id: 'utilisateurs', label: 'Utilisateurs', icon: ic(Users), el: AdminUsers },
    ]},
  ],
}

const flatten = (nav) => nav.flatMap(g => g.items.map(({ id, label, icon, el }) => ({ id, label, icon, group: g.group, el })))

function AppInner() {
  const { user, authReady, viewRole, signOut } = useAuth()
  const { db } = useStore()
  useServiceWorker()
  const [route, go] = useRoute()
  const [splash, setSplash] = useState(true)
  const [gate, setGate] = useState(null) // null = landing | 'login' | 'signup'
  const [loadWait, setLoadWait] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1600)
    return () => clearTimeout(t)
  }, [])
  // Si les données du club tardent (API arrêtée, MySQL injoignable), on prévient.
  useEffect(() => {
    if (!user || user.isSuperAdmin || !user.clubId || db.tontine) return
    const t = setTimeout(() => setLoadWait(true), 6000)
    return () => clearTimeout(t)
  }, [user, db.tontine])

  if (splash || !authReady) return <Splash />
  if (!user) return gate
    ? <AuthPage key={gate} initialMode={gate === 'signup' ? 'signup' : 'login'} />
    : <Landing onLogin={() => setGate('login')} onSignup={() => setGate('signup')} />
  if (!user.isSuperAdmin && !user.clubId) return <ClubSetup />
  if (!user.isSuperAdmin && !user.onboardingDone) return <Onboarding />
  if (!user.isSuperAdmin && !db.tontine) {
    if (loadWait) return (
      <div className="grid min-h-screen place-items-center bg-cream px-6">
        <div className="max-w-md rounded-2xl border border-black/5 bg-white p-8 text-center shadow-xl">
          <p className="font-display text-xl font-semibold text-ink">Impossible de charger les données du club</p>
          <p className="mt-2 text-sm text-ink/60">
            Vérifiez que le serveur TontiGest et MySQL sont bien démarrés, puis actualisez la page.
            Si le problème persiste, reconnectez-vous.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>Actualiser</Button>
            <Button variant="ghost" onClick={signOut}>Se déconnecter</Button>
          </div>
        </div>
      </div>
    )
    return <Splash />
  }

  const pages = flatten(NAV[viewRole] || NAV.Membre)
  const current = pages.find(p => p.id === route) || pages[0]

  // Club en préparation : le Président voit l'écran de mise en route sur l'accueil.
  const enPreparation = !user.isSuperAdmin && db.tontine?.statut === 'Preparation' && user.role === 'President' && current.id === 'accueil'

  return (
    <Shell nav={pages} page={current.id} setPage={go}>
      <div className="animate-fade-in">
        {enPreparation ? <Welcome onNavigate={go} /> : <current.el />}
      </div>
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
