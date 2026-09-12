import { useState } from 'react'
import { useStore, useAuth } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Table, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem, Progress } from '../components/ui'
import { Donut, Bars, Legend } from '../components/charts'
import { fmtXAF, fmtDate, fmtNum, today, now, uid, sum, byId, pct, monthKey, monthLabel, cls } from '../lib/utils'
import { pdfBordereau, pdfVersement, pdfRapport } from '../lib/pdf'
import {
  Landmark, Inbox, Timer, HandCoins, CircleCheck, Check, Banknote, CreditCard,
  Plus, Repeat, TriangleAlert, ClipboardList, Zap, Clock, PiggyBank, Lock,
  LockOpen, Users, Gift, TrendingUp, Scale, Flag, ChartColumn, Printer,
  Flower2, HeartHandshake, Baby, Stethoscope, HandHelping, Settings,
  ArrowDown, ArrowUp, Coins,
} from '../components/icons'

/* Badge OM stylé (Orange Money) */
const omBadge = (cls2 = 'h-8 w-8 text-[11px]') => (
  <span className={`grid ${cls2} place-items-center rounded-full bg-orange-500 font-black text-white`} title="Orange Money">OM</span>
)
/* Badge MoMo stylé (MTN Mobile Money) */
const momoBadge = (cls2 = 'h-8 w-8 text-[9px]') => (
  <span className={`grid ${cls2} place-items-center rounded-full bg-yellow-400 font-black text-brand-900`} title="MTN MoMo">MoMo</span>
)

/* Helpers partagés du module trésorier */
/* Toute cotisation (quelle que soit la méthode de paiement) alimente la caisse
   des cotisations ; l'épargne volontaire alimente la caisse d'épargne. */
const COMPTE_OF = { 'Espèces': 'Cotisation', 'Orange Money': 'Cotisation', 'MTN MoMo': 'Cotisation', 'Carte': 'Cotisation' }
const lastMonths = (n = 6) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - (n - 1 - i)); return d.toISOString().slice(0, 7)
})

function notify(d, membreId, titre, message) {
  return [...d.notifications, { id: uid('nt'), pour: membreId, titre, message, lu: false, date: now() }]
}
function validePaiement(d, cot) {
  const compte = COMPTE_OF[cot.methode] || 'Cotisation'
  const devise = cot.devise || 'XAF'
  const caisseDevise = d.caisse[devise] || {}
  return {
    ...d,
    cotisations: d.cotisations.map(o => o.id === cot.id ? { ...o, statut: 'Validée' } : o),
    caisse: { ...d.caisse, [devise]: { ...caisseDevise, [compte]: (caisseDevise[compte] || 0) + Number(cot.montant || 0) } },
    mouvements: [...d.mouvements, {
      id: uid('mv'), type: 'Cotisation', sens: 'in', compte,
      montant: cot.montant, devise, date: today(),
      note: `Cotisation ${cot.periode} — ${cot.ref}`, membreId: cot.membreId,
    }],
    notifications: notify(d, cot.membreId, 'Cotisation validée', `Votre paiement de ${fmtXAF(cot.montant)} (${cot.periode}) a été validé par le trésorier.`),
  }
}

