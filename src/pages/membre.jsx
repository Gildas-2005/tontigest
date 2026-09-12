import { useEffect, useRef, useState } from 'react'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { api } from '../lib/api'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Table, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem, Progress } from '../components/ui'
import { Bars } from '../components/charts'
import { fmtXAF, fmtDate, today, now, uid, sum, byId, pct, monthKey, monthLabel, cls, runValidators, vRequired, vMinLen } from '../lib/utils'
import { pdfRecu } from '../lib/pdf'
import {
  Gift, Bell, CreditCard, Check, Printer, Receipt, HandCoins,
  HandHelping, Flower2, HeartHandshake, Baby, Stethoscope, Users,
  TrendingUp, Sparkles, Plus, ArrowRight, Smartphone,
  PiggyBank, Lock, Banknote, CalendarDays, MessageSquare, Send,
  Scale, TriangleAlert, CircleCheck,
} from '../components/icons'

/* Mois estimé = mois de dateDebut + offset (fréquence mensuelle) */
const moisDe = (iso, offset = 0) => {
  const d = new Date(iso + 'T12:00:00')
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const AIDE_ICONS = {
  Deces: <Flower2 size={22} className="text-violet-500" />,
  Mariage: <HeartHandshake size={22} className="text-violet-500" />,
  Naissance: <Baby size={22} className="text-violet-500" />,
  Maladie: <Stethoscope size={22} className="text-violet-500" />,
}

const notifyMe = (id, titre, message) => ({ id: uid('nt'), pour: id, titre, message, lu: false, date: now() })

/* ============================ ACCUEIL MEMBRE ============================ */
export function MembreHome() {
  const { db } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const me = byId(db.membres, user.id)

  const mesCotis = db.cotisations.filter(c => c.membreId === user.id)
  const validées = mesCotis.filter(c => c.statut === 'Validée')
  const totalCotisé = sum(validées, c => c.montant)
  const ep = db.epargneIndividuelle.find(e => e.membreId === user.id)
  const interets = sum(db.interetsRedistribues.flatMap(i => i.parts.filter(p => p.membreId === user.id)), p => p.montant)
  const position = db.ordrePassage.indexOf(user.id) + 1

  /* Cotisation du mois : uniquement si la période courante est couverte
     (l'ancien `|| monthKey(c.date)` comptait un rattrapage d'un autre mois). */
  const cotisMois = mesCotis.find(c => c.periode === monthKey())
  const statutMois = cotisMois?.statut || null

  const parMois = {}
  validées.forEach(c => { parMois[monthKey(c.date)] = (parMois[monthKey(c.date)] || 0) + c.montant })
  const cles = Object.keys(parMois).sort().slice(-6)
  const barsData = cles.map(k => ({ label: monthLabel(k).split(' ')[0].slice(0, 4), value: parMois[k] }))

  const activites = [
    ...mesCotis.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(c => ({
      id: c.id, icon: <CreditCard size={16} className="text-brand-700" />, title: `Cotisation ${c.periode} — ${fmtXAF(c.montant)}`,
      sub: `${c.methode} · réf. ${c.ref} · ${fmtDate(c.date)}`,
      right: <Badge tone={statusTone(c.statut)}>{c.statut}</Badge>, date: c.date,
    })),
    ...db.notifications.filter(n => n.pour === user.id).slice(-4).reverse().map(n => ({
      id: n.id, icon: <Bell size={16} className="text-sky-600" />, title: n.titre, sub: n.message,
      right: !n.lu && <Badge tone="brand" dot>Nouveau</Badge>, date: n.date,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Hero bandeau */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-6 text-white sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#07331a,#12632a_50%,#187830)] bg-[length:200%_200%] animate-gradient" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl animate-float" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-300">Espace Membre · {BUREAU_LABELS[user.role]}</p>
            <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Bonjour {user.nom.split(' ')[0]}, <span className="gold-text">{t.nom}</span> vous attend.</h1>
            <p className="mt-2 max-w-xl text-sm text-brand-100/70">Cotisation {fmtXAF(t.montantCotisation)} {t.frequence.toLowerCase()} · Membre depuis le {fmtDate(me?.dateAdhesion)}</p>
            <div className="mt-4">
              {statutMois === 'Validée' && <Badge tone="green" dot>Cotisation du mois à jour</Badge>}
              {statutMois === 'En attente' && <Badge tone="amber" dot>Cotisation du mois en attente de validation</Badge>}
              {!statutMois && <Badge tone="red" dot>Cotisation du mois non réglée</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-gold-400/30 bg-white/5 px-6 py-5 backdrop-blur">
            <Avatar name={user.nom} size="lg" ring />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">Solde épargne individuelle</p>
              <p className="font-display text-2xl font-semibold">{fmtXAF(ep?.solde || 0)}</p>
              <p className="mt-1 text-xs text-brand-100/60">Prochain tour : {position ? `${position}ᵉ position — ${monthLabel(moisDe(t.dateDebut, position - 1))}` : 'non planifié'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat large tone="gold" label="Total cotisé" value={fmtXAF(totalCotisé)} sub={`${validées.length} cotisation(s) validée(s)`} icon={<Banknote size={20} />} />
        <Stat tone="brand" label="Solde épargne" value={fmtXAF(ep?.solde || 0)} sub={ep?.bloquee ? `dont ${fmtXAF(ep.bloquee)} bloqués` : 'Épargne libre'} icon={<PiggyBank size={18} />} />
        <Stat tone="brand" label="Intérêts reçus" value={fmtXAF(interets)} sub={`${db.interetsRedistribues.length} redistribution(s) du trésorier`} icon={<Gift size={18} />} />
        <Stat tone="brand" label="Mon prochain tour" value={position ? `${position}ᵉ` : '—'} sub={position ? `Estimé : ${monthLabel(moisDe(t.dateDebut, position - 1))}` : 'Hors calendrier'} icon={<CalendarDays size={18} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card title="Mes cotisations" subtitle="Historique validé (6 derniers mois)" className="xl:col-span-2">
          {barsData.length ? <Bars data={barsData} /> : <EmptyState icon={<CreditCard size={16} />} title="Aucune cotisation validée" sub="Vos paiements validés apparaîtront ici." />}
        </Card>
        <Card title="Mes dernières activités" subtitle="Paiements et notifications récentes" className="xl:col-span-3" pad={false}>
          <div className="p-3">
            {activites.length === 0 && <EmptyState title="Aucune activité pour le moment" />}
            {activites.map(a => <RowItem key={a.id} icon={a.icon} title={a.title} sub={a.sub} right={a.right} />)}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================ PAIEMENT ============================ */
const METHODES = [
  { id: 'Orange Money', key: 'OM', label: 'Orange Money', icon: <span className="text-sm font-black">OM</span>, grad: 'from-orange-500 to-orange-600', hint: 'USSD #150# — frais 0 FCFA' },
  { id: 'MTN MoMo', key: 'MoMo', label: 'MTN MoMo', icon: <span className="text-sm font-black">MoMo</span>, grad: 'from-yellow-400 to-amber-500', hint: 'USSD *126# — frais 0 FCFA' },
  { id: 'Carte', label: 'Carte bancaire', icon: <CreditCard size={22} className="text-white" />, grad: 'from-brand-600 to-brand-900', hint: 'Visa · Mastercard — sécurisé 3D Secure' },
]

export function PayerPage({ routeParams }) {
  const { db, reloadClub, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const me = byId(db.membres, user.id)
  const [methode, setMethode] = useState(null)
  const [phase, setPhase] = useState('form') // form | processing | checkout | confirm-sim | success
  const [form, setForm] = useState({ montant: '', tel: '' })
  const [errors, setErrors] = useState({})
  const [tx, setTx] = useState(null) // { ref, mode, paymentUrl, notice }
  const [integr, setIntegr] = useState(null)
  const autoRef = useRef(false)

  /* État réel de la passerelle — affiché honnêtement. */
  useEffect(() => { api.integrations().then(setIntegr).catch(() => {}) }, [])

  /* Retour de la passerelle (successUrl/errorUrl → #/payer?status=…&ref=…) :
     auto-vérification immédiate du statut réel auprès du serveur. */
  useEffect(() => {
    if (autoRef.current) return
    const status = routeParams?.status
    const ref = routeParams?.ref
    if (!ref || !status) return
    autoRef.current = true
    ;(async () => {
      setTx((cur) => cur ?? { ref, mode: 'retour' })
      setPhase('processing')
      try {
        const { transaction } = await api.paymentStatus(ref)
        if (transaction.status === 'success') {
          await reloadClub()
          setPhase('success')
          toast('Paiement confirmé par la passerelle')
        } else if (status === 'error' || transaction.status === 'failed') {
          setPhase('form')
          setTx(null)
          toast('Paiement refusé ou annulé — réessayez', 'error')
        } else {
          setPhase('checkout')
          setTx({ ref, mode: 'retour' })
          toast('Paiement encore en attente côté opérateur — cliquez sur « J\'ai payé — vérifier »', 'info')
        }
      } catch (e) {
        setPhase('form')
        toast(e.message, 'error')
      }
    })()
  }, [routeParams, reloadClub, toast])

  const mesCotis = db.cotisations.filter(c => c.membreId === user.id).sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const dejaPayeCeMois = mesCotis.some(c => c.periode === monthKey() && c.statut !== 'Rejetée')
  const payLive = !!integr?.payment?.configured

  const ouvrir = (m) => {
    setMethode(m)
    setPhase('form')
    setForm({ montant: t.montantCotisation, tel: me?.tel || '' })
    setErrors({})
    setTx(null)
  }

  const validerMontant = () => {
    const errs = {}
    if (!(+form.montant > 0)) errs.montant = 'Le montant doit être supérieur à 0.'
    else if (+form.montant < t.montantCotisation) errs.montant = `La cotisation officielle est de ${fmtXAF(t.montantCotisation)}.`
    if (methode.id !== 'Carte') {
      if (!form.tel.trim()) errs.tel = 'Le numéro de téléphone est obligatoire.'
      else if (!/^\+?\d[\d\s]{7,}$/.test(form.tel.trim())) errs.tel = 'Numéro de téléphone invalide (ex : +237 6 55 00 11 22).'
    }
    setErrors(errs)
    return !Object.values(errs).some(Boolean)
  }

  /* --- Étape 1 : initier la transaction côté serveur --- */
  const payer = async () => {
    if (dejaPayeCeMois) return toast(`Votre cotisation de ${monthLabel(monthKey())} est déjà enregistrée.`, 'info')
    if (!validerMontant()) return toast('Corrigez les champs signalés avant de payer', 'error')
    setPhase('processing')
    try {
      const res = await api.initiatePayment({
        clubId: user.clubId || db.tontine?.id,
        membreId: user.id,
        montant: +form.montant,
        methode: methode.key || methode.id,
        tel: form.tel,
        periode: monthKey(),
      })
      setTx(res)
      if (res.paymentUrl) {
        setPhase('checkout')
        // Le membre paie sur la page de la passerelle ; on vérifie le statut à son retour.
        window.open(res.paymentUrl, '_blank')
      } else {
        setPhase('confirm-sim')
      }
    } catch (e) {
      setPhase('form')
      toast(e.message, 'error')
    }
  }

  /* --- Mode simulation : le membre confirme qu'il a payé (validation trésorier conservée) --- */
  const confirmerSimulation = async () => {
    if (!tx?.ref) return
    setPhase('processing')
    try {
      await api.simulatePayment(tx.ref)
      await reloadClub()
      setPhase('success')
      toast('Paiement enregistré — en attente de validation du trésorier')
    } catch (e) {
      setPhase('confirm-sim')
      toast(e.message, 'error')
    }
  }

  /* --- Après retour de la passerelle : vérifier le statut réel --- */
  const verifierStatut = async () => {
    if (!tx?.ref) return
    setPhase('processing')
    try {
      const { transaction } = await api.paymentStatus(tx.ref)
      if (transaction.status === 'success') {
        await reloadClub()
        setPhase('success')
        toast('Paiement confirmé par la passerelle')
      } else if (transaction.status === 'failed') {
        setPhase('form')
        setTx(null)
        toast('Paiement refusé par la passerelle — réessayez', 'error')
      } else {
        toast('Paiement encore en attente côté opérateur — vérifiez à nouveau dans un instant', 'info')
        setPhase('checkout')
      }
    } catch (e) {
      setPhase('checkout')
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Payer ma cotisation" sub={`Réglez votre cotisation ${t.frequence.toLowerCase()} — mobile money ou carte bancaire.`}
        actions={<Badge tone={mesCotis.some(c => c.periode === monthKey() && c.statut !== 'Rejetée') ? 'green' : 'amber'} dot>
          {mesCotis.some(c => c.periode === monthKey() && c.statut !== 'Rejetée') ? `Période ${monthLabel(monthKey())} réglée` : `Période ${monthLabel(monthKey())} en cours`}
        </Badge>} />

      {/* Bandeau d'état de la passerelle — toujours honnête */}
      <div className={cls('rounded-2xl border px-5 py-3.5 text-xs font-semibold flex items-center gap-2.5',
        payLive ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-amber-300 bg-amber-50 text-amber-800')}>
        <span className={cls('h-2 w-2 shrink-0 rounded-full', payLive ? 'bg-brand-500' : 'bg-amber-500 animate-pulse-soft')} />
        {payLive
          ? `Passerelle de paiement active (GeniusPay${integr?.payment?.sandbox ? ' — mode SANDBOX, tests sans argent réel' : ''}) — Orange Money, MTN MoMo et cartes acceptés.`
          : 'Passerelle de paiement non configurée — mode simulation : la cotisation sera enregistrée et soumise à la validation du trésorier.'}
      </div>

      {dejaPayeCeMois && (
        <div className="animate-fade-up rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
            <Check size={16} /> Votre cotisation de {monthLabel(monthKey())} est déjà enregistrée
          </p>
          <p className="mt-1 text-xs text-brand-700/80">Elle est en attente de validation ou déjà validée par le trésorier — retrouvez son statut dans l'historique ci-dessous.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        {METHODES.map(m => (
          <button key={m.id} onClick={() => ouvrir(m)}
            className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 text-left shadow-[0_1px_2px_rgba(4,34,15,.05),0_8px_24px_-12px_rgba(4,34,15,.12)] transition-all duration-300 hover:-translate-y-1 hover:border-gold-300 cursor-pointer">
            <div className={cls('absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-10 transition-transform duration-500 group-hover:scale-[1.7]', m.grad)} />
            <div className={cls('grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md', m.grad)}>{m.icon}</div>
            <h3 className="mt-4 font-display text-lg font-semibold">{m.label}</h3>
            <p className="mt-1 text-xs text-ink/50">{m.hint}</p>
            <p className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-600">Payer maintenant <ArrowRight size={12} /></p>
          </button>
        ))}
      </div>

      <Card title="Mes paiements récents" subtitle="Cotisations soumises et validées" className="mt-5" pad={false}>
        <div className="p-5">
          <Table rows={mesCotis.slice(0, 6)} empty="Aucun paiement enregistré" columns={[
            { key: 'periode', label: 'Période', render: r => monthLabel(r.periode) },
            { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
            { key: 'methode', label: 'Méthode' },
            { key: 'montant', label: 'Montant', render: r => <span className="font-semibold">{fmtXAF(r.montant)}</span> },
            { key: 'statut', label: 'Statut', render: r => <Badge tone={statusTone(r.statut)}>{r.statut}</Badge> },
            { key: 'ref', label: 'Référence', render: r => <span className="font-mono text-xs text-ink/50">{r.ref}</span> },
          ]} />
        </div>
      </Card>

      <Modal open={!!methode} onClose={() => !['processing', 'checkout'].includes(phase) && setMethode(null)}
        title={phase === 'success' ? 'Paiement enregistré' : methode ? `Payer via ${methode.label}` : ''} subtitle={phase === 'success' ? undefined : `Cotisation ${monthLabel(monthKey())} · ${t.nom}`}>

        {phase === 'processing' ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-12 w-12 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
            <p className="font-semibold">Création de la transaction…</p>
            <p className="max-w-xs text-xs text-ink/50">Connexion sécurisée à la passerelle de paiement.</p>
          </div>
        ) : phase === 'checkout' ? (
          <div className="space-y-4 py-2 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-600"><Smartphone size={26} /></span>
            <div>
              <h3 className="font-display text-lg font-semibold">Terminez le paiement</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-ink/60">
                La page {methode?.label} s'est ouverte dans un nouvel onglet. Une fois votre paiement effectué,
                revenez ici et cliquez sur « J'ai payé ».
              </p>
            </div>
            <div className="rounded-xl bg-black/[.03] px-4 py-3 text-xs">
              <span className="text-ink/50">Référence : </span><span className="font-mono font-bold">{tx?.ref}</span>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="ghost" onClick={() => { setMethode(null); setPhase('form') }}>Annuler</Button>
              <Button variant="gold" icon={<Check size={16} />} onClick={verifierStatut}>J'ai payé — vérifier</Button>
            </div>
          </div>
        ) : phase === 'confirm-sim' ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
              <p className="text-sm font-bold text-amber-800">Mode simulation — passerelle non configurée</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-700/90">
                Aucune passerelle de paiement n'est connectée. Confirmez que vous avez réglé {fmtXAF(+form.montant)}
                par {methode?.label} {methode?.id !== 'Carte' ? `au ${t.nom ? 'numéro du club' : 'club'}` : ''} :
                la cotisation sera enregistrée avec la référence <b className="font-mono">{tx?.ref}</b> et restera
                « En attente » jusqu'à la validation du trésorier.
              </p>
            </div>
            <div className="space-y-2.5 rounded-2xl bg-brand-50 px-5 py-4 text-sm">
              <div className="flex justify-between"><span className="text-ink/55">Montant</span><span className="font-display font-semibold">{fmtXAF(+form.montant)}</span></div>
              <div className="flex justify-between"><span className="text-ink/55">Méthode</span><span className="font-semibold">{methode?.label}</span></div>
              <div className="flex justify-between"><span className="text-ink/55">Période</span><span className="font-semibold">{monthLabel(monthKey())}</span></div>
              <div className="flex justify-between"><span className="text-ink/55">Référence</span><span className="font-mono text-xs font-bold">{tx?.ref}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setMethode(null); setPhase('form') }}>Annuler</Button>
              <Button variant="gold" icon={<Check size={16} />} onClick={confirmerSimulation}>J'ai réglé — enregistrer</Button>
            </div>
          </div>
        ) : phase === 'success' ? (
          <div className="py-4 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700 animate-fade-up">
              <Check size={30} />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold">Paiement enregistré</h3>
            <p className="mt-1.5 text-sm text-ink/60">Le trésorier va valider votre cotisation dans quelques instants.</p>
            <div className="mt-5 space-y-2.5 rounded-2xl bg-brand-50 px-5 py-4 text-left text-sm">
              <div className="flex justify-between"><span className="text-ink/55">Montant</span><span className="font-display font-semibold">{fmtXAF(+form.montant)}</span></div>
              <div className="flex justify-between"><span className="text-ink/55">Méthode</span><span className="font-semibold">{methode?.label}</span></div>
              <div className="flex justify-between"><span className="text-ink/55">Période</span><span className="font-semibold">{monthLabel(monthKey())}</span></div>
              <div className="flex justify-between"><span className="text-ink/55">Référence</span><span className="font-mono text-xs font-bold">{tx?.ref}</span></div>
            </div>
            <Button variant="gold" className="mt-5 w-full" onClick={() => { setMethode(null); setPhase('form') }}>Terminer</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Montant (XAF)" required error={errors.montant} hint={`Cotisation officielle : ${fmtXAF(t.montantCotisation)}`}>
              <Input type="number" value={form.montant} error={errors.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
            </Field>
            {methode?.id !== 'Carte' && (
              <Field label="Numéro de téléphone" required error={errors.tel} hint="Numéro qui sera débité">
                <Input value={form.tel} error={errors.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="+237 6 55 00 11 22" />
              </Field>
            )}
            <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 text-sm">
              <span className="text-brand-800">Total à payer</span>
              <span className="font-display text-lg font-semibold text-brand-900">{fmtXAF(+form.montant || 0)}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMethode(null)}>Annuler</Button>
              <Button variant="gold" icon={methode?.icon} onClick={payer}>Payer {fmtXAF(+form.montant || 0)}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================ HISTORIQUE + REÇU ============================ */
export function HistoriquePage() {
  const { db, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const me = byId(db.membres, user.id)
  const [recu, setRecu] = useState(null)

  const mesCotis = db.cotisations.filter(c => c.membreId === user.id).sort((a, b) => b.date.localeCompare(a.date))

  const telechargerRecu = () => {
    if (!recu) return
    pdfRecu({ club: t, cotisation: recu, membre: me || { nom: user.nom } })
    toast('Reçu téléchargé en PDF')
  }

  return (
    <div>
      <PageHeader title="Historique des cotisations" sub="Consultez vos paiements, téléchargez et imprimez vos reçus."
        actions={<Badge tone="brand">{mesCotis.length} paiement(s) · {fmtXAF(sum(mesCotis, c => c.montant))}</Badge>} />
      <Card pad={false}>
        <div className="p-5">
          <Table rows={mesCotis} empty="Aucune cotisation enregistrée" columns={[
            { key: 'periode', label: 'Période', render: r => monthLabel(r.periode) },
            { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
            { key: 'methode', label: 'Méthode', render: r => <Badge tone="gray">{r.methode}</Badge> },
            { key: 'montant', label: 'Montant', render: r => <span className="font-semibold">{fmtXAF(r.montant)}</span> },
            { key: 'statut', label: 'Statut', render: r => <Badge tone={statusTone(r.statut)}>{r.statut}</Badge> },
            { key: 'ref', label: 'Référence', render: r => <span className="font-mono text-xs text-ink/50">{r.ref}</span> },
            { key: 'recu', label: '', render: r => <Button size="sm" variant="outline" icon={<Receipt size={14} />} onClick={() => setRecu(r)}>Reçu</Button> },
          ]} />
        </div>
      </Card>

      <Modal open={!!recu} onClose={() => setRecu(null)} title="Reçu de cotisation" subtitle={`Référence ${recu?.ref}`}
        footer={<><Button variant="ghost" onClick={() => setRecu(null)}>Fermer</Button><Button variant="gold" icon={<Printer size={16} />} onClick={() => telechargerRecu()}>Télécharger PDF</Button></>}>
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
          <p className="font-display text-xl font-bold text-brand-900">{t.nom}</p>
          <p className="text-[11px] uppercase tracking-widest text-ink/45">{t.ville}</p>
          <div className="mx-auto my-4 h-px w-24 bg-gold-500" />
          <p className="font-display text-lg font-semibold">Reçu de cotisation</p>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-ink/50">Membre</span><span className="font-semibold">{me?.nom}</span></div>
            <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-ink/50">Période</span><span className="font-semibold">{monthLabel(recu?.periode)}</span></div>
            <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-ink/50">Montant</span><span className="font-semibold">{fmtXAF(recu?.montant)}</span></div>
            <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-ink/50">Méthode</span><span className="font-semibold">{recu?.methode}</span></div>
            <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-ink/50">Référence</span><span className="font-mono text-xs font-semibold">{recu?.ref}</span></div>
            <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-ink/50">Date</span><span className="font-semibold">{fmtDate(recu?.date)}</span></div>
            <div className="flex justify-between"><span className="text-ink/50">Statut</span><span className="font-semibold">{recu?.statut}</span></div>
          </div>
          <p className="mt-6 text-[11px] text-ink/40">Document généré par TontiGest — merci de votre contribution à la solidarité du club.</p>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ CALENDRIER DE PASSAGE ============================ */
export function CalendrierPage() {
  const { db } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const maPosition = db.ordrePassage.indexOf(user.id) + 1

  return (
    <div>
      <PageHeader title="Calendrier de passage" sub="L'ordre rotatif des bénéficiaires du tour, validé par le bureau."
        actions={maPosition ? <Badge tone="gold" dot>Ma position : {maPosition}ᵉ — {monthLabel(moisDe(t.dateDebut, maPosition - 1))}</Badge> : null} />
      <Card>
        <div className="relative">
          <div className="absolute bottom-4 left-[21px] top-4 w-px bg-gradient-to-b from-gold-400 via-brand-200 to-brand-100" />
          <div className="space-y-3">
            {db.ordrePassage.map((id, i) => {
              const m = byId(db.membres, id)
              const moi = id === user.id
              /* Tour servi = cotisation validée rattachée à ce bénéficiaire ;
                 tour en cours = le premier non servi. Plus de i<3 hardcodé. */
              const servi = db.cotisations.some(c => c.membreId === id && c.statut === 'Validée')
              const toursServis = db.ordrePassage.filter(x =>
                db.cotisations.some(c => c.membreId === x && c.statut === 'Validée')).length
              const enCours = i === toursServis
              return (
                <div key={id} style={{ animationDelay: `${i * 0.05}s` }}
                  className={cls('relative flex items-center gap-4 rounded-2xl border bg-white p-3 pl-4 transition-all animate-fade-up',
                    moi ? 'border-gold-400 ring-2 ring-gold-400 shadow-lg shadow-gold-500/10' : 'border-black/5 hover:border-brand-200')}>
                  <span className={cls('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold',
                    servi ? 'bg-brand-100 text-brand-700' : enCours ? 'bg-brand-950 text-gold-300' : 'bg-gold-100 text-gold-700')}>
                    {servi ? <Check size={14} /> : i + 1}
                  </span>
                  <Avatar name={m?.nom} size="sm" ring={moi} />
                  <div className="min-w-0 flex-1">
                    <p className={cls('truncate text-sm', moi ? 'font-bold' : 'font-semibold')}>{m?.nom} {moi && <span className="text-gold-600">(moi)</span>}</p>
                    <p className="text-xs text-ink/50">{m ? `${BUREAU_LABELS[m.role]} · ` : ''}{t.dateDebut ? `Tour estimé : ${monthLabel(moisDe(t.dateDebut, i))}` : 'Date de début non définie'}</p>
                  </div>
                  {moi && <Badge tone="gold" dot>Mon tour</Badge>}
                  {servi && <Badge tone="green">Tour servi</Badge>}
                  {!servi && !moi && enCours && <Badge tone="brand" dot>Tour en cours</Badge>}
                  {!servi && !moi && !enCours && <Badge tone="gray">À venir</Badge>}
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ============================ PRÊTS ============================ */
export function PretsMembrePage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ montant: '', motif: '', g1: '', g2: '' })
  const [errors, setErrors] = useState({})

  const mesPrets = db.prets.filter(p => p.membreId === user.id)
  const elegibles = db.membres.filter(m => m.id !== user.id && m.statut === 'Actif')

  const validerDemande = (f) => runValidators(f, {
    montant: [v => !(Number(v) > 0) ? 'Saisissez un montant supérieur à 0.' : '',
      v => Number(v) < 10000 ? 'Le montant minimum est de 10 000 FCFA.' : ''],
    motif: [vMinLen(10, 'Décrivez le motif du prêt (10 caractères minimum).')],
    g1: [vRequired('Le garant 1 est obligatoire.')],
    g2: [vRequired('Le garant 2 est obligatoire.'), (v, f2) => v && v === f2.g1 ? 'Les deux garants doivent être différents.' : ''],
  })

  const demander = () => {
    const errs = validerDemande(form)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return toast('Corrigez les champs signalés avant de soumettre', 'error')
    const montant = +form.montant
    const monNom = byId(db.membres, user.id)?.nom || 'Un membre'
    setDb(d => {
      const tresorier = d.membres.find(m => m.role === 'Tresorier')
      let notifications = [...d.notifications,
        notifyMe(user.id, 'Demande de prêt soumise', `Votre demande de prêt de ${fmtXAF(montant)} attend l'examen du trésorier.`)]
      // Les deux garants sont informés qu'ils sont engagés sur ce prêt.
      for (const g of [form.g1, form.g2]) {
        notifications = [...notifications, { id: uid('nt'), pour: g, titre: 'Vous êtes engagé(e) comme garant', message: `${monNom} vous a désigné(e) garant(e) d'une demande de prêt de ${fmtXAF(montant)} : « ${form.motif.trim().slice(0, 80)} ».`, lu: false, date: now() }]
      }
      // Le trésorier est informé de la nouvelle demande à examiner.
      if (tresorier) notifications = [...notifications, { id: uid('nt'), pour: tresorier.id, titre: 'Nouvelle demande de prêt', message: `${monNom} demande un prêt de ${fmtXAF(montant)}. Examinez-la dans le module Prêts.`, lu: false, date: now() }]
      return {
        ...d,
        prets: [...d.prets, { id: uid('pr'), membreId: user.id, montant, taux: t.tauxPret, garants: [form.g1, form.g2], statut: 'En attente', dateDemande: today(), motif: form.motif.trim(), reste: montant, interet: Math.round(montant * t.tauxPret / 100) }],
        notifications,
      }
    })
    setOpen(false)
    setForm({ montant: '', motif: '', g1: '', g2: '' }); setErrors({})
    toast('Demande transmise — trésorier et garants notifiés')
  }

  return (
    <div>
      <PageHeader title="Mes prêts" sub="Suivez vos emprunts et demandez un nouveau prêt avec deux garants."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Demande de prêt</Button>} />

      {mesPrets.length === 0 && <EmptyState icon={<HandCoins size={16} />} title="Aucun prêt" sub="Vous n'avez aucun emprunt en cours ni demandé." />}
      <div className="grid gap-4 lg:grid-cols-2 stagger">
        {mesPrets.map(p => {
          const remb = p.montant - (p.reste || 0)
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{fmtXAF(p.montant)}</h3>
                    <Badge tone={statusTone(p.statut)}>{p.statut}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink/50">{p.motif} · demandé le {fmtDate(p.dateDemande)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">Intérêt ({p.taux}%)</p>
                  <p className="font-semibold text-gold-600">{fmtXAF(p.interet)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-ink/50">Remboursé : {fmtXAF(remb)}</span>
                  <span className="font-semibold text-ink/70">Reste : {fmtXAF(p.reste)}</span>
                </div>
                <Progress value={remb} max={p.montant} tone={p.reste === 0 ? 'bg-brand-600' : 'bg-gold-500'} />
              </div>
              <p className="mt-3 text-xs text-ink/50">Garants : {p.garants.map(g => byId(db.membres, g)?.nom).join(' · ') || '—'}</p>
            </Card>
          )
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Demande de prêt" subtitle={`Taux club : ${t.tauxPret}% — deux garants actifs requis`}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="gold" onClick={demander}>Soumettre la demande</Button></>}>
        <div className="space-y-4">
          <Field label="Montant souhaité (XAF)" required error={errors.montant}>
            <Input type="number" min="10000" step="5000" value={form.montant} error={errors.montant}
              onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Ex : 150000" />
          </Field>
          <Field label="Motif" required error={errors.motif}>
            <Textarea value={form.motif} error={errors.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
              placeholder="Ex : Frais de scolarité, réapprovisionnement boutique…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Garant 1" required error={errors.g1}>
              <Select value={form.g1} error={errors.g1} onChange={e => setForm(f => ({ ...f, g1: e.target.value }))}>
                <option value="">— Choisir —</option>
                {elegibles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </Select>
            </Field>
            <Field label="Garant 2" required error={errors.g2} hint="Doit être différent du garant 1">
              <Select value={form.g2} error={errors.g2} onChange={e => setForm(f => ({ ...f, g2: e.target.value }))}>
                <option value="">— Choisir —</option>
                {elegibles.filter(m => m.id !== form.g1).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </Select>
            </Field>
          </div>
          {+form.montant > 0 && (
            <p className="rounded-xl bg-gold-50 px-4 py-3 text-xs text-gold-700">Intérêt estimé : {fmtXAF(+form.montant * t.tauxPret / 100)} ({t.tauxPret}% du capital) — total à rembourser : {fmtXAF(+form.montant * (1 + t.tauxPret / 100))}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}

/* ============================ AIDES SOCIALES ============================ */
export function AidesMembrePage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ type: 'Naissance', montant: '', motif: '' })
  const [errors, setErrors] = useState({})

  const mesAides = db.aides.filter(a => a.membreId === user.id)

  const validerAide = (f) => runValidators(f, {
    montant: [v => !(Number(v) > 0) ? 'Saisissez un montant supérieur à 0.' : ''],
    motif: [vMinLen(10, 'Décrivez votre situation (10 caractères minimum).')],
  })

  const demander = () => {
    const errs = validerAide(form)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return toast('Corrigez les champs signalés avant de soumettre', 'error')
    setDb(d => ({
      ...d,
      aides: [...d.aides, { id: uid('ai'), membreId: user.id, type: form.type, montant: +form.montant, statut: 'En attente', date: today(), motif: form.motif.trim() }],
      notifications: [...d.notifications, notifyMe(user.id, 'Demande d\'aide soumise', `Votre demande d'aide (${form.type}) de ${fmtXAF(+form.montant)} attend la validation du bureau.`)],
    }))
    setOpen(false)
    setForm({ type: 'Naissance', montant: '', motif: '' }); setErrors({})
    toast('Demande d\'aide transmise au bureau')
  }

  return (
    <div>
      <PageHeader title="Aides sociales" sub="Solidarité du club : décès, mariage, naissance, maladie."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Demander une aide</Button>} />

      {mesAides.length === 0 && <EmptyState icon={<HandHelping size={16} />} title="Aucune demande d'aide" sub="Le club vous accompagne dans les grands moments de la vie." />}
      <div className="space-y-4 stagger">
        {mesAides.map(a => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-50">{AIDE_ICONS[a.type] || <HandHelping size={22} className="text-gold-600" />}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Aide {a.type}</h3>
                    <Badge tone={statusTone(a.statut)}>{a.statut}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink/50">{a.motif} · {fmtDate(a.date)}</p>
                </div>
              </div>
              <p className="font-display text-xl font-semibold text-brand-700">{fmtXAF(a.montant)}</p>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Demander une aide sociale" subtitle="Votre demande sera examinée par le bureau exécutif"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="gold" onClick={demander}>Envoyer la demande</Button></>}>
        <div className="space-y-4">
          <Field label="Type d'aide" required>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={['Naissance', 'Mariage', 'Maladie', 'Deces']} />
          </Field>
          <Field label="Montant demandé (XAF)" required error={errors.montant}>
            <Input type="number" min="1000" step="1000" value={form.montant} error={errors.montant}
              onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Ex : 100000" />
          </Field>
          <Field label="Motif / situation" required error={errors.motif} hint="Expliquez la situation : le bureau se base sur cette description pour statuer.">
            <Textarea value={form.motif} error={errors.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
              placeholder="Ex : Naissance de jumeaux prévue début octobre, besoin d'un soutien pour les frais de maternité…" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ ÉPARGNE ============================ */
export function EpargneMembrePage() {
  const { db } = useStore()
  const { user } = useAuth()
  const [tab, setTab] = useState('indiv')

  const ep = db.epargneIndividuelle.find(e => e.membreId === user.id)
  const mesGroupes = db.groupesEpargne.filter(g => g.membres.includes(user.id))
  const mesParts = db.interetsRedistribues.map(ir => ({ ir, part: ir.parts.find(p => p.membreId === user.id)?.montant || 0 }))
  const totalInterets = sum(mesParts, x => x.part)

  return (
    <div>
      <PageHeader title="Mon épargne" sub="Épargne individuelle, groupe d'épargne et intérêts redistribués." />
      <div className="mb-5"><Tabs active={tab} onChange={setTab} tabs={[
        { id: 'indiv', label: 'Épargne individuelle' },
        { id: 'groupe', label: `Groupe d'épargne (${mesGroupes.length})` },
        { id: 'interets', label: 'Intérêts redistribués' },
      ]} /></div>

      {tab === 'indiv' && (!ep ? <EmptyState icon={<PiggyBank size={16} />} title="Aucun compte d'épargne" sub="Contactez le trésorier pour ouvrir votre épargne individuelle." /> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 stagger">
            <Stat label="Solde épargne" value={fmtXAF(ep.solde)} sub={`Type : ${ep.type}`} icon={<PiggyBank size={18} />} tone="brand" />
            <Stat label="Montant bloqué" value={fmtXAF(ep.bloquee)} sub={ep.bloquee ? 'Disponible après délai contractuel' : 'Aucun montant bloqué'} icon={<Lock size={18} />} tone="gold" />
          </div>
          <Card title="Répartition du solde" subtitle={`Part bloquée : ${pct(ep.bloquee, ep.solde)}% du total`}>
            <Progress value={ep.bloquee} max={ep.solde} tone="bg-gold-500" />
            <div className="mt-2 flex justify-between text-xs text-ink/50">
              <span>Bloqué : {fmtXAF(ep.bloquee)}</span><span>Disponible : {fmtXAF(ep.solde - ep.bloquee)}</span>
            </div>
          </Card>
          <Card title="Historique des versements" pad={false}>
            <div className="p-5">
              <Table rows={ep.versements} empty="Aucun versement enregistré" columns={[
                { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
                { key: 'montant', label: 'Montant', render: r => <span className="font-semibold">{fmtXAF(r.montant)}</span> },
                { key: 'ref', label: 'Référence', render: r => <span className="font-mono text-xs text-ink/50">{r.id}</span> },
              ]} />
            </div>
          </Card>
        </div>
      ))}

      {tab === 'groupe' && (mesGroupes.length === 0 ? <EmptyState icon={<Users size={16} />} title="Aucun groupe d'épargne" sub="Vous n'êtes membre d'aucun groupe pour le moment." /> : (
        <div className="grid gap-4 lg:grid-cols-2 stagger">
          {mesGroupes.map(g => {
            const part = Math.round(g.solde / g.membres.length)
            return (
              <Card key={g.id}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{g.nom}</h3>
                  <Badge tone="gray">{g.membres.length} membre(s)</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">Solde du groupe</p><p className="font-display text-xl font-semibold">{fmtXAF(g.solde)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">Ma part estimée</p><p className="font-display text-xl font-semibold text-gold-600">{fmtXAF(part)}</p></div>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-ink/50">
                    <span>Objectif : {fmtXAF(g.objectif)}</span><span className="font-semibold text-brand-700">{pct(g.solde, g.objectif)}%</span>
                  </div>
                  <Progress value={g.solde} max={g.objectif} />
                </div>
              </Card>
            )
          })}
        </div>
      ))}

      {tab === 'interets' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 stagger">
            <Stat label="Total intérêts reçus" value={fmtXAF(totalInterets)} sub={`${db.interetsRedistribues.length} redistribution(s)`} icon={<Gift size={18} />} tone="brand" />
            <Stat label="Moyenne par redistribution" value={fmtXAF(mesParts.length ? totalInterets / mesParts.length : 0)} sub="Sur l'historique disponible" icon={<TrendingUp size={18} />} tone="gold" />
          </div>
          <Card title="Historique des redistributions" subtitle="Intérêts des prêts redistribués aux membres" pad={false}>
            <div className="p-3">
              {mesParts.length === 0 && <EmptyState icon={<Gift size={16} />} title="Aucune redistribution" sub="Les intérêts seront redistribués en fin de cycle." />}
              {mesParts.map(({ ir, part }) => (
                <RowItem key={ir.id} icon={<Sparkles size={16} className="text-gold-600" />} title={`Redistribution du ${fmtDate(ir.date)}`}
                  sub={`Enveloppe totale : ${fmtXAF(ir.total)}`}
                  right={<span className="rounded-xl bg-gold-50 px-3 py-1.5 text-sm font-bold text-gold-700">+ {fmtXAF(part)}</span>} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ============================ MES RÉCLAMATIONS ============================ */
/* Point d'entrée membre du module réclamations (avant : à sens unique,
   seul le secrétaire pouvait répondre à des réclamations jamais créables). */
export function ReclamationsMembrePage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ sujet: '', detail: '' })

  const mesReclamations = db.reclamations
    .filter(r => r.membreId === user.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))

  const envoyer = () => {
    if (!form.sujet.trim()) return toast('Le sujet est obligatoire', 'error')
    if (!form.detail.trim()) return toast('Décrivez votre réclamation', 'error')
    setDb(d => ({
      ...d,
      reclamations: [...d.reclamations, {
        id: uid('rec'), membreId: user.id, sujet: form.sujet.trim(),
        detail: form.detail.trim(), statut: 'Ouverte', reponse: '', date: today(),
      }],
      /* Notifier le secrétaire : toutes les notifications club passent par
         db.notifications (entity 'notifications'). */
      notifications: [...d.notifications, ...d.membres
        .filter(m => m.role === 'Secretaire')
        .map(m => ({ id: uid('nt'), pour: m.id, titre: 'Nouvelle réclamation', message: `${byId(d.membres, user.id)?.nom || 'Un membre'} a déposé une réclamation : « ${form.sujet.trim()} »`, lu: false, date: now() }))],
    }))
    setForm({ sujet: '', detail: '' })
    setOpen(false)
    toast('Réclamation transmise au secrétaire')
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Mes réclamations" sub="Soumettez vos doléances au bureau — le secrétaire vous répond."
        actions={<Button variant="gold" icon={<MessageSquare size={16} />} onClick={() => setOpen(true)}>Nouvelle réclamation</Button>} />

      <Card pad={false}>
        <Table empty="Aucune réclamation — n'hésitez pas à en soumettre une" rows={mesReclamations} columns={[
          { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
          { key: 'sujet', label: 'Sujet', render: r => <span className="font-semibold">{r.sujet}</span> },
          { key: 'statut', label: 'Statut', render: r => <Badge tone={statusTone(r.statut)}>{r.statut}</Badge> },
          { key: 'reponse', label: 'Réponse du secrétariat', render: r => r.reponse
            ? <span className="text-ink/70">{r.reponse}</span>
            : <span className="text-xs text-ink/40">En attente de réponse…</span> },
        ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle réclamation" subtitle="Votre message sera transmis au secrétaire du club"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="gold" onClick={envoyer} icon={<Send size={16} />}>Envoyer</Button></>}>
        <div className="space-y-4">
          <Field label="Sujet" required><Input value={form.sujet} onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))} placeholder="Ex : Erreur sur mon reçu de cotisation" /></Field>
          <Field label="Détail" required hint="Décrivez précisément votre demande — le secrétaire pourra vous répondre.">
            <Textarea rows={5} value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="Votre réclamation…" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ MES PÉNALITÉS & SANCTIONS ============================ */
/* Le membre voit désormais ses pénalités impayées et sanctions reçues. */
export function PenalitesMembrePage() {
  const { db } = useStore()
  const { user } = useAuth()

  const mesPenalites = db.penalites.filter(p => p.membreId === user.id).sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const mesSanctions = db.sanctions.filter(s => s.membreId === user.id).sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const impayees = mesPenalites.filter(p => !p.payee)
  const totalDu = sum(impayees, p => p.montant)

  return (
    <div className="space-y-5">
      <PageHeader title="Mes pénalités & sanctions" sub="Suivi de vos pénalités de retard et sanctions disciplinaires." />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Pénalités impayées" value={fmtXAF(totalDu)} sub={`${impayees.length} pénalité(s)`} icon={<TriangleAlert size={18} />} tone={totalDu > 0 ? 'red' : 'brand'} />
        <Stat label="Pénalités réglées" value={fmtXAF(sum(mesPenalites, p => p.payee ? p.montant : 0))} sub={`${mesPenalites.filter(p => p.payee).length} réglée(s)`} icon={<CircleCheck size={18} />} tone="brand" />
        <Stat label="Sanctions reçues" value={String(mesSanctions.length)} sub="Historique disciplinaire" icon={<Scale size={18} />} tone="gold" />
      </div>

      <Card title="Historique des pénalités" subtitle="Pénalités de retard appliquées par le trésorier" pad={false}>
        <Table empty="Aucune pénalité — votre situation est à jour ✅" rows={mesPenalites} columns={[
          { key: 'date', label: 'Date', render: p => fmtDate(p.date) },
          { key: 'motif', label: 'Motif', render: p => <span className="text-ink/60">{p.motif}</span> },
          { key: 'montant', label: 'Montant', render: p => <span className="font-bold">{fmtXAF(p.montant)}</span> },
          { key: 'payee', label: 'Statut', render: p => p.payee ? <Badge tone="green">Payée</Badge> : <Badge tone="amber" dot>Impayée</Badge> },
        ]} />
      </Card>

      {mesSanctions.length > 0 && (
        <Card title="Sanctions reçues" subtitle="Décisions disciplinaires du bureau" pad={false}>
          <Table rows={mesSanctions} columns={[
            { key: 'date', label: 'Date', render: s => fmtDate(s.date) },
            { key: 'type', label: 'Type', render: s => <Badge tone={statusTone(s.type)}>{s.type}</Badge> },
            { key: 'motif', label: 'Motif', render: s => <span className="text-ink/60">{s.motif}</span> },
          ]} />
        </Card>
      )}
    </div>
  )
}

