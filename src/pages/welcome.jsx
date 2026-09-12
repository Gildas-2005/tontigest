import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { uid, now } from '../lib/utils'
import { Button, Card, Badge } from '../components/ui'
import { MockPaiement, MockTresorerie, MockTour, OrbitRing, FloatBadge } from '../components/art'
import {
  Wallet, Users, ArrowRight, Check, Crown,
  Settings, Rocket, Building2,
  HandCoins, CalendarDays, FileText, Scale, Smartphone, PiggyBank,
  ShieldCheck, Zap, Receipt, TrendingUp, Coins,
} from '../components/icons'

/* ============================ LANDING PUBLIQUE (avant connexion) ============================ */
export function Landing({ onLogin, onSignup }) {
  const roles = [
    { icon: <Crown className="h-5 w-5" />, titre: 'Président', points: ['Pilotage de la tontine et du bureau', 'Sanctions, rapports et décisions', 'Communication à tous les membres'] },
    { icon: <Wallet className="h-5 w-5" />, titre: 'Trésorier', points: ['Encaissements Orange Money, MoMo, carte, espèces', 'Caisse multi-comptes et virements internes', 'Prêts, épargne, aides et intérêts'] },
    { icon: <FileText className="h-5 w-5" />, titre: 'Secrétaire', points: ['Séances et pointage des présences', 'Procès-verbaux et convocations', 'Archives du club en PDF'] },
    { icon: <Scale className="h-5 w-5" />, titre: 'Commissaire', points: ['Audit des transactions', 'Vue complète par membre', 'Signalement d\'anomalies'] },
  ]

  const features = [
    { icon: <Smartphone className="h-5 w-5" />, t: 'Paiement mobile', d: 'Orange Money, MTN MoMo, carte bancaire ou espèces — chaque cotisation génère un reçu PDF pour le membre.' },
    { icon: <Wallet className="h-5 w-5" />, t: 'Caisses du club', d: 'Caisse de cotisation et caisse d\u2019épargne par défaut, caisses complémentaires (annuelle, scolaire…) — tout en francs CFA, avec virements internes tracés.' },
    { icon: <CalendarDays className="h-5 w-5" />, t: 'Tours de rôle', d: 'Ordre de passage rotatif généré automatiquement et calendrier mois par mois des bénéficiaires.' },
    { icon: <HandCoins className="h-5 w-5" />, t: 'Prêts & garants', d: 'Demandes avec deux garants actifs, décaissement contrôlé par le solde de caisse, remboursements et intérêts suivis.' },
    { icon: <PiggyBank className="h-5 w-5" />, t: 'Épargne solidaire', d: 'Épargne individuelle avec montants bloqués, groupes d\'épargne et redistribution des intérêts au prorata.' },
    { icon: <CalendarDays className="h-5 w-5" />, t: 'Séances & présences', d: 'Convocations, pointage des présences et procès-verbaux générés automatiquement à chaque séance.' },
    { icon: <Receipt className="h-5 w-5" />, t: 'Documents en PDF', d: 'Reçus, PV de séance, listes de présence, bordereaux bancaires et rapports financiers — générés en un clic.' },
    { icon: <TrendingUp className="h-5 w-5" />, t: 'Rapports & clôtures', d: 'Rapport mensuel, arrêté des comptes, validation par le commissaire et archivage.' },
    { icon: <ShieldCheck className="h-5 w-5" />, t: 'Audit & sécurité', d: 'Comptes par rôle, double authentification, verdicts de conformité et journal complet des opérations.' },
  ]

  const etapes = [
    { n: '1', ic: <Building2 className="h-4 w-4" />, titre: 'Créez votre club', texte: 'Nom, ville, cotisation et fréquence — l\'espace du club est prêt immédiatement.' },
    { n: '2', ic: <Crown className="h-4 w-4" />, titre: 'Nommez le bureau', texte: 'Président et Trésorier obligatoires, Secrétaire et Commissaire recommandés.' },
    { n: '3', ic: <Users className="h-4 w-4" />, titre: 'Invitez les membres', texte: 'Partagez le code du club — les membres rejoignent et suivent leur dossier.' },
    { n: '4', ic: <Rocket className="h-4 w-4" />, titre: 'Démarrez la tontine', texte: 'L\'ordre de passage se construit automatiquement, mois après mois.' },
  ]

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="#" className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="TontiGest" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div className="leading-tight">
              <p className="font-display text-lg font-bold text-brand-800">Tonti<span className="text-gold-500">Gest</span></p>
              <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-ink/40">Gestion de tontine</p>
            </div>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/60 md:flex">
            <a href="#fonctions" className="transition hover:text-brand-600">Fonctionnalités</a>
            <a href="#roles" className="transition hover:text-brand-600">Espaces</a>
            <a href="#demarrage" className="transition hover:text-brand-600">Démarrage</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-brand-50 hover:text-brand-700 cursor-pointer">Se connecter</button>
            <Button variant="gold" size="sm" onClick={onSignup}>Créer un club</Button>
          </div>
        </div>
      </header>

      {/* ===== Hero — clair, aéré, accents or ===== */}
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 -top-16 h-96 w-96 rounded-full bg-gold-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand-100/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          {/* Colonne gauche : message + CTA */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-gold-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold-700 shadow-sm">
              <Zap className="h-3.5 w-3.5" /> Tontines, associations & groupes d&apos;épargne
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.12] text-ink sm:text-5xl">
              La tontine de votre club,<br /><span className="gold-text">gérée comme une banque</span>.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink/60 sm:text-base">
              Cotisations, tours de rôle, prêts, épargne, séances et audit — TontiGest
              organise toute la vie de votre tontine. Chaque franc encaissé est tracé,
              chaque tour est planifié, chaque document est généré.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="gold" size="lg" onClick={onSignup}>Créer mon club <ArrowRight className="h-4 w-4" /></Button>
              <button onClick={onLogin} className="rounded-xl border border-brand-200 bg-white px-6 py-3.5 text-sm font-semibold text-brand-800 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 cursor-pointer">J&apos;ai déjà un compte</button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-ink/50">
              {['Orange Money', 'MTN MoMo', 'Carte bancaire', 'Espèces'].map(m => (
                <span key={m} className="inline-flex items-center gap-1.5"><Check size={13} className="text-gold-500" /> {m}</span>
              ))}
            </div>
          </div>

          {/* Colonne droite : mocks sur carte verte — contraste élégant */}
          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="absolute inset-x-[-2rem] inset-y-[-2.5rem] rotate-2 rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 shadow-[0_24px_64px_-24px_rgba(4,34,15,.45)]" />
            <div className="absolute inset-x-[-2rem] inset-y-[-2.5rem] -rotate-1 rounded-[2.5rem] border-2 border-gold-300/40" />
            <OrbitRing size={440} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60" />
            <div className="relative flex flex-col items-center gap-5 py-4">
              <div className="animate-fade-up" style={{ animationDelay: '.15s' }}><MockTresorerie /></div>
              <div className="flex gap-5">
                <div className="animate-fade-up" style={{ animationDelay: '.35s' }}><MockPaiement /></div>
                <div className="animate-fade-up" style={{ animationDelay: '.55s' }}><MockTour /></div>
              </div>
            </div>
            <FloatBadge className="-left-8 top-6" delay="-2s">
              <Check size={18} className="text-emerald-300" />
            </FloatBadge>
            <FloatBadge className="-right-6 bottom-16" delay="-5s">
              <Coins size={18} className="text-gold-300" />
            </FloatBadge>
          </div>
        </div>
      </section>

      {/* ===== Confiance ===== */}
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <div className="grid gap-4 rounded-3xl border border-gold-200 bg-gradient-to-br from-gold-50 via-white to-white p-7 shadow-[0_2px_4px_rgba(77,56,0,.04),0_24px_48px_-24px_rgba(77,56,0,.15)] sm:grid-cols-2 lg:grid-cols-4 stagger">
          {[
            { n: '5', label: 'espaces de travail', sub: 'Président · Trésorier · Secrétaire · Commissaire · Membre' },
            { n: '12', label: 'modules métier', sub: 'Cotisations, prêts, épargne, audit…' },
            { n: '9', label: 'documents PDF', sub: 'Reçus, PV, rapports, bordereaux…' },
            { n: '100%', label: 'traçabilité', sub: 'Journal de caisse et audit permanents' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl font-bold gold-text">{s.n}</p>
              <p className="mt-1 text-sm font-bold">{s.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink/50">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Rôles ===== */}
      <section id="roles" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-600">Un espace par rôle</p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Chaque membre du bureau a son poste de travail</h2>
          <p className="mt-3 text-sm text-ink/60">Le Président pilote, le Trésorier encaisse, le Secrétaire documente, le Commissaire contrôle — et chaque membre suit sa participation.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4 stagger">
          {roles.map((r, i) => (
            <Card key={r.titre} className="group h-full transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-300 hover:shadow-[0_20px_40px_-16px_rgba(154,118,0,.22)]">
              <div className="flex items-center justify-between">
                <span className={`grid h-12 w-12 place-items-center rounded-full shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${i % 2 === 0 ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-white' : 'bg-gradient-to-br from-brand-400 to-brand-700 text-white'}`}>{r.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-[.2em] text-ink/25">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{r.titre}</h3>
              <ul className="mt-3 space-y-2">
                {r.points.map(p => <li key={p} className="flex items-start gap-2 text-xs leading-relaxed text-ink/65"><Check size={14} className="mt-0.5 shrink-0 text-gold-500" /> {p}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== Fonctionnalités ===== */}
      <section id="fonctions" className="scroll-mt-20 border-y border-gold-200/60 bg-gradient-to-b from-gold-50/60 via-white to-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-600">Fonctionnalités</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Tout le cycle de la tontine, de la cotisation à l&apos;audit</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {features.map((f, i) => (
              <div key={f.t} className="group rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(4,34,15,.05),0_8px_24px_-12px_rgba(4,34,15,.12)] transition-all duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-[0_16px_36px_-16px_rgba(154,118,0,.28)]">
                <div className="flex items-start justify-between">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110 ${i % 2 === 0 ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-white' : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'}`}>{f.icon}</span>
                </div>
                <h3 className="mt-3.5 font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/60">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Démarrage ===== */}
      <section id="demarrage" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-600">Démarrage</p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Votre tontine démarre en quatre étapes</h2>
        </div>
        <div className="relative mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4 stagger">
          <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent xl:block" />
          {etapes.map(e => (
            <div key={e.n} className="relative rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(4,34,15,.05),0_8px_24px_-12px_rgba(4,34,15,.12)] transition-all duration-300 hover:-translate-y-1 hover:border-gold-300">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-display text-sm font-bold text-white shadow-md">{e.n}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">{e.ic}</span>
              </div>
              <h3 className="mt-4 font-semibold">{e.titre}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink/60">{e.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA final — bandeau or ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 py-20 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[.08] [background-image:repeating-linear-gradient(115deg,transparent_0_10px,rgba(255,255,255,.6)_10px_11px,transparent_11px_22px)]" />
        <div className="absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-white/15 blur-3xl animate-float" />
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-brand-600/25 blur-3xl animate-float" style={{ animationDelay: '-4s' }} />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <img src="/logo.jpeg" alt="TontiGest" className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-2xl ring-4 ring-white/40 animate-float" />
          <h2 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">Prêt à digitaliser votre <span className="underline decoration-white/40 decoration-4 underline-offset-4">tontine</span> ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85">
            Créez le club, nommez le bureau, invitez les membres — le premier tour de rôle se planifie tout seul.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" className="!bg-brand-700 hover:!bg-brand-800 shadow-xl" icon={<Rocket className="h-4 w-4" />} onClick={onSignup}>Créer mon club maintenant</Button>
            <button onClick={onLogin} className="rounded-xl border border-white/40 bg-white/15 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 cursor-pointer">J&apos;ai déjà un compte</button>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-black/5 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="TontiGest" className="h-9 w-9 rounded-xl object-cover" />
            <p className="text-sm font-semibold">TontiGest — Gestion de tontine</p>
          </div>
          <p className="text-xs text-ink/45">Cotisations · Tours · Prêts · Épargne · Séances · Audit · Rapports</p>
        </div>
      </footer>
    </div>
  )
}

/* ============================ ACCUEIL / CONFIG (après connexion, club en préparation) ============================ */
export function Welcome({ onNavigate }) {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine || {}
  const president = db.membres.find(m => m.role === 'President')
  const tresorier = db.membres.find(m => m.role === 'Tresorier')
  const secretaire = db.membres.find(m => m.role === 'Secretaire')
  const commissaire = db.membres.find(m => m.role === 'Commissaire')

  const parametrageOk = (t.montantCotisation > 0) && !!t.dateDebut
  const bureauOk = !!president && !!tresorier

  const etapes = [
    { titre: 'Créer l\'association', fait: true, detail: t.nom || 'Association créée', cta: null, icon: <Building2 className="h-4 w-4" /> },
    { titre: 'Nommer le bureau', fait: bureauOk, detail: tresorier ? `Trésorier : ${tresorier.nom}` : 'Président et Trésorier sont obligatoires pour démarrer', cta: 'bureau', icon: <Crown className="h-4 w-4" /> },
    { titre: 'Paramétrer la tontine', fait: parametrageOk, detail: parametrageOk ? `Cotisation ${t.montantCotisation} · début ${t.dateDebut}` : 'Définissez la cotisation et la date de début', cta: 'tontine', icon: <Settings className="h-4 w-4" /> },
    { titre: 'Démarrer la tontine', fait: t.statut === 'Active', detail: bureauOk ? 'Prêt à lancer le premier tour' : 'Complétez le bureau pour débloquer le démarrage', cta: null, icon: <Rocket className="h-4 w-4" /> },
  ]

  const demarrer = () => {
    if (!bureauOk) return toast('Nommez au moins un Président et un Trésorier avant de démarrer', 'error')
    setDb(d => ({
      ...d,
      tontine: { ...d.tontine, statut: 'Active' },
      /* Parité avec TontinePage : notification réelle à tous les membres actifs. */
      notifications: [...d.notifications, ...d.membres.filter(m => m.statut === 'Actif').map(m => ({
        id: uid('nt'), pour: m.id, titre: 'Vie de la tontine',
        message: `La tontine ${d.tontine?.nom || ''} est démarrée — le cycle des tours commence.`,
        lu: false, date: now(),
      }))],
    }))
    toast('La tontine est démarrée — bon premier tour !')
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-6 text-white sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#07331a,#12632a_50%,#187830)] bg-[length:200%_200%] animate-gradient" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-gold-500/15 blur-3xl animate-float" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-300">Bienvenue {user?.nom?.split(' ')[0] || ''} · {BUREAU_LABELS[user?.role]}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Préparons <span className="gold-text">{t.nom || 'votre association'}</span></h1>
          <p className="mt-2 max-w-xl text-sm text-brand-100/70">Suivez les étapes ci-dessous. La tontine démarrera dès que le bureau sera complet et les paramètres renseignés.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Mise en route" subtitle="Checklist de préparation du club" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {etapes.map((e, i) => (
              <div key={e.titre} className="flex items-start gap-3 rounded-xl px-3 py-3.5 transition hover:bg-brand-50/60">
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${e.fait ? 'bg-brand-100 text-brand-700' : 'bg-black/5 text-ink/40'}`}>
                  {e.fait ? <Check className="h-4 w-4" /> : e.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{i + 1}. {e.titre}</p>
                  <p className="mt-0.5 text-xs text-ink/55">{e.detail}</p>
                </div>
                {e.fait
                  ? <Badge tone="green">Fait</Badge>
                  : e.cta
                    ? <Button size="sm" variant="outline" onClick={() => onNavigate(e.cta)}>Ouvrir</Button>
                    : <Badge tone="amber">À faire</Badge>}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card title="Bureau exécutif" subtitle="Deux postes obligatoires, deux recommandés">
            <div className="space-y-2.5 text-sm">
              {[['Président', president, true], ['Trésorier', tresorier, true], ['Secrétaire', secretaire, false], ['Commissaire', commissaire, false]].map(([label, m, requis]) => (
                <div key={label} className="flex items-center justify-between gap-2 rounded-xl bg-brand-50/70 px-3 py-2.5">
                  <span className="font-semibold text-brand-900">{label} {requis ? <span className="text-[10px] font-bold uppercase text-red-500">requis</span> : <span className="text-[10px] font-bold uppercase text-ink/40">recommandé</span>}</span>
                  {m ? <Badge tone="green">{m.nom}</Badge> : <Badge tone={requis ? 'red' : 'gray'}>Vacant</Badge>}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Démarrage">
            <p className="mb-4 text-xs text-ink/55">
              {bureauOk
                ? 'Le bureau est complet. Vous pouvez démarrer la tontine et lancer le premier tour.'
                : 'Nommez au moins un Président et un Trésorier pour activer le démarrage.'}
            </p>
            <Button variant="gold" className="w-full" disabled={!bureauOk} onClick={demarrer} icon={<Rocket className="h-4 w-4" />}>Démarrer la tontine</Button>
            <Button variant="outline" className="mt-2 w-full" onClick={() => onNavigate('membres')} icon={<Users className="h-4 w-4" />}>Ajouter des membres</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