/* ============================ TABLEAU DE BORD TRÉSORIER ============================ */
export function TresorierHome() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const validées = db.cotisations.filter(o => o.statut === 'Validée')
  const attendes = db.cotisations.filter(o => o.statut === 'En attente')
  const totalCaisse = sum(Object.values(db.caisse.XAF))
  const mois = monthKey()
  const cotisMois = sum(validées.filter(o => monthKey(o.date) === mois), o => o.montant)
  const pretsEnCours = db.prets.filter(p => p.statut === 'En cours')
  const totalPrets = sum(pretsEnCours, p => p.montant)
  const caisseData = Object.entries(db.caisse.XAF || {})
    .map(([label, value], i) => ({ label, value: value || 0, color: ['#187830', '#d8a800', '#07331a', '#9ac48b', '#e7b233', '#8fb396', '#6b7f8e', '#b5651d'][i % 8] }))
    .filter(o => o.value > 0 || ['Cotisation', 'Épargne'].includes(o.label))
  const bars = lastMonths(6).map(k => ({ label: monthLabel(k).split(' ')[0].slice(0, 4), value: sum(validées.filter(o => monthKey(o.date) === k), o => o.montant) }))
  const valider = (cot) => { setDb(d => validePaiement(d, cot)); toast(`Paiement de ${byId(db.membres, cot.membreId)?.nom || '—'} validé (${fmtXAF(cot.montant)})`) }
  const rejeter = (cot) => {
    setDb(d => ({ ...d, cotisations: d.cotisations.map(o => o.id === cot.id ? { ...o, statut: 'Rejetée' } : o), notifications: notify(d, cot.membreId, 'Paiement rejeté', `Votre paiement de ${fmtXAF(cot.montant)} (${cot.periode}) a été rejeté par le trésorier.`) }))
    toast(`Paiement de ${byId(db.membres, cot.membreId)?.nom || '—'} rejeté`, 'error')
  }
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-6 text-white sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#07331a,#12632a_50%,#187830)] bg-[length:200%_200%] animate-gradient" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl animate-float" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-300">Espace Trésorier · {t.nom}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Bonjour {user?.nom?.split(' ')[0] || 'Trésorier'}, la <span className="gold-text">caisse est saine</span>.</h1>
          <p className="mt-2 max-w-xl text-sm text-brand-100/70">Cotisation : {fmtXAF(t.montantCotisation)} {t.frequence.toLowerCase()} · Banque : {t.banque} · {attendes.length} paiement(s) à valider</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat large tone="gold" label="Trésor total" value={fmtXAF(totalCaisse)} sub="Caisse + banque + mobile money" icon={<Landmark size={20} />} />
        <Stat tone="brand" label="Cotisations du mois" value={fmtXAF(cotisMois)} sub={`${validées.filter(o => monthKey(o.date) === mois).length} paiements validés`} icon={<Inbox size={18} />} />
        <Stat tone="brand" label="Paiements en attente" value={fmtNum(attendes.length)} sub="OM / MoMo / Carte à confirmer" icon={<Timer size={18} />} />
        <Stat tone="brand" label="Prêts en cours" value={fmtXAF(totalPrets)} sub={`${pretsEnCours.length} prêt(s) à recouvrer`} icon={<HandCoins size={18} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card title="Répartition de la caisse" subtitle="Multi-comptes en XAF" className="xl:col-span-2">
          <div className="flex items-center gap-6">
            <Donut data={caisseData} center={<div><p className="font-display text-lg font-semibold">{fmtNum(sum(Object.values(db.caisse.XAF)) / 1000)}K</p><p className="text-[10px] font-bold text-ink/40">FCFA</p></div>} />
            <Legend data={caisseData} />
          </div>
        </Card>
        <Card title="Encaissements mensuels" subtitle="Cotisations validées (6 derniers mois)" className="xl:col-span-3">
          <Bars data={bars} />
        </Card>
      </div>

      <Card title="Paiements mobiles à valider" subtitle="Orange Money, MTN MoMo et carte — validation rapide" pad={false}
        actions={<Badge tone={attendes.length ? 'amber' : 'green'} dot={!!attendes.length}>{attendes.length} en attente</Badge>}>
        <div className="p-3">
          {attendes.length === 0 && <EmptyState icon={<CircleCheck size={16} />} title="Aucun paiement en attente" sub="Tous les encaissements ont été traités." />}
          {attendes.slice().reverse().map(o => {
            const m = byId(db.membres, o.membreId)
            return (
              <RowItem key={o.id} icon={o.methode === 'Orange Money' ? omBadge('h-9 w-9 text-[11px]') : o.methode === 'MTN MoMo' ? momoBadge('h-9 w-9 text-[9px]') : <CreditCard size={16} className="text-brand-700" />}
                title={`${m?.nom || '—'} — ${fmtXAF(o.montant)}`}
                sub={`${o.methode} · période ${o.periode} · réf. ${o.ref} · ${fmtDate(o.date)}`}
                right={<div className="flex gap-1.5">
                  <Button size="sm" onClick={() => valider(o)} icon={<Check size={14} />}>Valider</Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => rejeter(o)}>Rejeter</Button>
                </div>} />
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/* ============================ COTISATIONS ============================ */
export function CotisationsPage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ membreId: '', montant: db.tontine.montantCotisation, periode: monthKey(), date: today() })
  const attendes = db.cotisations.filter(o => o.statut === 'En attente')
  const récents = db.cotisations.slice().reverse().slice(0, 12)
  const membres = Object.fromEntries(db.membres.map(m => [m.id, m]))

  const encaisser = () => {
    if (!form.membreId) return toast('Choisissez le membre concerné', 'error')
    if (!(+form.montant > 0)) return toast('Le montant doit être supérieur à 0', 'error')
    const m = membres[form.membreId]
    const cot = { id: uid('cot'), membreId: form.membreId, montant: +form.montant, devise: 'XAF', date: form.date || today(), periode: form.periode || monthKey(), methode: 'Espèces', ref: uid('TG'), statut: 'Validée' }
    setDb(d => ({
      ...d,
      cotisations: [...d.cotisations, cot],
      caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, Cotisation: (d.caisse.XAF.Cotisation || 0) + cot.montant } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Cotisation', sens: 'in', compte: 'Cotisation', montant: cot.montant, devise: 'XAF', date: cot.date, note: `Cotisation ${cot.periode} (espèces)`, membreId: cot.membreId }],
      notifications: notify(d, cot.membreId, 'Cotisation reçue', `Votre cotisation de ${fmtXAF(cot.montant)} pour ${cot.periode} a été encaissée en espèces.`),
    }))
    setOpen(false); setForm(f => ({ ...f, membreId: '', montant: db.tontine.montantCotisation }))
    toast(`Cotisation de ${m?.nom || '—'} encaissée : ${fmtXAF(cot.montant)}`)
  }
  const valider = (cot) => { setDb(d => validePaiement(d, cot)); toast(`Paiement ${cot.ref} validé (${fmtXAF(cot.montant)})`) }
  const rejeter = (cot) => {
    setDb(d => ({ ...d, cotisations: d.cotisations.map(o => o.id === cot.id ? { ...o, statut: 'Rejetée' } : o), notifications: notify(d, cot.membreId, 'Paiement rejeté', `Votre paiement de ${fmtXAF(cot.montant)} (${cot.periode}) a été rejeté.`) }))
    toast(`Paiement ${cot.ref} rejeté`, 'error')
  }
  const methodesIcon = {
    'Espèces': <Banknote size={14} className="text-brand-700" />,
    'Orange Money': omBadge('h-5 w-5 text-[8px]'),
    'MTN MoMo': momoBadge('h-5 w-5 text-[7px]'),
    'Carte': <CreditCard size={14} className="text-brand-700" />,
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Cotisations" sub="Encaissement manuel en espèces et validation des paiements mobiles."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Encaisser en espèces</Button>} />

      <Card title={`Paiements en attente (${attendes.length})`} subtitle="À valider après vérification du reçu mobile" pad={false}>
        <Table empty="Aucun paiement en attente — tout est à jour" rows={attendes} columns={[
          { key: 'membre', label: 'Membre', render: r => <span className="flex items-center gap-2"><Avatar name={membres[r.membreId]?.nom || '?'} size="sm" /><span className="font-semibold">{membres[r.membreId]?.nom || '—'}</span></span> },
          { key: 'montant', label: 'Montant', render: r => <span className="font-bold">{fmtXAF(r.montant)}</span> },
          { key: 'methode', label: 'Méthode', render: r => <Badge tone="brand"><span className="flex items-center gap-1.5">{methodesIcon[r.methode]} {r.methode}</span></Badge> },
          { key: 'periode', label: 'Période' },
          { key: 'ref', label: 'Référence', render: r => <span className="font-mono text-xs text-ink/50">{r.ref}</span> },
          { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
          { key: 'actions', label: 'Actions', render: r => <div className="flex gap-1.5"><Button size="sm" onClick={() => valider(r)}>Valider</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => rejeter(r)}>Rejeter</Button></div> },
        ]} />
      </Card>

      <Card title="Cotisations récentes" subtitle="Historique des encaissements" pad={false}>
        <Table empty="Aucune cotisation enregistrée" rows={récents} columns={[
          { key: 'membre', label: 'Membre', render: r => membres[r.membreId]?.nom || '—' },
          { key: 'montant', label: 'Montant', render: r => <span className="font-bold">{fmtXAF(r.montant)}</span> },
          { key: 'methode', label: 'Méthode', render: r => <Badge tone="brand"><span className="flex items-center gap-1.5">{methodesIcon[r.methode]} {r.methode}</span></Badge> },
          { key: 'periode', label: 'Période' },
          { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
          { key: 'statut', label: 'Statut', render: r => <Badge tone={statusTone(r.statut)}>{r.statut}</Badge> },
        ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Encaisser une cotisation (espèces)" subtitle="Le paiement est enregistré comme validé"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="gold" onClick={encaisser} icon={<Banknote size={16} />}>Encaisser</Button></>}>
        <div className="space-y-4">
          <Field label="Membre">
            <Select value={form.membreId} onChange={e => setForm(f => ({ ...f, membreId: e.target.value }))}>
              <option value="">— Choisir un membre —</option>
              {db.membres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant (XAF)"><Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: +e.target.value }))} /></Field>
            <Field label="Période"><Input type="month" value={form.periode} onChange={e => setForm(f => ({ ...f, periode: e.target.value }))} /></Field>
          </div>
          <Field label="Date de l'encaissement"><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ CAISSE DU CLUB (XAF) ============================ */
/* Icône par défaut d'un compte personnalisé */
const customAccountIcon = <CreditCard size={16} key="oo" />

export function CaissePage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ devise: 'XAF', from: 'Cotisation', to: 'Épargne', montant: '', note: '' })
  const [tab, setTab] = useState('soldes')
  const [opOpen, setOpOpen] = useState(null) // { sens: 'in'|'out', compte, devise }
  const [opForm, setOpForm] = useState({ montant: '', note: '' })
  const [cfgForm, setCfgForm] = useState({ nom: '', periodicite: 'Libre', cible: 0, dateDebut: '', note: '' })
  const [filtre, setFiltre] = useState('tous')

  const comptesDe = () => Object.keys(db.caisse.XAF || {})
  const totalDe = () => sum(Object.values(db.caisse.XAF || {}))

  /* Palette visuelle par caisse — style portefeuille premium. */
  const STYLES_COMPTES = {
    Cotisation: { icon: <Coins size={18} key="cot" />, grad: 'from-brand-600 via-brand-500 to-[#20a043]', tag: 'Caisse principale' },
    'Épargne': { icon: <PiggyBank size={18} key="ep" />, grad: 'from-gold-500 via-gold-400 to-[#e8bd2a]', tag: 'Réserve du club' },
    Banque: { icon: <Landmark size={18} key="ba" />, grad: 'from-slate-700 via-slate-600 to-slate-500', tag: 'Compte bancaire' },
    Caisse: { icon: <Banknote size={18} key="oa" />, grad: 'from-emerald-700 via-emerald-600 to-emerald-500', tag: 'Espèces' },
    OM: { icon: omBadge('h-5 w-5 text-[7px]'), grad: 'from-orange-600 via-orange-500 to-amber-500', tag: 'Mobile money' },
    MoMo: { icon: momoBadge('h-5 w-5 text-[6px]'), grad: 'from-yellow-500 via-amber-400 to-yellow-300', tag: 'Mobile money' },
  }
  const styleCompte = (nom) => STYLES_COMPTES[nom] || { icon: customAccountIcon, grad: 'from-[#6d5bd0] via-[#8b7be8] to-[#a89ef2]', tag: 'Caisse dédiée' }

  const mouvementsFiltres = db.mouvements
    .filter(m => filtre === 'tous' ? true : filtre === 'in' ? m.sens === 'in' : m.sens === 'out')
    .slice()
    .reverse()
    .slice(0, 30)
  const MEMBRES = Object.fromEntries(db.membres.map(m => [m.id, m.nom]))

  const transfertsDispo = (devise) => comptesDe(devise)

  const transferer = () => {
    const montant = +form.montant
    if (!montant || montant <= 0) return toast('Montant invalide', 'error')
    if (form.from === form.to) return toast('Les deux comptes doivent être différents', 'error')
    if ((db.caisse[form.devise][form.from] || 0) < montant) return toast('Solde insuffisant sur le compte source', 'error')
    setDb(d => ({
      ...d,
      caisse: { ...d.caisse, [form.devise]: { ...d.caisse[form.devise], [form.from]: d.caisse[form.devise][form.from] - montant, [form.to]: (d.caisse[form.devise][form.to] || 0) + montant } },
      mouvements: [...d.mouvements,
        { id: uid('mv'), type: 'Virement interne', sens: 'out', compte: form.from, montant, devise: form.devise, date: today(), note: `Virement vers ${form.to}${form.note ? ' — ' + form.note : ''}` },
        { id: uid('mv'), type: 'Virement interne', sens: 'in', compte: form.to, montant, devise: form.devise, date: today(), note: `Virement depuis ${form.from}${form.note ? ' — ' + form.note : ''}` },
      ],
    }))
    setOpen(false)
    toast(`Transfert de ${fmtXAF(montant)} : ${form.from} → ${form.to} effectué`)
    setForm(f => ({ ...f, montant: '', note: '' }))
  }

  /* --- Approvisionnement / retrait direct sur un compte --- */
  const validerOp = () => {
    const montant = +opForm.montant
    if (!montant || montant <= 0) return toast('Saisissez un montant supérieur à 0', 'error')
    if (opOpen.sens === 'out' && (db.caisse[opOpen.devise][opOpen.compte] || 0) < montant) return toast('Solde insuffisant sur ce compte', 'error')
    const libelle = opOpen.sens === 'in' ? 'Approvisionnement' : 'Retrait de caisse'
    setDb(d => ({
      ...d,
      caisse: { ...d.caisse, [opOpen.devise]: { ...d.caisse[opOpen.devise], [opOpen.compte]: (d.caisse[opOpen.devise][opOpen.compte] || 0) + (opOpen.sens === 'in' ? montant : -montant) } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: libelle, sens: opOpen.sens, compte: opOpen.compte, montant, devise: opOpen.devise, date: today(), note: opForm.note || libelle }],
    }))
    setOpOpen(null); setOpForm({ montant: '', note: '' })
    toast(`${libelle} de ${fmtXAF(montant)} sur ${opOpen.compte} enregistré`)
  }

  /* --- Configuration des comptes --- */
  const CAISSES_DEFAUT = ['Cotisation', 'Épargne']
  const metaCompte = (devise, compte) => (db.tontine.caisseMeta || {})[`${devise}:${compte}`]
  const ajouterCompte = () => {
    const nom = cfgForm.nom.trim()
    if (!nom) return toast('Nom de la caisse obligatoire', 'error')
    if (CAISSES_DEFAUT.includes(nom)) return toast('« Cotisation » et « Épargne » sont des caisses permanentes — choisissez un autre nom', 'error')
    if (!db.caisse || !db.caisse.XAF) return toast('Caisse du club introuvable', 'error')
    if (comptesDe().includes(nom)) return toast('Cette caisse existe déjà', 'error')
    setDb(d => ({
      ...d,
      caisse: { ...d.caisse, XAF: { ...(d.caisse.XAF || {}), [nom]: 0 } },
      tontine: { ...d.tontine, caisseMeta: { ...(d.tontine.caisseMeta || {}), [`XAF:${nom}`]: { periodicite: cfgForm.periodicite || 'Libre', cible: cfgForm.cible || 0, dateDebut: cfgForm.dateDebut || null, note: cfgForm.note || '' } } },
    }))
    setCfgForm({ nom: '', periodicite: 'Libre', cible: 0, dateDebut: '', note: '' })
    toast(`Caisse « ${nom} » créée`)
  }
  const supprimerCompte = (devise, compte) => {
    if (CAISSES_DEFAUT.includes(compte)) return toast('Cette caisse est permanente et ne peut pas être supprimée', 'error')
    const solde = db.caisse[devise][compte] || 0
    if (solde !== 0) return toast('Solde non nul — virez le solde avant de supprimer cette caisse', 'error')
    setDb(d => {
      const nv = { ...d.caisse[devise] }
      delete nv[compte]
      const meta = { ...(d.tontine.caisseMeta || {}) }
      delete meta[`${devise}:${compte}`]
      return { ...d, caisse: { ...d.caisse, [devise]: nv }, tontine: { ...d.tontine, caisseMeta: meta } }
    })
    toast(`Caisse « ${compte} » supprimée`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Caisses du club" sub="Caisse de cotisation et caisse d'épargne par défaut, caisses complémentaires (annuelle, scolaire…), virements internes et journal complet."
        actions={<><Button variant="outline" icon={<Settings size={16} />} onClick={() => setTab('config')}>Configurer les caisses</Button><Button variant="gold" icon={<Repeat size={16} />} onClick={() => setOpen(true)}>Virement interne</Button></>} />

      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'soldes', label: 'Soldes & opérations' },
        { id: 'journal', label: `Journal (${db.mouvements.length})` },
        { id: 'config', label: 'Configuration' },
      ]} />

      {tab === 'soldes' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-semibold">Caisses du club — Francs CFA (XAF)</h3>
              <p className="text-sm text-ink/60">Total : <b>{fmtXAF(totalDe())}</b></p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
              {comptesDe().map(cpte => {
                const meta = metaCompte('XAF', cpte)
                const st = styleCompte(cpte)
                const solde = db.caisse.XAF[cpte] || 0
                const partTotal = totalDe() > 0 ? Math.round(solde / totalDe() * 100) : 0
                const avancement = meta?.cible > 0 ? Math.min(100, Math.round(solde / meta.cible * 100)) : null
                return (
                  <div key={cpte} className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(4,34,15,.05),0_8px_24px_-12px_rgba(4,34,15,.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-14px_rgba(4,34,15,.25)]">
                    {/* Bandeau coloré de la caisse */}
                    <div className={`relative h-20 bg-gradient-to-br ${st.grad} px-4 py-3 text-white`}>
                      <div className="absolute inset-0 opacity-[.13] [background-image:repeating-linear-gradient(115deg,transparent_0_7px,rgba(255,255,255,.5)_7px_8px,transparent_8px_16px)]" />
                      <div className="relative flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-display text-base font-bold tracking-tight">{cpte}</p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/75">{st.tag}</p>
                        </div>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 shadow-inner backdrop-blur-sm">{st.icon}</span>
                      </div>
                      <span className="absolute right-0 top-0 h-0 w-0 border-l-[26px] border-t-[26px] border-l-transparent border-t-white/15" />
                    </div>

                    {/* Corps : solde + progression */}
                    <div className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Solde disponible</p>
                      <p className="mt-0.5 truncate font-display text-[22px] font-semibold leading-tight">{fmtXAF(solde)}</p>

                      {avancement !== null ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-ink/45">Objectif {fmtXAF(meta.cible)}</span>
                            <span className="text-gold-600">{avancement}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[.07]">
                            <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all" style={{ width: `${avancement}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-ink/45">{meta?.periodicite && meta.periodicite !== 'Libre' ? meta.periodicite : 'Part du trésor'}</span>
                            <span className="text-brand-600">{partTotal}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[.07]">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-500 transition-all" style={{ width: `${Math.max(partTotal, 3)}%` }} />
                          </div>
                        </div>
                      )}

                      {(meta?.note || (meta?.dateDebut && meta?.cible > 0)) && (
                        <p className="mt-2.5 truncate text-[10px] font-medium text-ink/40">
                          {meta?.cible > 0 && meta?.dateDebut ? `Depuis le ${fmtDate(meta.dateDebut)}` : ''}{meta?.note ? `${meta.cible > 0 && meta.dateDebut ? ' · ' : ''}${meta.note}` : ''}
                        </p>
                      )}

                      <div className="mt-4 flex gap-1.5 border-t border-black/5 pt-3">
                        <Button size="sm" variant="outline" className="flex-1" icon={<ArrowDown size={13} />} onClick={() => { setOpOpen({ sens: 'in', compte: cpte, devise: 'XAF' }); setOpForm({ montant: '', note: '' }) }}>Approvisionner</Button>
                        <Button size="sm" variant="ghost" className="flex-1 text-red-600" icon={<ArrowUp size={13} />} onClick={() => { setOpOpen({ sens: 'out', compte: cpte, devise: 'XAF' }); setOpForm({ montant: '', note: '' }) }}>Retirer</Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Stat large tone="gold" label="Trésor total du club" value={fmtXAF(totalDe())} sub={`${comptesDe().length} caisse(s) · XAF`} icon={<Landmark size={20} />} />
            <Stat tone="brand" label="Mouvements ce mois" value={db.mouvements.filter(m => monthKey(m.date) === monthKey()).length} sub="Entrées et sorties" icon={<ArrowDown size={18} />} />
          </div>
        </div>
      )}

      {tab === 'journal' && (
        <Card pad={false} title="Journal de caisse" subtitle="30 derniers mouvements — toutes caisses du club"
          actions={<Select value={filtre} onChange={e => setFiltre(e.target.value)} className="w-40">
            <option value="tous">Tous les sens</option>
            <option value="in">Entrées</option>
            <option value="out">Sorties</option>
          </Select>}>
          <div className="p-5">
            <Table empty="Aucun mouvement" rows={mouvementsFiltres} columns={[
              { key: 'sens', label: '', render: r => <span className={cls('grid h-5 w-5 place-items-center rounded-md', r.sens === 'in' ? 'bg-brand-50 text-brand-600' : 'bg-red-50 text-red-600')}>{r.sens === 'in' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}</span> },
              { key: 'type', label: 'Type', render: r => <span className="font-semibold">{r.type}</span> },
              { key: 'note', label: 'Détail', render: r => <span className="text-ink/60">{r.note}{r.membreId && MEMBRES[r.membreId] ? ` · ${MEMBRES[r.membreId]}` : ''}</span> },
              { key: 'compte', label: 'Compte', render: r => <Badge tone="gray">{r.compte}</Badge> },
              { key: 'montant', label: 'Montant', render: r => <span className={cls('font-bold', r.sens === 'in' ? 'text-brand-700' : 'text-red-600')}>{r.sens === 'in' ? '+' : '−'}{fmtXAF(r.montant, r.devise || 'XAF')}</span> },
              { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
            ]} />
          </div>
        </Card>
      )}

      {tab === 'config' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          <Card title="Caisses du club" subtitle="Consultez, paramétrez ou supprimez les caisses — tout est en francs CFA (XAF)" pad={false}>
            <div className="p-3">
              <div className="space-y-2">
                {comptesDe().map(cpte => {
                  const st = styleCompte(cpte)
                  const meta = metaCompte('XAF', cpte)
                  const avancement = meta?.cible > 0 ? Math.min(100, Math.round((db.caisse.XAF[cpte] || 0) / meta.cible * 100)) : null
                  return (
                    <div key={cpte} className="flex items-center gap-3 rounded-xl border border-black/5 px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/40">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${st.grad} text-white shadow-sm`}>{st.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{cpte} {CAISSES_DEFAUT.includes(cpte) && <Badge tone="green" className="ml-1">Par défaut</Badge>}</p>
                        <p className="truncate text-xs text-ink/50">
                          {fmtXAF(db.caisse.XAF[cpte] || 0)}{meta ? ` · ${meta.periodicite}` : ''}{avancement !== null ? ` · objectif à ${avancement}%` : ''}
                        </p>
                      </div>
                      {CAISSES_DEFAUT.includes(cpte)
                        ? <Badge tone="gray">Permanente</Badge>
                        : (db.caisse.XAF[cpte] || 0) === 0
                          ? <Button size="sm" variant="ghost" className="text-red-600" onClick={() => supprimerCompte('XAF', cpte)}>Supprimer</Button>
                          : <Badge tone="gray">Solde non nul</Badge>}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
          <Card title="Ajouter une caisse" subtitle="Ex : caisse annuelle, caisse scolaire, projet… — avec sa périodicité et ses paramètres.">
            <div className="space-y-4">
              <Field label="Nom de la caisse" required hint="Ce nom apparaîtra dans toute la trésorerie du club.">
                <Input value={cfgForm.nom} onChange={e => setCfgForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Caisse annuelle" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Périodicité" hint="Rythme des versements attendus dans cette caisse.">
                  <Select value={cfgForm.periodicite} onChange={e => setCfgForm(f => ({ ...f, periodicite: e.target.value }))} options={['Libre', 'Hebdomadaire', 'Mensuelle', 'Trimestrielle', 'Semestrielle', 'Annuelle']} />
                </Field>
                <Field label="Montant cible (XAF)" hint="Objectif de collecte pour la caisse (0 = libre).">
                  <Input type="number" value={cfgForm.cible} onChange={e => setCfgForm(f => ({ ...f, cible: +e.target.value }))} placeholder="Ex : 500000" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date de début"><Input type="date" value={cfgForm.dateDebut} onChange={e => setCfgForm(f => ({ ...f, dateDebut: e.target.value }))} /></Field>
                <Field label="Note (optionnel)"><Input value={cfgForm.note} onChange={e => setCfgForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : pour l'habit de fin d'année" /></Field>
              </div>
              <Button className="w-full" icon={<Plus size={16} />} onClick={ajouterCompte}>Créer la caisse</Button>
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">
                Les caisses <b>Cotisation</b> et <b>Épargne</b> existent par défaut dans chaque tontine et ne peuvent pas être supprimées.
                Une caisse complémentaire ne peut être supprimée que si son solde est nul.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* --- Virement interne --- */}
      <Modal open={open} onClose={() => setOpen(false)} title="Virement interne" subtitle="Déplacer des fonds entre les caisses du club (XAF)"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={transferer} icon={<Repeat size={16} />}>Effectuer le virement</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Depuis"><Select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} options={transfertsDispo('XAF')} /></Field>
            <Field label="Vers"><Select value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} options={transfertsDispo('XAF')} /></Field>
          </div>
          <Field label="Montant" hint={`Disponible sur ${form.from} : ${fmtXAF(db.caisse[form.devise]?.[form.from] || 0, form.devise)}`}>
            <Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Note (optionnel)"><Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : sécurité de la caisse" /></Field>
        </div>
      </Modal>

      {/* --- Approvisionnement / retrait --- */}
      <Modal open={!!opOpen} onClose={() => setOpOpen(null)}
        title={opOpen?.sens === 'in' ? `Approvisionner « ${opOpen?.compte} »` : `Retirer de « ${opOpen?.compte} »`}
        subtitle={opOpen ? `Solde actuel : ${fmtXAF(db.caisse[opOpen.devise][opOpen.compte] || 0)}` : ''}
        footer={<><Button variant="ghost" onClick={() => setOpOpen(null)}>Annuler</Button><Button variant={opOpen?.sens === 'in' ? 'gold' : 'primary'} onClick={validerOp}>{opOpen?.sens === 'in' ? 'Approvisionner' : 'Retirer'}</Button></>}>
        <div className="space-y-4">
          <Field label={`Montant (${opOpen?.devise})`} required>
            <Input type="number" value={opForm.montant} onChange={e => setOpForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Motif / note" hint={opOpen?.sens === 'in' ? 'Ex : Dons, recettes d\'activité, fonds de démarrage…' : 'Ex : Frais de séance, achat de matériel…'}>
            <Input value={opForm.note} onChange={e => setOpForm(f => ({ ...f, note: e.target.value }))} placeholder="Motif de l'opération" />
          </Field>
        </div>
      </Modal>

    </div>
  )
}

/* ============================ BANQUE ============================ */
export function BanqueOpsPage() {
  const { db, setDb, toast } = useStore()
  const [opForm, setOpForm] = useState({ montant: '', note: '' })
  const [bordereau, setBordereau] = useState(null)
  const [rel, setRel] = useState('')
  const banque = db.caisse.XAF.Banque || 0
  const caisse = db.caisse.XAF.Cotisation || 0
  const ecart = rel === '' ? null : (+rel || 0) - banque

  const op = (kind) => {
    const montant = +opForm.montant
    if (!montant || montant <= 0) return toast('Montant invalide', 'error')
    if (kind === 'versement' && caisse < montant) return toast('Fonds de cotisation insuffisants pour ce versement', 'error')
    if (kind === 'retrait' && banque < montant) return toast('Solde bancaire insuffisant', 'error')
    const label = kind === 'versement' ? 'Versement bancaire' : 'Retrait bancaire'
    const note = opForm.note || (kind === 'versement' ? 'Dépôt en banque' : 'Retrait vers la caisse des cotisations')
    setDb(d => ({
      ...d,
      caisse: { ...d.caisse, XAF: kind === 'versement' ? { ...d.caisse.XAF, Cotisation: caisse - montant, Banque: banque + montant } : { ...d.caisse.XAF, Cotisation: caisse + montant, Banque: banque - montant } },
      mouvements: [...d.mouvements,
        { id: uid('mv'), type: label, sens: 'out', compte: kind === 'versement' ? 'Cotisation' : 'Banque', montant, devise: 'XAF', date: today(), note },
        { id: uid('mv'), type: label, sens: 'in', compte: kind === 'versement' ? 'Banque' : 'Cotisation', montant, devise: 'XAF', date: today(), note },
      ],
    }))
    setBordereau({ kind, montant, note, date: today() })
    setOpForm({ montant: '', note: '' })
    toast(`${label} de ${fmtXAF(montant)} enregistré — bordereau généré`)
  }

  /* Journal des opérations bancaires réellement enregistrées par le trésorier. */
  const journalBancaire = db.mouvements
    .filter(m => m.type === 'Versement bancaire' || m.type === 'Retrait bancaire')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)))

  const telechargerBordereau = () => {
    if (!bordereau) return
    pdfBordereau({
      club: db.tontine,
      operation: {
        type: bordereau.kind === 'versement' ? 'Versement (Caisse → Banque)' : 'Retrait (Banque → Caisse)',
        date: bordereau.date, compte: bordereau.kind === 'versement' ? 'Caisse → Banque' : 'Banque → Caisse',
        montant: bordereau.montant, devise: 'XAF', banque: db.tontine.banque,
        ref: uid('BD').slice(0, 12).toUpperCase(),
      },
    })
    toast('Bordereau téléchargé en PDF')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Opérations bancaires" sub="Enregistrez vos dépôts et retraits à la banque — chaque opération génère un bordereau PDF." />

      <div className="grid gap-4 sm:grid-cols-2 stagger">
        <Stat large tone="brand" label="Solde bancaire" value={fmtXAF(banque)} sub={`Compte ${db.tontine.banque || '—'}`} icon={<Landmark size={20} />} />
        <Stat tone="gold" label="Opérations enregistrées" value={fmtNum(journalBancaire.length)} sub={`${journalBancaire.filter(m => m.type === 'Versement bancaire').length} dépôt(s) · ${journalBancaire.filter(m => m.type === 'Retrait bancaire').length} retrait(s)`} icon={<ArrowDown size={18} />} />
      </div>

      <Card title="Transactions bancaires enregistrées" subtitle="Dépôts et retraits que vous avez effectués à la banque" pad={false}>
        {journalBancaire.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Aucune opération bancaire enregistrée" sub="Utilisez les formulaires ci-dessous pour enregistrer un dépôt ou un retrait effectué à la banque." />
          </div>
        ) : (
          <div className="p-3">
            <Table rows={journalBancaire} columns={[
              { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
              { key: 'type', label: 'Opération', render: r => <span className="font-semibold">{r.type === 'Versement bancaire' ? 'Dépôt à la banque' : 'Retrait de la banque'}</span> },
              { key: 'montant', label: 'Montant', render: r => <span className="font-bold tabular-nums">{fmtXAF(r.montant)}</span> },
              { key: 'note', label: 'Note', render: r => <span className="text-xs text-ink/60">{r.note || '—'}</span> },
              { key: 'sens', label: '', render: r => <Badge tone={r.compte === 'Banque' ? 'green' : 'gray'}>{r.compte === 'Banque' ? '→ Banque' : '→ Caisse'}</Badge> },
            ]} />
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 stagger">
        <Card title="Enregistrer un dépôt" subtitle="Espèces déposées à la banque">
          <div className="space-y-4">
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">Caisse de cotisation : <b>{fmtXAF(caisse)}</b> → Compte <b>{db.tontine.banque || 'bancaire'}</b></p>
            <Field label="Montant déposé (XAF)"><Input type="number" value={opForm.montant} onChange={e => setOpForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" /></Field>
            <Field label="Note"><Input value={opForm.note} onChange={e => setOpForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : sécurité de la caisse" /></Field>
            <Button variant="gold" className="w-full" icon={<Landmark size={16} />} onClick={() => op('versement')}>Enregistrer le dépôt</Button>
          </div>
        </Card>
        <Card title="Enregistrer un retrait" subtitle="Fonds retirés de la banque vers la caisse">
          <div className="space-y-4">
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">Solde bancaire : <b>{fmtXAF(banque)}</b></p>
            <Field label="Montant retiré (XAF)"><Input type="number" value={opForm.montant} onChange={e => setOpForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" /></Field>
            <Field label="Note"><Input value={opForm.note} onChange={e => setOpForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : paiement des aides du mois" /></Field>
            <Button className="w-full" icon={<ArrowDown size={16} />} onClick={() => op('retrait')}>Enregistrer le retrait</Button>
          </div>
        </Card>
      </div>

      <Card title="Rapprochement bancaire" subtitle="Comparer le relevé bancaire au solde du club">
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <Field label="Solde du relevé bancaire (XAF)"><Input type="number" value={rel} onChange={e => setRel(e.target.value)} placeholder="Ex : 4380000" /></Field>
          <Field label="Solde TontiGest"><div className="rounded-xl bg-black/[.04] px-3.5 py-2.5 text-sm font-bold">{fmtXAF(banque)}</div></Field>
          <div className="flex items-center">
            {ecart === null ? <Badge tone="gray">En attente du relevé</Badge>
              : ecart === 0 ? <Badge tone="green" dot>Rapproché — aucun écart</Badge>
              : <Badge tone={Math.abs(ecart) > 100000 ? 'red' : 'amber'} dot>Écart : {fmtXAF(Math.abs(ecart))} {ecart > 0 ? '(relevé supérieur)' : '(relevé inférieur)'}</Badge>}
          </div>
        </div>
        {ecart !== null && ecart !== 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">Vérifiez les derniers versements/retraits, les frais bancaires ou les paiements non encore crédités.</p>
        )}
      </Card>

      <Modal open={!!bordereau} onClose={() => setBordereau(null)} title="Bordereau d'opération bancaire" subtitle="Document à signer et archiver" wide
        footer={<><Button variant="ghost" onClick={() => setBordereau(null)}>Fermer</Button><Button variant="gold" icon={<Printer size={16} />} onClick={() => telechargerBordereau()}>Télécharger PDF</Button></>}>
        {bordereau && (
          <div className="rounded-2xl border border-black/10 p-6">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold">{db.tontine.nom}</h3>
                <p className="text-xs text-ink/50">{db.tontine.ville} · {db.tontine.banque}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Bordereau N°</p>
                <p className="font-mono text-sm font-bold">{uid('BD').slice(0, 12).toUpperCase()}</p>
              </div>
            </div>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Type d'opération</p><p className="font-semibold">{bordereau.kind === 'versement' ? 'Versement (Caisse → Banque)' : 'Retrait (Banque → Caisse)'}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Date</p><p className="font-semibold">{fmtDate(bordereau.date)}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Montant</p><p className="font-display text-lg font-bold text-brand-700">{fmtXAF(bordereau.montant)}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Motif / Note</p><p className="font-semibold">{bordereau.note || '—'}</p></div>
            </div>
            <div className="grid gap-8 border-t border-black/10 pt-6 sm:grid-cols-2">
              <div><p className="text-xs text-ink/40">Signature du trésorier</p><div className="mt-8 border-b border-black/20" /></div>
              <div><p className="text-xs text-ink/40">Cachet de la banque</p><div className="mt-8 border-b border-black/20" /></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================ PÉNALITÉS ============================ */
export function PenalitesPage() {
  const { db, setDb, toast } = useStore()
  const [confirm, setConfirm] = useState(false)
  const mois = monthKey()
  const impayees = db.penalites.filter(p => !p.payee)
  const retardataires = db.membres.filter(m => m.statut === 'Actif' && !db.cotisations.some(o => o.membreId === m.id && o.statut === 'Validée' && monthKey(o.date) === mois))

  const genererAuto = () => {
    const cibles = retardataires.filter(m => !db.penalites.some(p => p.membreId === m.id && monthKey(p.date) === mois))
    if (!cibles.length) { setConfirm(false); return toast('Aucune nouvelle pénalité à générer — tout le monde est à jour', 'info') }
    setDb(d => ({
      ...d,
      penalites: [...d.penalites, ...cibles.map(m => ({ id: uid('pen'), membreId: m.id, montant: d.tontine.penaliteRetard, motif: `Retard de cotisation (${monthLabel(mois)})`, date: today(), payee: false }))],
      notifications: cibles.reduce((acc, m) => notify(acc, m.id, 'Pénalité de retard', `Aucune cotisation validée pour ${monthLabel(mois)} — pénalité de ${fmtXAF(d.tontine.penaliteRetard)} appliquée.`), d.notifications),
    }))
    setConfirm(false)
    toast(`${cibles.length} pénalité(s) de ${fmtXAF(db.tontine.penaliteRetard)} générée(s) pour le mois de ${monthLabel(mois)}`, 'info')
  }
  const marquerPayee = (p) => {
    setDb(d => ({
      ...d,
      penalites: d.penalites.map(x => x.id === p.id ? { ...x, payee: true } : x),
      caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, Cotisation: (d.caisse.XAF.Cotisation || 0) + Number(p.montant || 0) } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Penalite', sens: 'in', compte: 'Cotisation', montant: p.montant, devise: 'XAF', date: today(), note: `Pénalité payée — ${p.motif}`, membreId: p.membreId }],
      notifications: notify(d, p.membreId, 'Pénalité réglée', `Votre pénalité de ${fmtXAF(p.montant)} a été encaissée. Merci.`),
    }))
    toast(`Pénalité de ${byId(db.membres, p.membreId)?.nom || '—'} marquée payée (${fmtXAF(p.montant)})`)
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Pénalités de retard" sub="Application automatique et suivi des règlements."
        actions={<Button variant="gold" icon={<Zap size={16} />} onClick={() => setConfirm(true)}>Pénalités automatiques</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Pénalités impayées" value={fmtXAF(sum(impayees, p => p.montant))} sub={`${impayees.length} pénalité(s)`} icon={<TriangleAlert size={18} />} tone="red" />
        <Stat label="Retardataires du mois" value={fmtNum(retardataires.length)} sub={`Aucune cotisation validée en ${monthLabel(mois)}`} icon={<Clock size={18} />} tone="amber" />
        <Stat label="Barème appliqué" value={fmtXAF(db.tontine.penaliteRetard)} sub="Par mois de retard" icon={<ClipboardList size={18} />} tone="brand" />
      </div>

      <Card title="Historique des pénalités" pad={false}>
        <Table empty="Aucune pénalité enregistrée" rows={db.penalites.slice().reverse()} columns={[
          { key: 'membre', label: 'Membre', render: p => <span className="flex items-center gap-2"><Avatar name={byId(db.membres, p.membreId)?.nom || '?'} size="sm" /><span className="font-semibold">{byId(db.membres, p.membreId)?.nom || '—'}</span></span> },
          { key: 'motif', label: 'Motif', render: p => <span className="text-ink/60">{p.motif}</span> },
          { key: 'montant', label: 'Montant', render: p => <span className="font-bold">{fmtXAF(p.montant)}</span> },
          { key: 'date', label: 'Date', render: p => fmtDate(p.date) },
          { key: 'payee', label: 'Statut', render: p => p.payee ? <Badge tone="green">Payée</Badge> : <Badge tone="amber" dot>Impayée</Badge> },
          { key: 'actions', label: 'Action', render: p => !p.payee ? <Button size="sm" onClick={() => marquerPayee(p)}>Marquer payée</Button> : <span className="text-xs text-ink/40">—</span> },
        ]} />
      </Card>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Pénalités automatiques" subtitle={`Scan du mois de ${monthLabel(mois)}`}
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Annuler</Button><Button variant="danger" onClick={genererAuto} icon={<Zap size={16} />}>Générer</Button></>}>
        <p className="text-sm text-ink/70">
          {retardataires.length === 0
            ? `Tous les membres actifs ont une cotisation validée pour ${monthLabel(mois)}. Aucune pénalité ne sera créée.`
            : `${retardataires.length} membre(s) n'ont aucune cotisation validée pour ${monthLabel(mois)} : une pénalité de ${fmtXAF(db.tontine.penaliteRetard)} sera appliquée à ${retardataires.map(m => m.nom.split(' ')[0]).join(', ')}.`}
        </p>
      </Modal>
    </div>
  )
}

/* ============================ ÉPARGNE ============================ */
export function EpargnePage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('individuelle')
  const [versement, setVersement] = useState(null)
  const [montant, setMontant] = useState('')
  const [newGroup, setNewGroup] = useState(false)
  const [gForm, setGForm] = useState({ nom: '', objectif: 500000, membres: [] })
  const [openCompte, setOpenCompte] = useState(false)
  const ep = Object.fromEntries(db.epargneIndividuelle.map(e => [e.membreId, e]))

  /* Membres actifs sans compte d'épargne — ouverture possible par le trésorier. */
  const sansCompte = db.membres.filter(m => m.statut === 'Actif' && !ep[m.id])

  const creerCompte = (membreId) => {
    const membre = db.membres.find(m => m.id === membreId)
    if (!membre) return
    setDb(d => ({
      ...d,
      epargneIndividuelle: [...d.epargneIndividuelle, { id: uid('ep'), membreId, type: 'Volontaire', solde: 0, bloquee: 0, versements: [] }],
      notifications: notify(d, membreId, 'Compte d\'épargne ouvert', `Le trésorier a ouvert un compte d'épargne pour vous. Vous pouvez y effectuer des versements volontaires.`),
    }))
    setOpenCompte(false)
    toast(`Compte d'épargne ouvert pour ${membre.nom}`)
  }

  /* Versement vers un groupe d'épargne — crédite le solde du groupe (T5). */
  const versementGroupe = (groupeId, m) => {
    const g = db.groupesEpargne.find(x => x.id === groupeId)
    if (!g || !m || m <= 0) return
    setDb(d => ({
      ...d,
      groupesEpargne: d.groupesEpargne.map(x => x.id === groupeId ? { ...x, solde: (x.solde || 0) + m } : x),
      caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, 'Épargne': (d.caisse.XAF['Épargne'] || 0) + m } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Epargne groupe', sens: 'in', compte: 'Épargne', montant: m, devise: 'XAF', date: today(), note: `Versement au groupe ${g.nom}` }],
    }))
    toast(`Versement de ${fmtXAF(m)} au groupe ${g.nom}`)
  }

  const enregistrerVersement = () => {
    const m = +montant
    if (!versement) return
    if (!m || m <= 0) return toast('Montant invalide', 'error')
    const membre = byId(db.membres, versement.membreId)
    setDb(d => ({
      ...d,
      epargneIndividuelle: d.epargneIndividuelle.map(e => e.membreId === versement.membreId
        ? { ...e, solde: e.solde + m, versements: [...e.versements, { id: uid('v'), montant: m, date: today() }] } : e),
      caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, 'Épargne': (d.caisse.XAF['Épargne'] || 0) + m } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Epargne', sens: 'in', compte: 'Épargne', montant: m, devise: 'XAF', date: today(), note: `Versement épargne volontaire — ${membre?.nom || ''}`, membreId: versement.membreId }],
      notifications: notify(d, versement.membreId, 'Épargne créditée', `Votre versement volontaire de ${fmtXAF(m)} a été crédité sur votre épargne.`),
    }))
    pdfVersement({ club: db.tontine, membre, versement: { date: today(), montant: m }, soldeApres: (versement.solde || 0) + m })
    setVersement(null); setMontant('')
    toast(`Versement de ${fmtXAF(m)} enregistré — bordereau PDF téléchargé`)
  }
  const creerGroupe = () => {
    if (!gForm.nom.trim()) return toast('Nom du groupe obligatoire', 'error')
    if (!gForm.membres.length) return toast('Sélectionnez au moins un membre', 'error')
    setDb(d => ({ ...d, groupesEpargne: [...d.groupesEpargne, { id: uid('gr'), nom: gForm.nom.trim(), membres: gForm.membres, solde: 0, objectif: +gForm.objectif || 0 }] }))
    setNewGroup(false); setGForm({ nom: '', objectif: 500000, membres: [] })
    toast('Groupe d\'épargne créé')
  }
  const versementsRécents = db.epargneIndividuelle.flatMap(e => e.versements.map(v => ({ ...v, membreId: e.membreId })))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  const totalEpargne = sum(db.epargneIndividuelle, e => e.solde)
  return (
    <div className="space-y-6">
      <PageHeader title="Épargne" sub="Épargne individuelle, groupes solidaires et versements volontaires."
        actions={tab === 'individuelle' && sansCompte.length > 0 && <Button variant="gold" icon={<Plus size={16} />} onClick={() => setOpenCompte(true)}>Ouvrir un compte</Button>} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'individuelle', label: 'Individuelle' },
        { id: 'groupes', label: `Groupes (${db.groupesEpargne.length})` },
        { id: 'volontaire', label: 'Versements volontaires' },
      ]} />

      {tab === 'individuelle' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 stagger">
            <Stat label="Épargne totale" value={fmtXAF(totalEpargne)} sub={`${db.epargneIndividuelle.length} épargnant(s)`} icon={<PiggyBank size={18} />} tone="gold" />
            <Stat label="Part bloquée" value={fmtXAF(sum(db.epargneIndividuelle, e => e.bloquee))} sub="Non retirable avant échéance" icon={<Lock size={18} />} tone="brand" />
            <Stat label="Part volontaire" value={fmtXAF(sum(db.epargneIndividuelle, e => e.solde - e.bloquee))} sub="Disponible sur demande" icon={<LockOpen size={18} />} tone="brand" />
          </div>
          <Card title="Comptes d'épargne individuelle" subtitle="Chaque membre dispose d'un compte d'épargne" pad={false}
            actions={sansCompte.length > 0 && <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setOpenCompte(true)}>Ouvrir un compte</Button>}>
            <Table empty="Aucun compte d'épargne — ouvrez-en un pour un membre actif" rows={db.epargneIndividuelle} keyField="membreId" columns={[
              { key: 'membre', label: 'Membre', render: e => <span className="flex items-center gap-2"><Avatar name={byId(db.membres, e.membreId)?.nom || '?'} size="sm" /><span className="font-semibold">{byId(db.membres, e.membreId)?.nom || '—'}</span></span> },
              { key: 'solde', label: 'Solde', render: e => <span className="font-bold">{fmtXAF(e.solde)}</span> },
              { key: 'bloquee', label: 'Part bloquée', render: e => fmtXAF(e.bloquee) },
              { key: 'type', label: 'Type', render: e => <Badge tone={e.type === 'Bloquée' ? 'violet' : 'green'}>{e.type}</Badge> },
              { key: 'versements', label: 'Versements', render: e => <span className="text-ink/50">{e.versements.length}</span> },
              { key: 'actions', label: 'Action', render: e => <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setVersement(e)}>Versement</Button> },
            ]} />
          </Card>
        </div>
      )}

      {tab === 'groupes' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          {db.groupesEpargne.length === 0 && <div className="lg:col-span-2"><EmptyState icon={<Users size={16} />} title="Aucun groupe d'épargne" sub="Créez le premier groupe solidaire du club." action={<Button onClick={() => setNewGroup(true)}>Créer un groupe</Button>} /></div>}
          {db.groupesEpargne.map(g => (
            <Card key={g.id} title={g.nom} subtitle={`${g.membres.length} membre(s) · objectif ${fmtXAF(g.objectif)}`}
              actions={<Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => {
                const m = window.prompt(`Versement au groupe ${g.nom} (XAF)`)
                if (m) versementGroupe(g.id, +m)
              }}>Versement</Button>}>
              <div className="flex items-center gap-2">
                {g.membres.slice(0, 6).map(id => <Avatar key={id} name={byId(db.membres, id)?.nom || '?'} size="sm" />)}
                {g.membres.length > 6 && <span className="text-xs text-ink/40">+{g.membres.length - 6}</span>}
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Solde du groupe</p><p className="font-display text-xl font-semibold">{fmtXAF(g.solde)}</p></div>
                <p className="text-xs font-bold text-ink/50">{pct(g.solde, g.objectif)}%</p>
              </div>
              <div className="mt-2"><Progress value={g.solde} max={g.objectif} tone={g.solde >= g.objectif ? 'bg-gold-500' : 'bg-brand-500'} /></div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'volontaire' && (
        <Card title="Derniers versements volontaires" subtitle="Historique consolidé" pad={false}>
          <Table empty="Aucun versement enregistré" rows={versementsRécents} columns={[
            { key: 'membre', label: 'Membre', render: v => <span className="flex items-center gap-2"><Avatar name={byId(db.membres, v.membreId)?.nom || '?'} size="sm" /><span className="font-semibold">{byId(db.membres, v.membreId)?.nom || '—'}</span></span> },
            { key: 'montant', label: 'Montant', render: v => <span className="font-bold">+{fmtXAF(v.montant)}</span> },
            { key: 'date', label: 'Date', render: v => fmtDate(v.date) },
            { key: 'type', label: 'Compte', render: v => <Badge tone={ep[v.membreId]?.type === 'Bloquée' ? 'violet' : 'green'}>{ep[v.membreId]?.type || 'Volontaire'}</Badge> },
          ]} />
        </Card>
      )}

      <Modal open={!!versement} onClose={() => setVersement(null)} title="Versement volontaire" subtitle={`Épargne de ${versement ? byId(db.membres, versement.membreId)?.nom : ''} — solde : ${versement ? fmtXAF(versement.solde) : ''}`}
        footer={<><Button variant="ghost" onClick={() => setVersement(null)}>Annuler</Button><Button variant="gold" onClick={enregistrerVersement} icon={<PiggyBank size={16} />}>Enregistrer</Button></>}>
        <Field label="Montant du versement (XAF)"><Input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" /></Field>
      </Modal>

      <Modal open={newGroup} onClose={() => setNewGroup(false)} title="Nouveau groupe d'épargne" subtitle="Groupe solidaire avec objectif commun"
        footer={<><Button variant="ghost" onClick={() => setNewGroup(false)}>Annuler</Button><Button onClick={creerGroupe}>Créer le groupe</Button></>}>
        <div className="space-y-4">
          <Field label="Nom du groupe"><Input value={gForm.nom} onChange={e => setGForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Groupe Ndawara Solidarité" /></Field>
          <Field label="Objectif (XAF)"><Input type="number" value={gForm.objectif} onChange={e => setGForm(f => ({ ...f, objectif: +e.target.value }))} /></Field>
          <Field label="Membres du groupe">
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-black/10 p-2">
              {db.membres.map(m => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-brand-50">
                  <input type="checkbox" checked={gForm.membres.includes(m.id)}
                    onChange={e => setGForm(f => ({ ...f, membres: e.target.checked ? [...f.membres, m.id] : f.membres.filter(x => x !== m.id) }))} />
                  <span className="flex-1">{m.nom}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      {/* Ouverture d'un compte d'épargne pour un membre actif qui n'en a pas. */}
      <Modal open={openCompte} onClose={() => setOpenCompte(false)} title="Ouvrir un compte d'épargne" subtitle={`${sansCompte.length} membre(s) actif(s) sans compte`}>
        {sansCompte.length === 0 ? (
          <p className="text-sm text-ink/60">Tous les membres actifs disposent déjà d'un compte d'épargne.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {sansCompte.map(m => (
              <li key={m.id}>
                <button onClick={() => creerCompte(m.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-50 cursor-pointer">
                  <Avatar name={m.nom} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{m.nom}</p>
                    <p className="text-[11px] text-ink/45">{m.role}</p>
                  </div>
                  <span className="text-xs font-bold text-brand-700">Ouvrir →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}

/* ============================ PRÊTS ============================ */
export function PretsPage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('demandes')
  const [remb, setRemb] = useState(null)
  const [montant, setMontant] = useState('')
  const membres = Object.fromEntries(db.membres.map(m => [m.id, m]))
  const demandes = db.prets.filter(p => p.statut === 'En attente')
  const enCours = db.prets.filter(p => p.statut === 'En cours')

  const approuver = (p) => {
    if ((db.caisse.XAF.Cotisation || 0) < p.montant) return toast(`Fonds de cotisation insuffisants (${fmtXAF(db.caisse.XAF.Cotisation || 0)}) — virez d'abord des fonds vers la caisse « Cotisation » avant de decaisser`, 'error')
    setDb(d => ({
      ...d,
      prets: d.prets.map(x => x.id === p.id ? { ...x, statut: 'En cours', reste: p.montant } : x),
      caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, Cotisation: (d.caisse.XAF.Cotisation || 0) - p.montant } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Pret', sens: 'out', compte: 'Cotisation', montant: p.montant, devise: 'XAF', date: today(), note: `Prêt accordé — ${p.motif}`, membreId: p.membreId }],
      notifications: notify(d, p.membreId, 'Prêt approuvé', `Votre prêt de ${fmtXAF(p.montant)} a été approuvé par le trésorier. Décaissement effectué en caisse.`),
    }))
    toast(`Prêt de ${membres[p.membreId]?.nom || '—'} approuvé : ${fmtXAF(p.montant)} decaissés`)
  }
  const refuser = (p) => {
    setDb(d => ({ ...d, prets: d.prets.map(x => x.id === p.id ? { ...x, statut: 'Rejeté' } : x), notifications: notify(d, p.membreId, 'Prêt rejeté', `Votre demande de prêt de ${fmtXAF(p.montant)} a été rejetée par le trésorier.`) }))
    toast(`Demande de prêt de ${membres[p.membreId]?.nom || '—'} rejetée`, 'error')
  }
  const enregistrerRemb = () => {
    const m = +montant
    if (!remb) return
    if (!m || m <= 0) return toast('Montant invalide', 'error')
    if (m > remb.reste) return toast(`Le reste à rembourser est de ${fmtXAF(remb.reste)}`, 'error')
    const solde = remb.reste - m
    setDb(d => ({
      ...d,
      prets: d.prets.map(x => x.id === remb.id ? { ...x, reste: Math.max(0, solde), statut: solde <= 0 ? 'Remboursé' : 'En cours' } : x),
      caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, Cotisation: (d.caisse.XAF.Cotisation || 0) + m } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Remboursement', sens: 'in', compte: 'Cotisation', montant: m, devise: 'XAF', date: today(), note: `Remboursement prêt${solde <= 0 ? ' — soldé' : ` — reste ${fmtNum(solde)}`}`, membreId: remb.membreId }],
      notifications: solde <= 0
        ? notify(d, remb.membreId, 'Prêt soldé', `Votre prêt de ${fmtXAF(remb.montant)} est entièrement remboursé. Félicitations !`)
        : notify(d, remb.membreId, 'Remboursement enregistré', `Un remboursement de ${fmtXAF(m)} a été enregistré pour votre prêt — reste à payer : ${fmtXAF(solde)}.`),
    }))
    setRemb(null); setMontant('')
    toast(solde <= 0 ? `Prêt de ${membres[remb.membreId]?.nom || '—'} entièrement remboursé` : `Remboursement de ${fmtXAF(m)} enregistré — reste ${fmtXAF(solde)}`)
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Prêts internes" sub="Étude des demandes, decaissements et suivi des remboursements."
        actions={<Badge tone="brand">Taux club : {db.tontine.tauxPret}%</Badge>} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'demandes', label: `Demandes (${demandes.length})` },
        { id: 'encours', label: `En cours (${enCours.length})` },
        { id: 'historique', label: 'Historique' },
      ]} />

      {tab === 'demandes' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          {demandes.length === 0 && <div className="lg:col-span-2"><EmptyState icon={<Inbox size={16} />} title="Aucune demande en attente" sub="Les nouvelles demandes des membres apparaîtront ici." /></div>}
          {demandes.map(p => {
            const m = membres[p.membreId]
            return (
              <Card key={p.id}>
                <div className="flex items-start gap-4">
                  <Avatar name={m?.nom || '?'} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{m?.nom || '—'}</h3><Badge tone={statusTone(p.statut)}>{p.statut}</Badge></div>
                    <p className="text-xs text-ink/50">Demandé le {fmtDate(p.dateDemande)} · {p.motif}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Montant</p><p className="font-bold">{fmtXAF(p.montant)}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Intérêt ({p.taux}%)</p><p className="font-bold text-gold-600">{fmtXAF(p.interet ?? p.montant * p.taux / 100)}</p></div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Garants :</span>
                      {p.garants.map(gid => <span key={gid} className="flex items-center gap-1.5 rounded-full bg-black/[.04] py-0.5 pl-0.5 pr-2.5 text-xs font-semibold"><Avatar name={membres[gid]?.nom || '?'} size="sm" />{membres[gid]?.nom?.split(' ')[0]}</span>)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" className="text-red-600" onClick={() => refuser(p)}>Refuser</Button>
                  <Button onClick={() => approuver(p)} icon={<CircleCheck size={16} />}>Approuver & decaisser</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'encours' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          {enCours.length === 0 && <div className="lg:col-span-2"><EmptyState icon={<HandCoins size={16} />} title="Aucun prêt en cours" sub="Tous les prêts accordés ont été remboursés." /></div>}
          {enCours.map(p => (
            <Card key={p.id} title={membres[p.membreId]?.nom || '—'} subtitle={`Prêt du ${fmtDate(p.dateDemande)} · ${p.motif}`}
              actions={<Button size="sm" variant="gold" onClick={() => setRemb(p)}>Enregistrer remboursement</Button>}>
              <div className="flex items-end justify-between gap-4 text-sm">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Reste à rembourser</p><p className="font-display text-xl font-semibold">{fmtXAF(p.reste)}</p></div>
                <p className="text-xs font-bold text-ink/50">sur {fmtXAF(p.montant)}</p>
              </div>
              <div className="mt-2"><Progress value={p.montant - p.reste} max={p.montant} tone="bg-brand-500" /></div>
              <p className="mt-2 text-xs text-ink/50">{pct(p.montant - p.reste, p.montant)}% remboursé · intérêt total attendu : {fmtXAF(p.interet ?? p.montant * p.taux / 100)}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'historique' && (
        <Card title="Historique des prêts" subtitle="Toutes les demandes depuis le début du cycle" pad={false}>
          <Table empty="Aucun prêt enregistré" rows={db.prets.slice().reverse()} columns={[
            { key: 'membre', label: 'Membre', render: p => <span className="flex items-center gap-2"><Avatar name={membres[p.membreId]?.nom || '?'} size="sm" /><span className="font-semibold">{membres[p.membreId]?.nom || '—'}</span></span> },
            { key: 'montant', label: 'Montant', render: p => <span className="font-bold">{fmtXAF(p.montant)}</span> },
            { key: 'taux', label: 'Taux', render: p => `${p.taux}%` },
            { key: 'interet', label: 'Intérêt', render: p => fmtXAF(p.interet ?? p.montant * p.taux / 100) },
            { key: 'reste', label: 'Reste', render: p => fmtXAF(p.reste) },
            { key: 'date', label: 'Date', render: p => fmtDate(p.dateDemande) },
            { key: 'statut', label: 'Statut', render: p => <Badge tone={statusTone(p.statut)}>{p.statut}</Badge> },
          ]} />
        </Card>
      )}

      <Modal open={!!remb} onClose={() => setRemb(null)} title="Enregistrer un remboursement" subtitle={remb ? `${membres[remb.membreId]?.nom} — reste à rembourser : ${fmtXAF(remb.reste)}` : ''}
        footer={<><Button variant="ghost" onClick={() => setRemb(null)}>Annuler</Button><Button variant="gold" onClick={enregistrerRemb} icon={<Banknote size={16} />}>Encaisser</Button></>}>
        <Field label="Montant remboursé (XAF)" hint="Le prêt est marqué « Remboursé » lorsque le solde atteint zéro.">
          <Input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" />
        </Field>
      </Modal>
    </div>
  )
}

/* ============================ INTÉRÊTS ============================ */
export function InteretsPage() {
  const { db, setDb, toast } = useStore()
  const totalInterets = sum(db.prets.filter(p => p.statut === 'Remboursé'), p => p.interet ?? 0)
  const dejaRedistribue = sum(db.interetsRedistribues, r => r.total)
  const disponible = Math.max(0, totalInterets - dejaRedistribue)
  const totalEpargne = sum(db.epargneIndividuelle, e => e.solde)

  const redistribuer = () => {
    if (disponible <= 0) return toast('Aucun intérêt disponible à redistribuer', 'error')
    if (totalEpargne <= 0) return toast('Aucune épargne enregistrée pour la répartition', 'error')
    setDb(d => {
      const te = sum(d.epargneIndividuelle, e => e.solde)
      const dispo = Math.max(0, sum(d.prets.filter(p => p.statut === 'Remboursé'), p => p.interet ?? 0) - sum(d.interetsRedistribues, r => r.total))
      const parts = d.epargneIndividuelle.map(e => ({ membreId: e.membreId, montant: Math.round((e.solde / te) * dispo) }))
      /* Notifications AJOUTÉES aux existantes (l'ancien code écrasait tout). */
      const nouvelles = d.epargneIndividuelle.filter(e => e.solde > 0).map(e => ({ id: uid('nt'), pour: e.membreId, titre: 'Intérêts redistribués', message: `Votre part des intérêts de la tontine a été créditée sur votre épargne : ${fmtXAF(Math.round((e.solde / te) * dispo))}.`, lu: false, date: now() }))
      return {
        ...d,
        interetsRedistribues: [...d.interetsRedistribues, { id: uid('ir'), total: dispo, date: today(), parts }],
        epargneIndividuelle: d.epargneIndividuelle.map(e => {
          const part = parts.find(pa => pa.membreId === e.membreId)
          return part && e.solde > 0 ? { ...e, solde: e.solde + part.montant } : e
        }),
        /* Les intérêts redistribués sortent réellement de la caisse Cotisation
           vers l'épargne des membres (cohérence caisse ↔ épargne). */
        caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, Cotisation: Math.max(0, (d.caisse.XAF?.Cotisation || 0) - dispo), 'Épargne': (d.caisse.XAF?.['Épargne'] || 0) + dispo } },
        mouvements: [...d.mouvements, { id: uid('mv'), type: 'Redistribution intérêts', sens: 'out', compte: 'Cotisation', montant: dispo, devise: 'XAF', date: today(), note: `Redistribution de ${fmtXAF(dispo)} d'intérêts vers l'épargne des membres` }, { id: uid('mv'), type: 'Redistribution intérêts', sens: 'in', compte: 'Épargne', montant: dispo, devise: 'XAF', date: today(), note: `Intérêts redistribués au prorata de l'épargne de ${parts.length} membre(s)` }],
        notifications: [...d.notifications, ...nouvelles],
      }
    })
    toast(`${fmtXAF(disponible)} d'intérêts redistribués aux épargnants`)
  }
  const dernier = db.interetsRedistribues[db.interetsRedistribues.length - 1]
  return (
    <div className="space-y-6">
      <PageHeader title="Intérêts redistribués" sub="Répartition des intérêts de prêts au prorata de l'épargne de chaque membre."
        actions={<Button variant="gold" icon={<Gift size={16} />} onClick={redistribuer} disabled={disponible <= 0}>Redistribuer aux épargnants</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Intérêts collectés" value={fmtXAF(totalInterets)} sub="Prêts entièrement remboursés" icon={<TrendingUp size={18} />} tone="gold" />
        <Stat label="Déjà redistribués" value={fmtXAF(dejaRedistribue)} sub={`${db.interetsRedistribues.length} redistribution(s)`} icon={<Gift size={18} />} tone="brand" />
        <Stat label="Disponible" value={fmtXAF(disponible)} sub={`Base de répartition : ${fmtXAF(totalEpargne)} d'épargne`} icon={<Scale size={18} />} tone="brand" />
      </div>

      {dernier && (
        <Card title="Dernière répartition" subtitle={`${fmtXAF(dernier.total)} distribués le ${fmtDate(dernier.date)} — au prorata de l'épargne`} pad={false}>
          <Table empty="Aucune part calculée" rows={dernier.parts} keyField="membreId" columns={[
            { key: 'membre', label: 'Membre', render: pa => <span className="flex items-center gap-2"><Avatar name={byId(db.membres, pa.membreId)?.nom || '?'} size="sm" /><span className="font-semibold">{byId(db.membres, pa.membreId)?.nom || '—'}</span></span> },
            { key: 'epargne', label: 'Épargne (base)', render: pa => fmtXAF(db.epargneIndividuelle.find(e => e.membreId === pa.membreId)?.solde || 0) },
            { key: 'montant', label: 'Part reçue', render: pa => <span className="font-bold text-brand-700">+{fmtXAF(pa.montant)}</span> },
          ]} />
        </Card>
      )}

      <Card title="Historique des redistributions" pad={false}>
        <Table empty="Aucune redistribution enregistrée" rows={db.interetsRedistribues.slice().reverse()} columns={[
          { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
          { key: 'total', label: 'Total redistribué', render: r => <span className="font-bold">{fmtXAF(r.total)}</span> },
          { key: 'parts', label: 'Bénéficiaires', render: r => `${r.parts.length} membre(s)` },
          { key: 'partMoy', label: 'Part moyenne', render: r => fmtXAF(r.total / (r.parts.length || 1)) },
        ]} />
      </Card>
    </div>
  )
}

/* ============================ AIDES SOCIALES ============================ */
const AIDE_ICONS = {
  Deces: <Flower2 size={15} className="text-violet-600" />,
  Mariage: <HeartHandshake size={15} className="text-violet-600" />,
  Naissance: <Baby size={15} className="text-violet-600" />,
  Maladie: <Stethoscope size={15} className="text-violet-600" />,
}
export function AidesPage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ membreId: '', type: 'Naissance', montant: 100000, motif: '' })
  const membres = Object.fromEntries(db.membres.map(m => [m.id, m]))

  const ajouter = () => {
    if (!form.membreId || !form.montant) return toast('Membre et montant obligatoires', 'error')
    setDb(d => ({
      ...d,
      aides: [{ id: uid('ai'), membreId: form.membreId, type: form.type, montant: +form.montant, statut: 'En attente', date: today(), motif: form.motif || 'Aide sociale du club' }, ...d.aides],
      notifications: notify(d, form.membreId, 'Demande d\'aide enregistrée', `Votre demande d'aide (${form.type}) de ${fmtXAF(form.montant)} est en cours d'examen par le bureau.`),
    }))
    setOpen(false); setForm({ membreId: '', type: 'Naissance', montant: 100000, motif: '' })
    toast('Aide sociale enregistrée — en attente de validation')
  }
  const decider = (a, statut) => {
    setDb(d => ({ ...d, aides: d.aides.map(x => x.id === a.id ? { ...x, statut } : x) }))
    toast(statut === 'Rejetée' ? `Aide de ${membres[a.membreId]?.nom || '—'} rejetée` : `Aide de ${membres[a.membreId]?.nom || '—'} ${statut.toLowerCase()}`, statut === 'Rejetée' ? 'error' : 'success')
  }
  const payer = (a) => {
    if ((db.caisse.XAF.Cotisation || 0) < a.montant) return toast(`Fonds de cotisation insuffisants (${fmtXAF(db.caisse.XAF.Cotisation || 0)}) — virez d'abord des fonds vers la caisse « Cotisation » avant de payer`, 'error')
    setDb(d => ({
      ...d,
      aides: d.aides.map(x => x.id === a.id ? { ...x, statut: 'Payée' } : x),
      caisse: { ...d.caisse, XAF: { ...d.caisse.XAF, Cotisation: (d.caisse.XAF.Cotisation || 0) - a.montant } },
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Aide sociale', sens: 'out', compte: 'Cotisation', montant: a.montant, devise: 'XAF', date: today(), note: `Aide ${a.type} — ${a.motif}`, membreId: a.membreId }],
      notifications: notify(d, a.membreId, 'Aide versée', `Votre aide de ${fmtXAF(a.montant)} (${a.type}) a été versée. Bon rétablissement / félicitations !`),
    }))
    toast(`Aide de ${fmtXAF(a.montant)} versée à ${membres[a.membreId]?.nom || '—'}`)
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Aides sociales" sub="Solidarité du club : deces, mariage, naissance, maladie."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Nouvelle aide</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Aides versées" value={fmtXAF(sum(db.aides.filter(a => a.statut === 'Payée'), a => a.montant))} sub={`${db.aides.filter(a => a.statut === 'Payée').length} aide(s)`} icon={<HandHelping size={18} />} tone="brand" />
        <Stat label="En attente" value={fmtXAF(sum(db.aides.filter(a => a.statut === 'En attente'), a => a.montant))} sub={`${db.aides.filter(a => a.statut === 'En attente').length} demande(s)`} icon={<Timer size={18} />} tone="amber" />
        <Stat label="Validées à payer" value={fmtXAF(sum(db.aides.filter(a => a.statut === 'Validée'), a => a.montant))} sub="Prêtes pour le decaissement" icon={<Banknote size={18} />} tone="gold" />
      </div>

      <Card title="Demandes d'aide" subtitle="Circuit : validation du bureau → paiement par le trésorier" pad={false}>
        <Table empty="Aucune demande d'aide" rows={db.aides} columns={[
          { key: 'type', label: 'Type', render: a => <Badge tone="brand"><span className="flex items-center gap-1.5">{AIDE_ICONS[a.type] || <HandHelping size={15} className="text-violet-600" />} {a.type}</span></Badge> },
          { key: 'membre', label: 'Membre', render: a => <span className="flex items-center gap-2"><Avatar name={membres[a.membreId]?.nom || '?'} size="sm" /><span className="font-semibold">{membres[a.membreId]?.nom || '—'}</span></span> },
          { key: 'montant', label: 'Montant', render: a => <span className="font-bold">{fmtXAF(a.montant)}</span> },
          { key: 'motif', label: 'Motif', render: a => <span className="text-ink/60">{a.motif}</span> },
          { key: 'date', label: 'Date', render: a => fmtDate(a.date) },
          { key: 'statut', label: 'Statut', render: a => <Badge tone={statusTone(a.statut)}>{a.statut}</Badge> },
          { key: 'actions', label: 'Actions', render: a => (
            <div className="flex flex-wrap gap-1.5">
              {a.statut === 'En attente' && <><Button size="sm" onClick={() => decider(a, 'Validée')}>Valider</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => decider(a, 'Rejetée')}>Rejeter</Button></>}
              {a.statut === 'Validée' && <Button size="sm" variant="gold" onClick={() => payer(a)} icon={<Banknote size={14} />}>Payer</Button>}
              {a.statut === 'Payée' && <span className="text-xs text-ink/40">Traitée</span>}
              {a.statut === 'Rejetée' && <span className="text-xs text-ink/40">—</span>}
            </div>
          ) },
        ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle demande d'aide" subtitle="L'aide sera validée puis payée par la caisse"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={ajouter}>Enregistrer</Button></>}>
        <div className="space-y-4">
          <Field label="Membre bénéficiaire">
            <Select value={form.membreId} onChange={e => setForm(f => ({ ...f, membreId: e.target.value }))}>
              <option value="">— Choisir un membre —</option>
              {db.membres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type d'aide">
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={Object.keys(AIDE_ICONS).map(k => ({ value: k, label: k }))} />
            </Field>
            <Field label="Montant (XAF)"><Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: +e.target.value }))} /></Field>
          </div>
          <Field label="Motif"><Textarea value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Décrire la situation…" /></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ RAPPORTS FINANCIERS ============================ */
export function RapportsFinPage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [tab, setTab] = useState('mensuel')
  const [moisCloture, setMoisCloture] = useState(monthKey())
  const [print, setPrint] = useState(null)
  const mois = monthKey()
  const membres = Object.fromEntries(db.membres.map(m => [m.id, m]))

  const statsMois = (k) => {
    const mvs = db.mouvements.filter(m => monthKey(m.date) === k)
    return {
      encaisse: sum(mvs.filter(m => m.sens === 'in'), m => m.montant),
      decaisse: sum(mvs.filter(m => m.sens === 'out'), m => m.montant),
      solde: sum(Object.values(db.caisse.XAF)),
    }
  }
  const genererMensuel = () => {
    const s = statsMois(mois)
    const resume = `Encaissements ${fmtNum(s.encaisse)} XAF, decaissements ${fmtNum(s.decaisse)} XAF, solde caisse ${fmtNum(s.solde)} XAF. ${db.cotisations.filter(o => o.statut === 'En attente').length} paiement(s) en attente, ${db.penalites.filter(p => !p.payee).length} pénalité(s) impayée(s).`
    setDb(d => ({ ...d, rapports: [{ id: uid('ra'), periode: monthLabel(mois), type: 'Financier', statut: 'Soumis', auteur: user?.nom || 'Trésorier', date: today(), resume }, ...d.rapports] }))
    toast(`Rapport financier de ${monthLabel(mois)} généré et soumis au président`)
  }
  const cloturer = () => {
    const s = statsMois(moisCloture)
    const resume = `Clôture de ${monthLabel(moisCloture)} : encaissements ${fmtNum(s.encaisse)} XAF, decaissements ${fmtNum(s.decaisse)} XAF, solde final ${fmtNum(s.solde)} XAF. Comptes arrêtés et transmis pour validation.`
    setDb(d => ({ ...d, rapports: [{ id: uid('ra'), periode: monthLabel(moisCloture), type: 'Financier', statut: 'Soumis', auteur: user?.nom || 'Trésorier', date: today(), resume }, ...d.rapports] }))
    toast(`${monthLabel(moisCloture)} clôturé — rapport soumis au président`)
  }
  const impayes = db.membres.filter(m => m.statut === 'Actif' && !db.cotisations.some(o => o.membreId === m.id && o.statut === 'Validée' && monthKey(o.date) === mois))
    .map(m => {
      const pens = db.penalites.filter(p => p.membreId === m.id && !p.payee)
      return { id: m.id, membre: m, cotisation: db.tontine.montantCotisation, penalites: sum(pens, p => p.montant), total: db.tontine.montantCotisation + sum(pens, p => p.montant) }
    })
  const dernierIR = db.interetsRedistribues[db.interetsRedistribues.length - 1]
  const rapportsFin = db.rapports.filter(r => r.type === 'Financier')

  const telechargerRapportPDF = () => {
    if (!print) return
    const s = statsMois(monthKey(print.date))
    const mvs = db.mouvements.filter(m => monthKey(m.date) === monthKey(print.date))
    pdfRapport({
      club: db.tontine,
      periode: print.periode,
      synthese: print.resume,
      lignes: mvs,
      totalIn: s.encaisse,
      totalOut: s.decaisse,
    })
    toast('Rapport financier téléchargé en PDF')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Rapports financiers" sub="Rapport mensuel, membres en retard, répartition des intérêts et clôture."
        actions={tab === 'mensuel' && <Button variant="gold" icon={<ChartColumn size={16} />} onClick={genererMensuel}>Générer le rapport du mois</Button>} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'mensuel', label: 'Rapport mensuel' },
        { id: 'impayes', label: `Impayés (${impayes.length})` },
        { id: 'interets', label: 'Répartition intérêts' },
        { id: 'cloture', label: 'Clôture' },
      ]} />

      {tab === 'mensuel' && (
        <div className="space-y-4 stagger">
          {rapportsFin.length === 0 && <EmptyState icon={<ChartColumn size={16} />} title="Aucun rapport financier" sub="Générez le premier rapport mensuel du cycle." />}
          {rapportsFin.map(r => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><h3 className="font-display text-lg font-semibold">Rapport financier — {r.periode}</h3><Badge tone={statusTone(r.statut)}>{r.statut}</Badge></div>
                  <p className="mt-1 text-xs text-ink/50">Par {r.auteur} · {fmtDate(r.date)}</p>
                  <p className="mt-2 max-w-2xl text-sm text-ink/70">{r.resume}</p>
                </div>
                <Button size="sm" variant="outline" icon={<Printer size={14} />} onClick={() => setPrint(r)}>Imprimer</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'impayes' && (
        <Card title={`Membres en retard — ${monthLabel(mois)}`} subtitle="Cotisation du mois non validée et pénalités impayées" pad={false}>
          <Table empty="Aucun impayé — tous les membres sont à jour" rows={impayes} columns={[
            { key: 'membre', label: 'Membre', render: r => <span className="flex items-center gap-2"><Avatar name={r.membre.nom} size="sm" /><span className="font-semibold">{r.membre.nom}</span></span> },
            { key: 'tel', label: 'Téléphone', render: r => r.membre.tel },
            { key: 'cotisation', label: 'Cotisation due', render: r => fmtXAF(r.cotisation) },
            { key: 'penalites', label: 'Pénalités impayées', render: r => fmtXAF(r.penalites) },
            { key: 'total', label: 'Total dû', render: r => <span className="font-bold text-red-600">{fmtXAF(r.total)}</span> },
          ]} />
        </Card>
      )}

      {tab === 'interets' && (
        <Card title="Répartition des intérêts" subtitle="Dernière redistribution au prorata de l'épargne" pad={false}>
          {!dernierIR && <EmptyState icon={<Gift size={16} />} title="Aucune redistribution" sub="Utilisez la page Intérêts pour effectuer la première redistribution." />}
          {dernierIR && (
            <Table empty="Aucune part calculée" rows={dernierIR.parts} keyField="membreId" columns={[
              { key: 'membre', label: 'Membre', render: pa => <span className="flex items-center gap-2"><Avatar name={membres[pa.membreId]?.nom || '?'} size="sm" /><span className="font-semibold">{membres[pa.membreId]?.nom || '—'}</span></span> },
              { key: 'epargne', label: 'Épargne (base)', render: pa => fmtXAF(db.epargneIndividuelle.find(e => e.membreId === pa.membreId)?.solde || 0) },
              { key: 'montant', label: 'Part reçue', render: pa => <span className="font-bold text-brand-700">+{fmtXAF(pa.montant)}</span> },
            ]} />
          )}
          {dernierIR && <p className="px-3 pb-3 pt-1 text-xs text-ink/50">Total redistribué le {fmtDate(dernierIR.date)} : <b>{fmtXAF(dernierIR.total)}</b></p>}
        </Card>
      )}

      {tab === 'cloture' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          <Card title="Clôture de période" subtitle="Arrêté des comptes pour un mois donné">
            <div className="space-y-4">
              <Field label="Mois à clôturer"><Input type="month" value={moisCloture} onChange={e => setMoisCloture(e.target.value)} /></Field>
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-brand-50 p-4 text-center text-xs">
                <div><p className="font-bold uppercase tracking-wider text-ink/40">Encaissé</p><p className="mt-1 text-sm font-bold">{fmtNum(statsMois(moisCloture).encaisse)}</p></div>
                <div><p className="font-bold uppercase tracking-wider text-ink/40">Décaissé</p><p className="mt-1 text-sm font-bold">{fmtNum(statsMois(moisCloture).decaisse)}</p></div>
                <div><p className="font-bold uppercase tracking-wider text-ink/40">Solde caisse</p><p className="mt-1 text-sm font-bold">{fmtNum(statsMois(moisCloture).solde)}</p></div>
              </div>
              <Button variant="gold" className="w-full" icon={<Flag size={16} />} onClick={cloturer}>Clôturer {monthLabel(moisCloture)}</Button>
            </div>
          </Card>
          <Card title="Rapports de clôture" subtitle="Historique des arrêtés de comptes" pad={false}>
            <div className="p-3">
              {db.rapports.filter(r => r.resume.startsWith('Clôture')).length === 0 && <EmptyState icon={<Flag size={16} />} title="Aucune clôture" sub="Clôturez un mois pour archiver l'arrêté des comptes." />}
              {db.rapports.filter(r => r.resume.startsWith('Clôture')).map(r => (
                <RowItem key={r.id} icon={<Flag size={16} className="text-ink/50" />} title={`Clôture — ${r.periode}`} sub={`${r.auteur} · ${fmtDate(r.date)}`} right={<Badge tone={statusTone(r.statut)}>{r.statut}</Badge>} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <Modal open={!!print} onClose={() => setPrint(null)} title="Aperçu du rapport" subtitle={print ? `Rapport financier — ${print.periode}` : ''} wide
        footer={<><Button variant="ghost" onClick={() => setPrint(null)}>Fermer</Button><Button variant="gold" icon={<Printer size={16} />} onClick={() => telechargerRapportPDF()}>Télécharger PDF</Button></>}>
        {print && (
          <div className="rounded-2xl border border-black/10 p-6">
            <div className="border-b border-black/10 pb-4 text-center">
              <h3 className="font-display text-xl font-bold">{db.tontine.nom}</h3>
              <p className="text-xs text-ink/50">{db.tontine.ville}</p>
              <p className="mt-2 font-semibold">Rapport financier — {print.periode}</p>
            </div>
            <div className="grid gap-4 py-5 sm:grid-cols-3">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Auteur</p><p className="font-semibold">{print.auteur}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Date</p><p className="font-semibold">{fmtDate(print.date)}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Statut</p><p className="font-semibold">{print.statut}</p></div>
            </div>
            <div className="border-t border-black/10 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Résumé</p>
              <p className="mt-1 text-sm leading-relaxed">{print.resume}</p>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div><p className="text-xs text-ink/40">Signature du trésorier</p><div className="mt-8 border-b border-black/20" /></div>
              <div><p className="text-xs text-ink/40">Visa du président</p><div className="mt-8 border-b border-black/20" /></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
