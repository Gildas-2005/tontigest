import { useEffect, useRef, useState } from 'react'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Table, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem, Progress } from '../components/ui'
import { Bars } from '../components/charts'
import { fmtXAF, fmtDate, fmtNum, today, now, uid, sum, byId, pct, monthKey, monthLabel, cls } from '../lib/utils'

/* Mois estimé = mois de dateDebut + offset (fréquence mensuelle) */
const moisDe = (iso, offset = 0) => {
  const d = new Date(iso + 'T12:00:00')
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const AIDE_ICONS = { Deces: '⚰️', Mariage: '💍', Naissance: '👶', Maladie: '🏥' }

const notifyMe = (id, titre, message) => ({ id: uid('nt'), pour: id, titre, message, lu: false, date: now() })

/* ============================ ACCUEIL MEMBRE (UC48) ============================ */
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

  const cotisMois = mesCotis.find(c => c.periode === monthKey() || monthKey(c.date) === monthKey())
  const statutMois = cotisMois?.statut || null

  const parMois = {}
  validées.forEach(c => { parMois[monthKey(c.date)] = (parMois[monthKey(c.date)] || 0) + c.montant })
  const cles = Object.keys(parMois).sort().slice(-6)
  const barsData = cles.map(k => ({ label: monthLabel(k).split(' ')[0].slice(0, 4), value: parMois[k] }))

  const activites = [
    ...mesCotis.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(c => ({
      id: c.id, icon: '💳', title: `Cotisation ${c.periode} — ${fmtXAF(c.montant)}`,
      sub: `${c.methode} · réf. ${c.ref} · ${fmtDate(c.date)}`,
      right: <Badge tone={statusTone(c.statut)}>{c.statut}</Badge>, date: c.date,
    })),
    ...db.notifications.filter(n => n.pour === user.id).slice(-4).reverse().map(n => ({
      id: n.id, icon: '🔔', title: n.titre, sub: n.message,
      right: !n.lu && <Badge tone="blue" dot>Nouveau</Badge>, date: n.date,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Hero bandeau */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-950 p-6 text-white sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#032018,#063626_50%,#0a573d)] bg-[length:200%_200%] animate-gradient" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl animate-float" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-300">Espace Membre · {BUREAU_LABELS[user.role]}</p>
            <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Bonjour {user.nom.split(' ')[0]}, <span className="gold-text">{t.nom}</span> vous attend.</h1>
            <p className="mt-2 max-w-xl text-sm text-brand-100/70">{t.type} · Cotisation {fmtXAF(t.montantCotisation)} {t.frequence.toLowerCase()} · Membre depuis le {fmtDate(me?.dateAdhesion)}</p>
            <div className="mt-4">
              {statutMois === 'Validée' && <Badge tone="green" dot>Cotisation du mois à jour ✓</Badge>}
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
        <Stat label="Total cotisé" value={fmtXAF(totalCotisé)} sub={`${validées.length} cotisation(s) validée(s)`} icon="💰" tone="gold" />
        <Stat label="Solde épargne" value={fmtXAF(ep?.solde || 0)} sub={ep?.bloquee ? `dont ${fmtXAF(ep.bloquee)} bloqués` : 'Épargne libre'} icon="🏦" tone="brand" />
        <Stat label="Intérêts reçus" value={fmtXAF(interets)} sub={`${db.interetsRedistribues.length} redistribution(s) du trésorier`} icon="🎁" tone="violet" />
        <Stat label="Mon prochain tour" value={position ? `${position}ᵉ` : '—'} sub={position ? `Estimé : ${monthLabel(moisDe(t.dateDebut, position - 1))}` : 'Hors calendrier'} icon="📅" tone="blue" />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card title="Mes cotisations" subtitle="Historique validé (6 derniers mois)" className="xl:col-span-2">
          {barsData.length ? <Bars data={barsData} /> : <EmptyState icon="💳" title="Aucune cotisation validée" sub="Vos paiements validés apparaîtront ici." />}
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

/* ============================ PAIEMENT (UC49) ============================ */
const METHODES = [
  { id: 'Orange Money', label: 'Orange Money', icon: '🟠', grad: 'from-orange-500 to-orange-600', hint: 'USSD #150# — frais 0 FCFA' },
  { id: 'MTN MoMo', label: 'MTN MoMo', icon: '🟡', grad: 'from-yellow-400 to-amber-500', hint: 'USSD *126# — frais 0 FCFA' },
  { id: 'Carte', label: 'Carte bancaire', icon: '💳', grad: 'from-brand-600 to-brand-900', hint: 'Visa · Mastercard — sécurisé 3D Secure' },
]

export function PayerPage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const me = byId(db.membres, user.id)
  const [methode, setMethode] = useState(null)
  const [phase, setPhase] = useState('form')
  const [form, setForm] = useState({ montant: '', tel: '', num: '', exp: '', cvv: '' })
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const mesCotis = db.cotisations.filter(c => c.membreId === user.id).sort((a, b) => b.date.localeCompare(a.date))

  const ouvrir = (m) => {
    setMethode(m)
    setPhase('form')
    setForm({ montant: t.montantCotisation, tel: me?.tel || '', num: '', exp: '', cvv: '' })
  }

  const payer = () => {
    if (!(+form.montant > 0)) return toast('Le montant doit être supérieur à 0', 'error')
    if (methode.id !== 'Carte' && !form.tel.trim()) return toast('Le numéro de téléphone est obligatoire', 'error')
    if (methode.id === 'Carte' && (!form.num.trim() || !form.exp.trim() || !form.cvv.trim())) return toast('Renseignez toutes les informations de la carte', 'error')
    setPhase('pending')
    timerRef.current = setTimeout(() => {
      const ref = uid('TG')
      setDb(d => ({
        ...d,
        cotisations: [{ id: uid('cot'), membreId: user.id, montant: +form.montant, devise: 'XAF', date: today(), periode: monthKey(), methode: methode.id, ref, statut: 'En attente' }, ...d.cotisations],
        notifications: [...d.notifications, notifyMe(user.id, 'Paiement soumis', `Votre paiement de ${fmtXAF(+form.montant)} via ${methode.id} (réf. ${ref}) attend la validation du trésorier.`)],
      }))
      setPhase('form')
      setMethode(null)
      toast('Paiement soumis au trésorier pour validation ✅')
    }, 2500)
  }

  return (
    <div>
      <PageHeader title="Payer ma cotisation" sub={`Réglez votre cotisation ${t.frequence.toLowerCase()} en quelques secondes — mobile money ou carte bancaire (UC49).`}
        actions={<Badge tone={mesCotis.some(c => c.periode === monthKey() && c.statut !== 'Rejetée') ? 'green' : 'amber'} dot>
          {mesCotis.some(c => c.periode === monthKey() && c.statut !== 'Rejetée') ? `Période ${monthLabel(monthKey())} réglée` : `Période ${monthLabel(monthKey())} en cours`}
        </Badge>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        {METHODES.map(m => (
          <button key={m.id} onClick={() => ouvrir(m)}
            className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 text-left shadow-[0_1px_2px_rgba(16,32,25,.05),0_8px_24px_-12px_rgba(16,32,25,.12)] transition-all duration-300 hover:-translate-y-1 hover:border-gold-300 cursor-pointer">
            <div className={cls('absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-10 transition-transform duration-500 group-hover:scale-[1.7]', m.grad)} />
            <div className={cls('grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-md', m.grad)}>{m.icon}</div>
            <h3 className="mt-4 font-display text-lg font-semibold">{m.label}</h3>
            <p className="mt-1 text-xs text-ink/50">{m.hint}</p>
            <p className="mt-3 text-xs font-bold text-brand-600">Payer maintenant →</p>
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

      <Modal open={!!methode} onClose={() => phase !== 'pending' && setMethode(null)}
        title={methode ? `Payer via ${methode.label}` : ''} subtitle={`Cotisation ${monthLabel(monthKey())} · ${t.nom}`}>

        {phase === 'pending' ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-12 w-12 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
            <p className="font-semibold">En attente de confirmation opérateur…</p>
            <p className="max-w-xs text-xs text-ink/50">{methode?.id === 'Carte' ? 'Vérification 3D Secure en cours, ne fermez pas cette fenêtre.' : `Validez la demande sur votre téléphone ${form.tel} — ne fermez pas cette fenêtre.`}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Montant (XAF)" hint={`Cotisation officielle : ${fmtXAF(t.montantCotisation)}`}>
              <Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
            </Field>
            {methode?.id !== 'Carte' ? (
              <Field label="Numéro de téléphone" hint="Vous recevrez une demande de confirmation à valider">
                <Input value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="+237 6 …" />
              </Field>
            ) : (
              <>
                <Field label="Numéro de carte"><Input value={form.num} onChange={e => setForm(f => ({ ...f, num: e.target.value }))} placeholder="4242 4242 4242 4242" /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiration"><Input value={form.exp} onChange={e => setForm(f => ({ ...f, exp: e.target.value }))} placeholder="MM/AA" /></Field>
                  <Field label="CVV"><Input value={form.cvv} onChange={e => setForm(f => ({ ...f, cvv: e.target.value }))} placeholder="123" /></Field>
                </div>
              </>
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

/* ============================ HISTORIQUE + REÇU (UC50) ============================ */
export function HistoriquePage() {
  const { db } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const me = byId(db.membres, user.id)
  const [recu, setRecu] = useState(null)

  const mesCotis = db.cotisations.filter(c => c.membreId === user.id).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader title="Historique des cotisations" sub="Consultez vos paiements, téléchargez et imprimez vos reçus (UC50)."
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
            { key: 'recu', label: '', render: r => <Button size="sm" variant="outline" icon="🧾" onClick={() => setRecu(r)}>Reçu</Button> },
          ]} />
        </div>
      </Card>

      <Modal open={!!recu} onClose={() => setRecu(null)} title="Reçu de cotisation" subtitle={`Référence ${recu?.ref}`}
        footer={<><Button variant="ghost" onClick={() => setRecu(null)}>Fermer</Button><Button variant="gold" icon="🖨" onClick={() => window.print()}>Imprimer</Button></>}>
        <div className="print-area rounded-2xl border border-black/10 bg-white p-6 text-center">
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

/* ============================ CALENDRIER DE PASSAGE (UC51) ============================ */
export function CalendrierPage() {
  const { db } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const maPosition = db.ordrePassage.indexOf(user.id) + 1

  return (
    <div>
      <PageHeader title="Calendrier de passage" sub="L'ordre rotatif des bénéficiaires du tour, validé par le bureau (UC51)."
        actions={maPosition ? <Badge tone="gold" dot>Ma position : {maPosition}ᵉ — {monthLabel(moisDe(t.dateDebut, maPosition - 1))}</Badge> : null} />
      <Card>
        <div className="relative">
          <div className="absolute bottom-4 left-[21px] top-4 w-px bg-gradient-to-b from-gold-400 via-brand-200 to-brand-100" />
          <div className="space-y-3">
            {db.ordrePassage.map((id, i) => {
              const m = byId(db.membres, id)
              const moi = id === user.id
              const servi = i < 3
              return (
                <div key={id} style={{ animationDelay: `${i * 0.05}s` }}
                  className={cls('relative flex items-center gap-4 rounded-2xl border bg-white p-3 pl-4 transition-all animate-fade-up',
                    moi ? 'border-gold-400 ring-2 ring-gold-400 shadow-lg shadow-gold-500/10' : 'border-black/5 hover:border-brand-200')}>
                  <span className={cls('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold',
                    servi ? 'bg-brand-100 text-brand-700' : i === 3 ? 'bg-brand-950 text-gold-300' : 'bg-gold-100 text-gold-700')}>
                    {servi ? '✓' : i + 1}
                  </span>
                  <Avatar name={m?.nom} size="sm" ring={moi} />
                  <div className="min-w-0 flex-1">
                    <p className={cls('truncate text-sm', moi ? 'font-bold' : 'font-semibold')}>{m?.nom} {moi && <span className="text-gold-600">(moi)</span>}</p>
                    <p className="text-xs text-ink/50">{BUREAU_LABELS[m?.role]} · Tour estimé : {monthLabel(moisDe(t.dateDebut, i))}</p>
                  </div>
                  {moi && <Badge tone="gold" dot>Mon tour</Badge>}
                  {servi && <Badge tone="green">Tour servi</Badge>}
                  {!servi && !moi && i === 3 && <Badge tone="blue" dot>Tour en cours</Badge>}
                  {!servi && !moi && i !== 3 && <Badge tone="gray">À venir</Badge>}
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ============================ PRÊTS (UC52) ============================ */
export function PretsMembrePage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ montant: '', motif: '', g1: '', g2: '' })

  const mesPrets = db.prets.filter(p => p.membreId === user.id)
  const elegibles = db.membres.filter(m => m.id !== user.id && m.statut === 'Actif')

  const demander = () => {
    const montant = +form.montant
    if (!(montant > 0)) return toast('Le montant du prêt doit être supérieur à 0', 'error')
    if (!form.motif.trim()) return toast('Le motif du prêt est obligatoire', 'error')
    if (!form.g1 || !form.g2) return toast('Deux garants sont obligatoires', 'error')
    if (form.g1 === form.g2) return toast('Les deux garants doivent être différents', 'error')
    setDb(d => ({
      ...d,
      prets: [...d.prets, { id: uid('pr'), membreId: user.id, montant, taux: t.tauxPret, garants: [form.g1, form.g2], statut: 'En attente', dateDemande: today(), motif: form.motif.trim(), reste: montant, interet: Math.round(montant * t.tauxPret / 100) }],
      notifications: [...d.notifications, notifyMe(user.id, 'Demande de prêt soumise', `Votre demande de prêt de ${fmtXAF(montant)} attend l'examen du trésorier.`)],
    }))
    setOpen(false)
    setForm({ montant: '', motif: '', g1: '', g2: '' })
    toast('Demande transmise au trésorier 🤝')
  }

  return (
    <div>
      <PageHeader title="Mes prêts" sub="Suivez vos emprunts et demandez un nouveau prêt avec deux garants (UC52)."
        actions={<Button icon="＋" onClick={() => setOpen(true)}>Demande de prêt</Button>} />

      {mesPrets.length === 0 && <EmptyState icon="🤝" title="Aucun prêt" sub="Vous n'avez aucun emprunt en cours ni demandé." />}
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
          <Field label="Montant souhaité (XAF)"><Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Ex : 150000" /></Field>
          <Field label="Motif"><Textarea value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Ex : Frais de scolarité, réapprovisionnement boutique…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Garant 1">
              <Select value={form.g1} onChange={e => setForm(f => ({ ...f, g1: e.target.value }))}>
                <option value="">— Choisir —</option>
                {elegibles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </Select>
            </Field>
            <Field label="Garant 2" hint="Doit être différent du garant 1">
              <Select value={form.g2} onChange={e => setForm(f => ({ ...f, g2: e.target.value }))}>
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

/* ============================ AIDES SOCIALES (UC53) ============================ */
export function AidesMembrePage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ type: 'Naissance', montant: '', motif: '' })

  const mesAides = db.aides.filter(a => a.membreId === user.id)

  const demander = () => {
    if (!(+form.montant > 0)) return toast('Le montant demandé doit être supérieur à 0', 'error')
    if (!form.motif.trim()) return toast('Décrivez votre situation (motif obligatoire)', 'error')
    setDb(d => ({
      ...d,
      aides: [...d.aides, { id: uid('ai'), membreId: user.id, type: form.type, montant: +form.montant, statut: 'En attente', date: today(), motif: form.motif.trim() }],
      notifications: [...d.notifications, notifyMe(user.id, 'Demande d\'aide soumise', `Votre demande d'aide (${form.type}) de ${fmtXAF(+form.montant)} attend la validation du bureau.`)],
    }))
    setOpen(false)
    setForm({ type: 'Naissance', montant: '', motif: '' })
    toast('Demande d\'aide transmise au bureau 🙏')
  }

  return (
    <div>
      <PageHeader title="Aides sociales" sub="Solidarité du club : décès, mariage, naissance, maladie (UC53)."
        actions={<Button icon="＋" onClick={() => setOpen(true)}>Demander une aide</Button>} />

      {mesAides.length === 0 && <EmptyState icon="🤲" title="Aucune demande d'aide" sub="Le club vous accompagne dans les grands moments de la vie." />}
      <div className="space-y-4 stagger">
        {mesAides.map(a => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-50 text-2xl">{AIDE_ICONS[a.type] || '🤲'}</span>
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
          <Field label="Type d'aide">
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={['Deces', 'Mariage', 'Naissance', 'Maladie']} />
          </Field>
          <Field label="Montant demandé (XAF)"><Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Ex : 100000" /></Field>
          <Field label="Motif / situation"><Textarea value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Décrivez brièvement votre situation…" /></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ ÉPARGNE (UC54 · UC55 · UC56) ============================ */
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
      <PageHeader title="Mon épargne" sub="Épargne individuelle, groupe d'épargne et intérêts redistribués (UC54 · UC55 · UC56)." />
      <div className="mb-5"><Tabs active={tab} onChange={setTab} tabs={[
        { id: 'indiv', label: 'Épargne individuelle' },
        { id: 'groupe', label: `Groupe d'épargne (${mesGroupes.length})` },
        { id: 'interets', label: 'Intérêts redistribués' },
      ]} /></div>

      {tab === 'indiv' && (!ep ? <EmptyState icon="🏦" title="Aucun compte d'épargne" sub="Contactez le trésorier pour ouvrir votre épargne individuelle." /> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 stagger">
            <Stat label="Solde épargne" value={fmtXAF(ep.solde)} sub={`Type : ${ep.type}`} icon="🏦" tone="brand" />
            <Stat label="Montant bloqué" value={fmtXAF(ep.bloquee)} sub={ep.bloquee ? 'Disponible après délai contractuel' : 'Aucun montant bloqué'} icon="🔒" tone="gold" />
          </div>
          <Card title="Répartition du solde" subtitle={`Part bloquée : ${pct(ep.bloquee, ep.solde)}% du total`}>
            <Progress value={ep.bloquee} max={ep.solde} tone="bg-gold-500" />
            <div className="mt-2 flex justify-between text-xs text-ink/50">
              <span>🔒 Bloqué : {fmtXAF(ep.bloquee)}</span><span>Disponible : {fmtXAF(ep.solde - ep.bloquee)}</span>
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

      {tab === 'groupe' && (mesGroupes.length === 0 ? <EmptyState icon="👥" title="Aucun groupe d'épargne" sub="Vous n'êtes membre d'aucun groupe pour le moment." /> : (
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
            <Stat label="Total intérêts reçus" value={fmtXAF(totalInterets)} sub={`${db.interetsRedistribues.length} redistribution(s)`} icon="🎁" tone="violet" />
            <Stat label="Moyenne par redistribution" value={fmtXAF(mesParts.length ? totalInterets / mesParts.length : 0)} sub="Sur l'historique disponible" icon="📈" tone="gold" />
          </div>
          <Card title="Historique des redistributions" subtitle="Intérêts des prêts redistribués aux membres" pad={false}>
            <div className="p-3">
              {mesParts.length === 0 && <EmptyState icon="🎁" title="Aucune redistribution" sub="Les intérêts seront redistribués en fin de cycle." />}
              {mesParts.map(({ ir, part }) => (
                <RowItem key={ir.id} icon="✨" title={`Redistribution du ${fmtDate(ir.date)}`}
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

/* ============================ ENCHÈRES (UC57) ============================ */
export function EncherePage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const [offre, setOffre] = useState('')

  const ouverte = db.encheres.find(e => e.statut === 'Ouverte')
  const best = ouverte && ouverte.offres.length ? ouverte.offres.reduce((a, b) => (b.montant > a.montant ? b : a)) : null
  const jeMene = best && best.membreId === user.id
  const minActuel = best ? best.montant + 1 : t.tauxEnchereMin
  const cloturees = db.encheres.filter(e => e.statut === 'Clôturée')

  const placer = () => {
    if (!(+offre > 0)) return toast('Saisissez un montant d\'enchère', 'error')
    if (+offre < minActuel) return toast(best ? `Votre offre doit dépasser l'offre actuelle (${fmtXAF(best.montant)})` : `L'enchère minimum est de ${fmtXAF(t.tauxEnchereMin)}`, 'error')
    setDb(d => ({
      ...d,
      encheres: d.encheres.map(e => e.id === ouverte.id ? { ...e, offres: [...e.offres, { membreId: user.id, montant: +offre }] } : e),
      notifications: [...d.notifications, notifyMe(user.id, 'Enchère placée', `Votre enchère de ${fmtXAF(+offre)} a été enregistrée pour le tour en cours.`)],
    }))
    setOffre('')
    toast(`Enchère de ${fmtXAF(+offre)} placée 🎯`)
  }

  return (
    <div>
      <PageHeader title="Enchère du tour" sub={`Le tour est attribué à la meilleure offre — enchère minimum : ${fmtXAF(t.tauxEnchereMin)} (UC57).`} />

      {ouverte ? (
        <Card title="Enchère en cours" subtitle={`Ouverte le ${fmtDate(ouverte.date)} — tour de ${byId(db.membres, ouverte.membreId)?.nom || '—'}`}
          actions={jeMene && <Badge tone="gold" dot>Vous menez l'enchère 🏆</Badge>}>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl bg-brand-950 p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">Meilleure offre actuelle</p>
                <p className="mt-1 font-display text-3xl font-semibold">{fmtXAF(best?.montant || 0)}</p>
                <p className="mt-1 text-xs text-brand-100/60">{best ? `Par ${byId(db.membres, best.membreId)?.nom}` : 'Aucune offre — soyez le premier !'}</p>
              </div>
              <Field label="Mon offre (XAF)" hint={`Minimum requis : ${fmtXAF(minActuel)}`}>
                <Input type="number" value={offre} onChange={e => setOffre(e.target.value)} placeholder={String(minActuel)} />
              </Field>
              <Button variant="gold" className="w-full" icon="🎯" onClick={placer}>Placer mon enchère</Button>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/45">Offres reçues ({ouverte.offres.length})</p>
              {ouverte.offres.length === 0 ? <EmptyState icon="🎯" title="Aucune offre" sub="Soyez le premier à enchérir." /> : (
                <div className="space-y-2">
                  {[...ouverte.offres].sort((a, b) => b.montant - a.montant).map((o, i) => (
                    <div key={i} className={cls('flex items-center justify-between rounded-xl border px-4 py-3', o.membreId === user.id ? 'border-gold-400 bg-gold-50/60' : 'border-black/5')}>
                      <div className="flex items-center gap-3">
                        <Avatar name={byId(db.membres, o.membreId)?.nom} size="sm" ring={i === 0} />
                        <div>
                          <p className="text-sm font-semibold">{byId(db.membres, o.membreId)?.nom} {o.membreId === user.id && <span className="text-gold-600">(moi)</span>}</p>
                          {i === 0 && <p className="text-[11px] font-bold text-gold-600">Meilleure offre</p>}
                        </div>
                      </div>
                      <span className="font-display font-semibold">{fmtXAF(o.montant)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : <EmptyState icon="🏁" title="Aucune enchère en cours" sub="Une enchère sera ouverte lors du prochain tour." />}

      <h3 className="mb-3 mt-6 font-display text-lg font-semibold animate-fade-up">Enchères clôturées</h3>
      {cloturees.length === 0 && <EmptyState icon="📜" title="Aucun historique d'enchère" />}
      <div className="grid gap-4 lg:grid-cols-2 stagger">
        {cloturees.map(e => {
          const bestOffre = e.offres.reduce((a, b) => (b.montant > a.montant ? b : a), e.offres[0])
          const gagnant = byId(db.membres, e.gagnantId)
          return (
            <Card key={e.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-ink/50">Clôturée le {fmtDate(e.date)}</p>
                  <p className="mt-1 font-semibold">Meilleure offre : {fmtXAF(bestOffre?.montant || 0)}</p>
                </div>
                <Badge tone={statusTone(e.statut)}>Clôturée</Badge>
              </div>
              {gagnant && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-gold-50 px-4 py-3">
                  <Avatar name={gagnant.nom} size="sm" ring />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gold-600">Gagnant du tour</p>
                    <p className="text-sm font-semibold">{gagnant.nom} {gagnant.id === user.id && <span className="text-gold-600">(moi) 🎉</span>}</p>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/* ============================ ATTESTATION DE MEMBRE (UC58) ============================ */
export function AttestationPage() {
  const { db } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const me = byId(db.membres, user.id)
  const nbCotis = db.cotisations.filter(c => c.membreId === user.id && c.statut === 'Validée').length

  return (
    <div>
      <PageHeader title="Attestation de membre" sub="Document officiel attestant votre appartenance au club, à imprimer (UC58)."
        actions={<Button variant="gold" icon="🖨" onClick={() => window.print()}>Imprimer l'attestation</Button>} />

      <div className="mx-auto max-w-2xl">
        <div className="print-area rounded-3xl border-4 border-double border-gold-500 bg-white p-8 text-center sm:p-12">
          <p className="font-display text-2xl font-bold text-brand-900">{t.nom}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[.3em] text-ink/45">{t.ville}</p>
          <div className="mx-auto my-6 h-px w-32 bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
          <p className="font-display text-xl font-semibold tracking-[.2em] text-gold-700">ATTESTATION DE MEMBRE</p>
          <p className="mt-8 text-sm text-ink/60">Le bureau exécutif atteste que</p>
          <p className="mt-2 font-display text-3xl font-semibold text-brand-950">{me?.nom}</p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink/70">
            est membre en règle du club depuis le <span className="font-semibold">{fmtDate(me?.dateAdhesion)}</span>,
            en tant que {BUREAU_LABELS[me?.role]?.toLowerCase()} du club {t.nom}, et a effectué
            <span className="font-semibold"> {nbCotis} cotisation(s) validée(s)</span>.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Badge tone={statusTone(me?.statut)}>Statut : {me?.statut}</Badge>
            <Badge tone="gray">Tontine : {t.statut}</Badge>
          </div>
          <p className="mt-10 text-sm text-ink/60">Fait à {t.ville.split('—')[0].trim()}, le {fmtDate(today())}</p>
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-ink/60">
            <div className="border-t border-ink/30 pt-2 font-semibold">Le Président</div>
            <div className="border-t border-ink/30 pt-2 font-semibold">Le Trésorier</div>
          </div>
          <p className="mt-8 text-[10px] text-ink/35">Attestation générée par TontiGest · Réf. {fmtNum(nbCotis)} cotisations · {t.banque.split('—')[0].trim()}</p>
        </div>
        <p className="no-print mt-4 text-center text-xs text-ink/45">💡 Utilisez « Imprimer l'attestation » puis enregistrez en PDF si besoin.</p>
      </div>
    </div>
  )
}
