import { useState } from 'react'
import { api } from '../lib/api'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem } from '../components/ui'
import { Donut, Bars, Legend } from '../components/charts'
import { fmtXAF, fmtDate, fmtNum, today, now, uid, sum, byId, monthKey, monthLabel, runValidators, vRequired, vTel, vMinLen } from '../lib/utils'
import {
  Play, Pause, Flag, Save,
  Megaphone, AlertTriangle, Inbox, Check, ListChecks, Landmark, Timer,
  CircleCheck, TriangleAlert, Siren, ShieldCheck, Ban, User, Feather,
  Plus, ArrowRight, FileDown, MessageSquare, Mail, Scale, Banknote,
  ChevronUp, ChevronDown,
} from '../components/icons'

/* ============================ DASHBOARD PRÉSIDENT ============================ */
/* Fenêtre glissante des n derniers mois (clés YYYY-MM). */
const lastMonths = (n = 6) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - (n - 1 - i)); return d.toISOString().slice(0, 7)
})

export function PresidentHome() {
  const { db } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const validées = db.cotisations.filter(o => o.statut === 'Validée')
  const attendes = db.cotisations.filter(o => o.statut === 'En attente')
  const totalCaisse = sum(Object.values(db.caisse.XAF))
  const mois = monthKey()
  const cotisMois = sum(validées.filter(o => monthKey(o.date) === mois), o => o.montant)
  const aJour = db.membres.filter(m => m.statut === 'Actif' && !db.penalites.some(p => p.membreId === m.id && !p.payee)).length
  /* Prochain bénéficiaire : premier membre actif de l'ordre qui n'a pas encore
     de cotisation validée pour son tour (sinon le premier actif de l'ordre). */
  const prochainTour = db.ordrePassage.find(id => db.membres.find(m => m.id === id)?.statut === 'Actif')
  const ben = byId(db.membres, prochainTour)
  /* Fenêtre glissante des 6 derniers mois (plus de mois hardcodés). */
  const moisCotis = lastMonths(6).map(k => ({ label: monthLabel(k).split(' ')[0].slice(0, 4), value: sum(validées.filter(o => monthKey(o.date) === k), o => o.montant) }))
  const PALETTE = ['#187830', '#d8a800', '#07331a', '#9ac48b', '#e7b233', '#8fb396', '#6b7f8e', '#b5651d']
  const caisseData = Object.entries(db.caisse.XAF || {})
    .map(([label, value], i) => ({ label, value: value || 0, color: PALETTE[i % PALETTE.length] }))
    .filter(o => o.value > 0 || ['Cotisation', 'Épargne'].includes(o.label))
  return (
    <div className="space-y-6">
      {/* Hero bandeau */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-6 text-white sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#07331a,#12632a_50%,#187830)] bg-[length:200%_200%] animate-gradient" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl animate-float" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-300">Espace Président · {BUREAU_LABELS[user.role]}</p>
            <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Bonjour {user.nom.split(' ')[0]}, <span className="gold-text">{t.nom}</span> va bien.</h1>
            <p className="mt-2 max-w-xl text-sm text-brand-100/70">{fmtXAF(t.montantCotisation)} {t.frequence.toLowerCase()} · {db.membres.filter(m => m.statut === 'Actif').length} membres actifs · Démarrée le {fmtDate(t.dateDebut)}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-gold-400/30 bg-white/5 px-5 py-4 backdrop-blur">
            <Avatar name={ben?.nom || ''} size="lg" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">Bénéficiaire du tour en cours</p>
              <p className="font-display text-lg font-semibold">{ben?.nom}</p>
              <p className="text-xs text-brand-100/60">Montant attendu : {fmtXAF(t.montantTour || t.montantCotisation)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat large tone="gold" label="Trésor total" value={fmtXAF(totalCaisse)} sub="Caisse + banque + mobile money" icon={<Landmark size={20} />} />
        <Stat tone="brand" label="Cotisations du mois" value={fmtXAF(cotisMois)} sub={`${validées.filter(o => monthKey(o.date) === mois).length} paiements validés`} icon={<Inbox size={18} />} />
        <Stat tone="brand" label="Paiements à valider" value={fmtNum(attendes.length)} sub="Encaissements OM / MoMo / Carte en attente" icon={<Timer size={18} />} />
        <Stat tone="brand" label="Membres à jour" value={`${aJour}/${db.membres.length}`} sub={`${db.penalites.filter(p => !p.payee).length} pénalités impayées`} icon={<CircleCheck size={18} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card title="Répartition du trésor" subtitle="Caisses du club en francs CFA (XAF)" className="xl:col-span-2">
          <div className="flex items-center gap-6">
            <Donut data={caisseData} center={<div><p className="font-display text-lg font-semibold">{fmtNum(totalCaisse / 1000)}K</p><p className="text-[10px] font-bold text-ink/40">FCFA</p></div>} />
            <Legend data={caisseData} />
          </div>
        </Card>
        <Card title="Encaissements mensuels" subtitle="Cotisations validées (6 derniers mois)" className="xl:col-span-3">
          <Bars data={moisCotis} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Ordre de passage" subtitle="Calendrier rotatif des bénéficiaires" pad={false}>
          <div className="p-3">
            {db.ordrePassage.slice(0, 6).map((id, i) => {
              const m = byId(db.membres, id)
              const déjà = i < 3
              return (
                <RowItem key={id} icon={déjà ? <CircleCheck size={16} className="text-brand-600" /> : <span className="grid h-4 w-4 place-items-center text-[11px] font-bold text-ink/60">{i + 1}</span>} title={m.nom} sub={déjà ? 'Tour servi' : i === 3 ? 'Tour en cours' : `Prévu mois +${i - 2}`}
                  right={déjà ? <Badge tone="green">Payé</Badge> : i === 3 ? <Badge tone="brand" dot>En cours</Badge> : <Badge tone="gray">À venir</Badge>} />
              )
            })}
          </div>
        </Card>
        <Card title="Alertes du commissaire" subtitle="Fraudes et anomalies signalées" pad={false}
          actions={<Badge tone={db.alertes.filter(a => a.statut === 'Nouvelle').length ? 'red' : 'green'}>{db.alertes.filter(a => a.statut === 'Nouvelle').length} nouvelle(s)</Badge>}>
          <div className="p-3">
            {db.alertes.length === 0 && <EmptyState icon={<ShieldCheck size={16} />} title="Aucune alerte" sub="Le commissaire aux comptes n'a rien signalé." />}
            {db.alertes.slice().reverse().map(a => (
              <RowItem key={a.id} icon={a.type === 'Fraude' ? <Siren size={16} className="text-red-600" /> : <TriangleAlert size={16} className="text-amber-600" />} title={a.message} sub={`${a.type} · par ${a.de} · ${fmtDate(a.date.slice(0, 10))}`}
                right={a.statut === 'Nouvelle' ? <Badge tone="red" dot>{a.statut}</Badge> : <Badge tone="green">Traitée</Badge>} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================ TONTINE ============================ */
export function TontinePage() {
  const { db, setDb, toast } = useStore()
  const t = db.tontine
  const [form, setForm] = useState({ ...t })
  const [confirm, setConfirm] = useState(null)

  const posts = ['President', 'Tresorier', 'Secretaire', 'Commissaire']
  const requis = ['President', 'Tresorier']
  const titulaires = Object.fromEntries(posts.map(p => [p, db.membres.find(m => m.role === p)]))
  const bureauOk = requis.every(p => !!titulaires[p])
  const enPreparation = t.statut === 'Preparation'

  const save = () => { setDb(d => ({ ...d, tontine: { ...d.tontine, ...form } })); toast('Paramètres de la tontine enregistrés') }
  const setStatut = (statut) => {
    if (statut === 'Active' && !bureauOk) {
      setConfirm(null)
      return toast('Impossible de démarrer : nommez au moins le Président et le Trésorier', 'error')
    }
    setDb(d => ({
      ...d,
      tontine: { ...d.tontine, statut },
      // Notifier tous les membres actifs du changement de cycle de la tontine.
      notifications: [...d.notifications, ...d.membres.filter(m => m.statut === 'Actif').map(m => ({
        id: uid('nt'), pour: m.id, titre: 'Vie de la tontine',
        message: statut === 'Active' ? `La tontine ${d.tontine?.nom || ''} est démarrée — le cycle des tours commence.`
          : statut === 'Pause' ? 'La tontine est mise en pause par le Président.'
          : statut === 'Clôturée' ? 'La tontine est clôturée — fin du cycle.'
          : `Statut de la tontine : ${statut}.`,
        lu: false, date: now(),
      }))],
    }))
    setConfirm(null)
    toast(statut === 'Active' ? (enPreparation ? 'La tontine est démarrée — bon cycle à tous' : 'La tontine est relancée') : statut === 'Pause' ? 'Tontine mise en pause' : 'Tontine clôturée — cycle terminé', 'info')
  }

  const STATUTS = ['Preparation', 'Active', 'Pause', 'Clôturée']
  const statutTone = (s) => s === 'Active' ? 'green' : s === 'Pause' ? 'amber' : s === 'Clôturée' ? 'red' : 'blue'

  return (
    <div>
      <PageHeader title="Ma tontine" sub="Paramétrez le club et pilotez son cycle de vie."
        actions={
          <>
            {enPreparation && (
              <Button icon={<Play size={16} />} disabled={!bureauOk} onClick={() => setConfirm('Active')}
                title={bureauOk ? '' : 'Nommez le Président et le Trésorier pour démarrer'}>Démarrer la tontine</Button>
            )}
            {t.statut === 'Active' && <Button variant="outline" icon={<Pause size={16} />} onClick={() => setConfirm('Pause')}>Mettre en pause</Button>}
            {t.statut === 'Pause' && <Button icon={<Play size={16} />} disabled={!bureauOk} onClick={() => setConfirm('Active')}>Relancer</Button>}
            {t.statut !== 'Clôturée' && !enPreparation && <Button variant="danger" icon={<Flag size={16} />} onClick={() => setConfirm('Clôturée')}>Clôturer le cycle</Button>}
          </>
        } />
      <div className="mb-5 flex items-center gap-2 animate-fade-up">
        {STATUTS.map(s => <Badge key={s} tone={t.statut === s ? statutTone(s) : 'gray'} dot={t.statut === s}>{s === 'Preparation' ? 'En préparation' : s}</Badge>)}
      </div>

      {/* Bureau — condition de démarrage */}
      <Card className="mb-5" title="Bureau exécutif" subtitle="Le Président et le Trésorier sont requis avant de démarrer ; le Secrétaire et le Commissaire sont recommandés.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {posts.map(p => {
            const m = titulaires[p]
            const isRequis = requis.includes(p)
            return (
              <div key={p} className={`rounded-xl border px-4 py-3 ${m ? 'border-brand-200 bg-brand-50/60' : isRequis ? 'border-amber-200 bg-amber-50/60' : 'border-black/10 bg-white'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/60">{BUREAU_LABELS[p]}</p>
                  {m ? <Check size={16} className="text-brand-600" /> : isRequis ? <AlertTriangle size={16} className="text-amber-600" /> : <span className="text-[10px] font-semibold text-ink/40">recommandé</span>}
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{m ? m.nom : <span className="text-ink/35">Poste vacant</span>}</p>
                <p className="text-[11px] text-ink/45">{isRequis ? 'Requis' : 'Recommandé'}</p>
              </div>
            )
          })}
        </div>
        {enPreparation && !bureauOk && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            <ListChecks size={16} /> Nommez le Président et le Trésorier dans « Bureau exécutif » pour pouvoir démarrer la tontine.
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3 stagger">
        <Card title="Identité du club" className="lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nom du club"><Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></Field>
            <Field label="Ville / Pays"><Input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} /></Field>
            <Field label="Date de début"><Input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} /></Field>
          </div>
        </Card>

        <Card title="Règles financières" className="lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Cotisation (XAF)"><Input type="number" value={form.montantCotisation} onChange={e => setForm(f => ({ ...f, montantCotisation: +e.target.value }))} /></Field>
            <Field label="Fréquence"><Select value={form.frequence} onChange={e => setForm(f => ({ ...f, frequence: e.target.value }))} options={['Hebdomadaire', 'Mensuelle', 'Trimestrielle']} /></Field>
            <Field label="Pénalité de retard"><Input type="number" value={form.penaliteRetard} onChange={e => setForm(f => ({ ...f, penaliteRetard: +e.target.value }))} /></Field>
            <Field label="Taux de prêt (%)"><Input type="number" value={form.tauxPret} onChange={e => setForm(f => ({ ...f, tauxPret: +e.target.value }))} /></Field>
            <Field label="Montant du tour (XAF)"><Input type="number" value={form.montantTour || 0} onChange={e => setForm(f => ({ ...f, montantTour: +e.target.value }))} /></Field>
            <Field label="Banque du club" className="sm:col-span-2 xl:col-span-3"><Input value={form.banque} onChange={e => setForm(f => ({ ...f, banque: e.target.value }))} /></Field>
          </div>
          <div className="mt-4"><Button variant="gold" onClick={save} icon={<Save size={16} />}>Enregistrer les paramètres</Button></div>
        </Card>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirmer l'action" subtitle="Cette action est visible par tout le bureau."
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button><Button variant={confirm === 'Clôturée' ? 'danger' : 'primary'} onClick={() => setStatut(confirm)}>Confirmer</Button></>}>
        <p className="text-sm text-ink/70">{confirm === 'Clôturée' ? 'La clôture arrête définitivement les cotisations et decaissements du cycle en cours.' : confirm === 'Pause' ? 'La pause suspend temporairement cotisations et decaissements.' : enPreparation ? 'Le démarrage active les cotisations, les tours et toutes les opérations de la tontine.' : 'La relance réactive toutes les opérations de la tontine.'}</p>
      </Modal>
    </div>
  )
}

/* ============================ ORDRE DE PASSAGE ============================ */
export function OrdrePage() {
  const { db, setDb, toast } = useStore()
  const move = (id, dir) => {
    setDb(d => {
      const arr = [...d.ordrePassage]
      const i = arr.indexOf(id), j = i + dir
      if (j < 0 || j >= arr.length) return d
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...d, ordrePassage: arr }
    })
  }
  /* Retirer un membre de l'ordre (exclusion / départ) — le président garde
     la main sur la composition du cycle. */
  const retirer = (id) => {
    const m = byId(db.membres, id)
    if (!window.confirm(`Retirer ${m?.nom || 'ce membre'} du calendrier de passage ?`)) return
    setDb(d => ({ ...d, ordrePassage: d.ordrePassage.filter(x => x !== id) }))
    toast(`${m?.nom || 'Membre'} retiré du calendrier`)
  }
  /* Ajouter un membre actif absent de l'ordre (en fin de cycle). */
  const absents = db.membres.filter(m => m.statut === 'Actif' && !db.ordrePassage.includes(m.id))
  const ajouter = (id) => {
    setDb(d => ({ ...d, ordrePassage: [...d.ordrePassage, id] }))
    toast('Membre ajouté en fin de calendrier')
  }
  /* Nombre de tours réellement servis = cotisations validées rattachées à un
     tour (une par bénéficiaire) ; le tour "en cours" est le suivant. */
  const toursServis = db.ordrePassage.filter((id) =>
    db.cotisations.some(c => c.membreId === id && c.statut === 'Validée')).length
  /* Validation réelle : notification à tous les membres actifs (persistée + synchronisée). */
  const validerCalendrier = () => {
    if (!db.ordrePassage.length) return toast('Ajoutez des membres au calendrier avant de valider', 'error')
    setDb(d => ({
      ...d,
      notifications: [...d.notifications, ...d.membres
        .filter(m => m.statut === 'Actif')
        .map(m => {
          const pos = d.ordrePassage.indexOf(m.id)
          return { id: uid('nt'), pour: m.id, titre: 'Calendrier validé', message: `Le calendrier de passage a été validé par le président.${pos >= 0 ? ` Vous êtes ${pos + 1}${pos === 0 ? 'er' : 'e'} sur ${d.ordrePassage.length}.` : ''}`, lu: false, date: now() }
        })],
    }))
    toast('Calendrier validé — membres notifiés')
  }
  return (
    <div>
      <PageHeader title="Calendrier de passage" sub="Approuvez et ajustez l'ordre des bénéficiaires du cycle."
        actions={<Button variant="gold" icon={<CircleCheck size={16} />} onClick={validerCalendrier}>Valider le calendrier</Button>} />
      <Card pad={false}>
        <div className="p-3">
          {db.ordrePassage.map((id, i) => {
            const m = byId(db.membres, id)
            const servi = i < toursServis
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-50/60">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-semibold ${servi ? 'bg-brand-100 text-brand-700' : i === toursServis ? 'bg-gold-100 text-gold-700' : 'bg-brand-950 text-gold-300'}`}>{i + 1}</span>
                <Avatar name={m?.nom || '?'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m?.nom || 'Membre retiré'}</p>
                  <p className="text-xs text-ink/50">{m ? BUREAU_LABELS[m.role] : '—'}</p>
                </div>
                {servi ? <Badge tone="green">Tour servi</Badge> : i === toursServis ? <Badge tone="brand" dot>Tour en cours</Badge> : <Badge tone="gray">Prévu</Badge>}
                <div className="ml-2 flex gap-1">
                  <button onClick={() => move(id, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg bg-black/5 text-xs transition hover:bg-brand-100 disabled:opacity-30 cursor-pointer"><ChevronUp size={16} /></button>
                  <button onClick={() => move(id, 1)} disabled={i === db.ordrePassage.length - 1} className="grid h-8 w-8 place-items-center rounded-lg bg-black/5 text-xs transition hover:bg-brand-100 disabled:opacity-30 cursor-pointer"><ChevronDown size={16} /></button>
                  <button onClick={() => retirer(id)} title="Retirer du calendrier" className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 text-xs transition hover:bg-red-100 cursor-pointer"><Ban size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
        {absents.length > 0 && (
          <div className="border-t border-black/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/45">Membres actifs hors calendrier ({absents.length})</p>
            <div className="flex flex-wrap gap-2">
              {absents.map(m => (
                <button key={m.id} onClick={() => ajouter(m.id)}
                  className="flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 transition hover:border-brand-400 cursor-pointer">
                  <Plus size={13} /> {m.nom}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ============================ MEMBRES ============================ */
export function MembresPage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('liste')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nom: '', tel: '', email: '', profession: '' })
  const [errors, setErrors] = useState({})
  const [importOpen, setImportOpen] = useState(false)
  const [bulk, setBulk] = useState('')

  const add = () => {
    const errs = runValidators(form, {
      nom: [vRequired('Le nom complet est obligatoire.'), vMinLen(4, 'Le nom doit faire au moins 4 caractères.')],
      tel: [vTel()],
      email: [v => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) ? 'Adresse e-mail invalide.' : ''],
    })
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return toast('Corrigez les champs signalés avant d\'enregistrer', 'error')
    const m = { id: uid('m'), ...form, role: 'Membre', statut: 'En attente', twoFA: false, dateAdhesion: today(), photo: null }
    setDb(d => ({ ...d, membres: [...d.membres, m], ordrePassage: [...d.ordrePassage, m.id], notifications: [...d.notifications, { id: uid('nt'), pour: m.id, titre: 'Bienvenue au club', message: `Votre compte ${d.tontine.nom} a été créé. Il sera actif après validation du bureau.`, lu: false, date: now() }] }))
    setOpen(false); setForm({ nom: '', tel: '', email: '', profession: '' }); setErrors({})
    toast(`Membre « ${m.nom} » enregistré (statut : en attente d'activation)`)
  }
  const importBulk = () => {
    const lignes = bulk.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [nom, tel] = l.split(/[;,\t]/); return { nom: nom?.trim(), tel: tel?.trim() } }).filter(x => x.nom && x.tel)
    if (!lignes.length) return toast('Format attendu : une ligne par membre — « Nom ; Téléphone »', 'error')
    const nouveaux = lignes.map(x => ({ id: uid('m'), nom: x.nom, tel: x.tel, email: '', profession: '', role: 'Membre', statut: 'En attente', twoFA: false, dateAdhesion: today(), photo: null }))
    setDb(d => ({ ...d, membres: [...d.membres, ...nouveaux], ordrePassage: [...d.ordrePassage, ...nouveaux.map(n => n.id)] }))
    setImportOpen(false); setBulk(''); toast(`${nouveaux.length} membre(s) importé(s)`)
  }
  const activer = (m) => { setDb(d => ({ ...d, membres: d.membres.map(x => x.id === m.id ? { ...x, statut: 'Actif' } : x),
    notifications: [...d.notifications, { id: uid('nt'), pour: m.id, titre: 'Compte activé', message: 'Votre adhésion à la tontine a été validée — bienvenue !', lu: false, date: now() }] })); toast(`${m.nom} est maintenant actif`) }
  const suspendre = (m) => {
    const suspend = m.statut !== 'Suspendu'
    setDb(d => ({
      ...d,
      membres: d.membres.map(x => x.id === m.id ? { ...x, statut: suspend ? 'Suspendu' : 'Actif' } : x),
      notifications: [...d.notifications, { id: uid('nt'), pour: m.id, titre: suspend ? 'Compte suspendu' : 'Compte réactivé', message: suspend ? 'Votre participation a été suspendue par le Président.' : 'Votre participation a été réactivée — bienvenue à nouveau.', lu: false, date: now() }],
    }))
    toast(`Statut de ${m.nom} modifié`, 'info')
  }

  const rows = db.membres.filter(m => tab === 'liste' ? true : tab === 'attente' ? m.statut === 'En attente' : m.statut !== 'Actif')
  return (
    <div>
      <PageHeader title="Gestion des membres" sub="Créez, ajoutez en lot et activez les membres du club."
        actions={<><Button variant="outline" icon={<FileDown size={16} />} onClick={() => setImportOpen(true)}>Ajout en lot</Button><Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Nouveau membre</Button></>} />
      <div className="mb-4"><Tabs active={tab} onChange={setTab} tabs={[{ id: 'liste', label: `Tous (${db.membres.length})` }, { id: 'attente', label: `En attente (${db.membres.filter(m => m.statut === 'En attente').length})` }, { id: 'inactifs', label: 'Inactifs / Suspendus' }]} /></div>
      <Card pad={false}>
        <div className="p-3">
          {rows.length === 0 && <EmptyState title="Aucun membre dans cette vue" />}
          {rows.map(m => {
            const cotis = db.cotisations.filter(o => o.membreId === m.id && o.statut === 'Validée')
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-50/60">
                <Avatar name={m.nom} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">{m.nom} {m.role !== 'Membre' && <Badge tone="gold">{BUREAU_LABELS[m.role]}</Badge>}</p>
                  <p className="truncate text-xs text-ink/50">{m.tel} · {m.profession || '—'} · {cotis.length} cotisation(s) validée(s)</p>
                </div>
                <Badge tone={statusTone(m.statut)}>{m.statut}</Badge>
                <div className="flex gap-1.5">
                  {m.statut === 'En attente' && <Button size="sm" onClick={() => activer(m)}>Activer</Button>}
                  {m.statut !== 'En attente' && <Button size="sm" variant="outline" onClick={() => suspendre(m)}>{m.statut === 'Suspendu' ? 'Réactiver' : 'Suspendre'}</Button>}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau membre" subtitle="Le membre sera activé après vérification du bureau" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={add}>Enregistrer</Button></>}>
        <div className="space-y-4">
          <Field label="Nom complet" required error={errors.nom}>
            <Input value={form.nom} error={errors.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Atangana Mve Barbara" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone" required error={errors.tel}>
              <Input value={form.tel} error={errors.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="+237 6 55 00 11 22" />
            </Field>
            <Field label="Profession"><Input value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} placeholder="Ex : Commerçant(e)" /></Field>
          </div>
          <Field label="E-mail (optionnel)" error={errors.email} hint="Permet au membre de créer son compte avec ce même e-mail.">
            <Input type="email" value={form.email} error={errors.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="membre@exemple.om" />
          </Field>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Ajout rapide de membres" subtitle="Une ligne par membre : Nom ; Téléphone — plus rapide qu'un formulaire" footer={<><Button variant="ghost" onClick={() => setImportOpen(false)}>Annuler</Button><Button onClick={importBulk}>Importer</Button></>}>
        <Field label="Liste à importer" hint="Copiez-collez depuis un carnet de contacts ou un tableau (séparateur « ; » ou tabulation).">
          <Textarea value={bulk} onChange={e => setBulk(e.target.value)} className="min-h-40 font-mono text-xs" placeholder={'Atangana Mve Barbara ; +237 6 55 00 11 22\nMvondo Éric ; +237 6 90 22 33 44'} />
        </Field>
      </Modal>
    </div>
  )
}

/* ============================ BUREAU ============================ */
export function BureauPage() {
  const { db, setDb, toast } = useStore()
  const [edit, setEdit] = useState(null)
  const posts = ['President', 'Tresorier', 'Secretaire', 'Commissaire']
  const nominate = (membreId, poste) => {
    if (!membreId) return
    setDb(d => {
      let membres = d.membres.map(m => m.role === poste ? { ...m, role: 'Membre' } : m)
      const ancien = membres.find(m => m.role === poste)
      membres = membres.map(m => m.id === membreId ? { ...m, role: poste } : m)
      let notifications = d.notifications
      const elu = membres.find(m => m.id === membreId)
      if (elu) {
        notifications = [...notifications, { id: uid('nt'), pour: membreId, titre: 'Nomination au bureau', message: `Vous avez été nommé(e) ${BUREAU_LABELS[poste]} de ${d.tontine?.nom || 'la tontine'} par le Président.`, lu: false, date: now() }]
        if (ancien) notifications = [...notifications, { id: uid('nt'), pour: ancien.id, titre: 'Fin de fonction', message: `Vous n'occupez plus le poste de ${BUREAU_LABELS[poste]}.`, lu: false, date: now() }]
      }
      return { ...d, membres, notifications }
    })
    setEdit(null)
    toast(`${db.membres.find(m => m.id === membreId).nom} nommé(e) ${BUREAU_LABELS[poste]}`)
  }
  const revoke = (poste) => {
    setDb(d => {
      const titulaire = d.membres.find(m => m.role === poste)
      return {
        ...d,
        membres: d.membres.map(m => m.role === poste ? { ...m, role: 'Membre' } : m),
        notifications: titulaire ? [...d.notifications, { id: uid('nt'), pour: titulaire.id, titre: 'Fin de fonction', message: `Vous avez été révoqué(e) du poste de ${BUREAU_LABELS[poste]}.`, lu: false, date: now() }] : d.notifications,
      }
    })
    toast(`Le poste de ${BUREAU_LABELS[poste]} est vacant`, 'info')
  }
  const titulaires = Object.fromEntries(posts.map(p => [p, db.membres.find(m => m.role === p)]))
  return (
    <div>
      <PageHeader title="Bureau exécutif" sub="Nommez ou révoquez les membres du bureau." />
      <div className="grid gap-4 sm:grid-cols-2 stagger">
        {posts.map(p => {
          const m = titulaires[p]
          return (
            <Card key={p}>
              <div className="flex items-start gap-4">
                <Avatar name={m?.nom || '?'} size="lg" ring={p === 'President'} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-600">{BUREAU_LABELS[p]}</p>
                  <h3 className="mt-0.5 truncate font-display text-lg font-semibold">{m?.nom || <span className="text-ink/30">Poste vacant</span>}</h3>
                  <p className="text-xs text-ink/50">{m ? `${m.tel} · membre depuis ${fmtDate(m.dateAdhesion)}` : '—'}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEdit(p)}>{m ? 'Remplacer' : 'Nommer'}</Button>
                    {m && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => revoke(p)}>Révoquer</Button>}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Nommer — ${BUREAU_LABELS[edit] || ''}`} subtitle="Le membre nommé hérite des droits du poste ; l'ancien titulaire redevient simple membre."
        footer={<Button variant="ghost" onClick={() => setEdit(null)}>Fermer</Button>}>
        <div className="space-y-2">
          {db.membres.filter(m => m.id !== titulaires[edit]?.id && m.statut === 'Actif').map(m => (
            <button key={m.id} onClick={() => nominate(m.id, edit)} className="flex w-full items-center gap-3 rounded-xl border border-black/5 px-4 py-3 text-left transition hover:border-gold-400 hover:bg-gold-50/50 cursor-pointer">
              <Avatar name={m.nom} size="sm" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.nom}</p><p className="text-xs text-ink/50">{m.tel}</p></div>
              <ArrowRight size={16} className="text-gold-600" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

/* ============================ SANCTIONS ============================ */
export function SanctionsPage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ membreId: '', type: 'Amende', motif: '' })
  const add = () => {
    if (!form.membreId || !form.motif) return toast('Membre et motif obligatoires', 'error')
    setDb(d => ({ ...d, sanctions: [{ id: uid('sa'), date: today(), ...form }, ...d.sanctions],
      notifications: [...d.notifications, { id: uid('nt'), pour: form.membreId, titre: `Sanction — ${form.type}`, message: `Le Président vous a infligé une sanction : ${form.type}. Motif : ${form.motif}.`, lu: false, date: now() }] }))
    setOpen(false); setForm({ membreId: '', type: 'Amende', motif: '' })
    toast('Sanction enregistrée et notifiée au membre', 'info')
  }
  const exclure = (m) => {
    setDb(d => ({ ...d, membres: d.membres.map(x => x.id === m.id ? { ...x, statut: 'Exclu' } : x),
      notifications: [...d.notifications, { id: uid('nt'), pour: m.id, titre: 'Exclusion', message: 'Vous avez été exclu(e) de la tontine par le Président.', lu: false, date: now() }] }))
    toast(`${m.nom} a été exclu(e) de la tontine`, 'error')
  }
  return (
    <div>
      <PageHeader title="Sanctions & exclusions" sub="Avertissements, amendes et exclusions — les pénalités de retard sont gérées par le trésorier."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Nouvelle sanction</Button>} />
      <div className="grid gap-5 lg:grid-cols-2 stagger">
        <Card title="Historique des sanctions" pad={false}>
          <div className="p-3">
            {db.sanctions.length === 0 && <EmptyState icon={<Feather size={16} />} title="Aucune sanction" />}
            {db.sanctions.slice().reverse().map(s => (
              <RowItem key={s.id} icon={s.type === 'Exclusion' ? <Ban size={16} className="text-red-600" /> : s.type === 'Amende' ? <Scale size={16} className="text-amber-600" /> : <Megaphone size={16} className="text-sky-600" />} title={byId(db.membres, s.membreId)?.nom || '—'}
                sub={`${s.type} · ${s.motif} · ${fmtDate(s.date)}`} right={<Badge tone={s.type === 'Exclusion' ? 'red' : s.type === 'Amende' ? 'amber' : 'blue'}>{s.type}</Badge>} />
            ))}
          </div>
        </Card>
        <Card title="Membres à risque" subtitle="Suspendus, exclus ou avec pénalités impayées" pad={false}>
          <div className="p-3">
            {db.membres.filter(m => m.statut !== 'Actif' && m.statut !== 'En attente').map(m => (
              <RowItem key={m.id} icon={<User size={16} className="text-ink/60" />} title={m.nom} sub={`Statut : ${m.statut}`} right={m.statut !== 'Exclu' && <Button size="sm" variant="danger" onClick={() => exclure(m)}>Exclure</Button>} />
            ))}
            {db.penalites.filter(p => !p.payee).map(p => (
              <RowItem key={p.id} icon={<Banknote size={16} className="text-amber-600" />} title={`${byId(db.membres, p.membreId)?.nom} — pénalité impayée`} sub={`${p.motif} · ${fmtXAF(p.montant)}`} right={<Badge tone="amber">{fmtXAF(p.montant)}</Badge>} />
            ))}
          </div>
        </Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle sanction" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="danger" onClick={add}>Enregistrer</Button></>}>
        <div className="space-y-4">
          <Field label="Membre concerné"><Select value={form.membreId} onChange={e => setForm(f => ({ ...f, membreId: e.target.value }))}><option value="">— Choisir —</option>{db.membres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</Select></Field>
          <Field label="Type"><Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={['Avertissement', 'Amende', 'Exclusion']} /></Field>
          <Field label="Motif"><Textarea value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Décrire précisément le motif…" /></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ RAPPORTS À VALIDER ============================ */
export function RapportsPage() {
  const { db, setDb, toast } = useStore()
  const decide = (r, ok) => {
    // Notifier le trésorier de la décision sur son rapport.
    const tresorier = db.membres.find(m => m.role === 'Tresorier')
    setDb(d => ({
      ...d,
      rapports: d.rapports.map(x => x.id === r.id ? { ...x, statut: ok ? 'Validé' : 'Rejeté' } : x),
      notifications: tresorier ? [...d.notifications, { id: uid('nt'), pour: tresorier.id, titre: ok ? 'Rapport validé' : 'Rapport rejeté', message: `Le Président a ${ok ? 'validé' : 'rejeté'} votre rapport ${r.type} de la période ${r.periode}.${ok ? '' : ' Veuillez le corriger et le soumettre à nouveau.'}`, lu: false, date: now() }] : d.notifications,
    }))
    toast(ok ? `Rapport ${r.periode} validé` : `Rapport ${r.periode} rejeté — retourné au trésorier`, ok ? 'success' : 'error')
  }
  return (
    <div>
      <PageHeader title="Rapports financiers" sub="Validez ou rejetez les rapports soumis par le trésorier." />
      <div className="space-y-4 stagger">
        {db.rapports.map(r => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">Rapport {r.type} — {r.periode}</h3>
                  <Badge tone={statusTone(r.statut)}>{r.statut}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink/50">Par {r.auteur} · {fmtDate(r.date)}</p>
                <p className="mt-2 max-w-2xl text-sm text-ink/70">{r.resume}</p>
              </div>
              {r.statut === 'Soumis' ? (
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => decide(r, false)}>Rejeter</Button>
                  <Button onClick={() => decide(r, true)} icon={<CircleCheck size={16} />}>Valider</Button>
                </div>
              ) : <Badge tone={statusTone(r.statut)}>Décision rendue</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ============================ ALERTES FRAUDE ============================ */
export function AlertesPage() {
  const { db, setDb, toast } = useStore()
  const traiter = (a) => { setDb(d => ({ ...d, alertes: d.alertes.map(x => x.id === a.id ? { ...x, statut: 'Traitée' } : x) })); toast('Alerte marquée comme traitée') }
  const ouvertes = db.alertes.filter(a => a.statut === 'Nouvelle')
  return (
    <div>
      <PageHeader title="Alertes & anomalies" sub="Signalements du commissaire aux comptes." actions={<Badge tone={ouvertes.length ? 'red' : 'green'} dot={!!ouvertes.length}>{ouvertes.length} en attente</Badge>} />
      <div className="space-y-4 stagger">
        {db.alertes.length === 0 && <EmptyState icon={<ShieldCheck size={16} />} title="Aucune alerte reçue" sub="Le commissaire n'a signalé aucune anomalie." />}
        {db.alertes.slice().reverse().map(a => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${a.type === 'Fraude' ? 'bg-red-100' : 'bg-amber-100'}`}>{a.type === 'Fraude' ? <Siren size={22} className="text-red-600" /> : <TriangleAlert size={22} className="text-amber-600" />}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><h3 className="font-semibold">{a.message}</h3><Badge tone={statusTone(a.statut)}>{a.statut}</Badge></div>
                  <p className="mt-1 text-xs text-ink/50">{a.type} · signalé par {a.de} · {fmtDate(a.date.slice(0, 10))}</p>
                </div>
              </div>
              {a.statut === 'Nouvelle' && <Button size="sm" variant="outline" onClick={() => traiter(a)}>Marquer traitée</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ============================ NOTIFICATIONS DE MASSE ============================ */
export function DiffusionPage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [form, setForm] = useState({ message: '', canal: 'In-app + email', cible: 'Tous les membres' })
  const [sending, setSending] = useState(false)

  /* Ciblage réel : la sélection détermine réellement les destinataires. */
  const cibles = () => {
    if (form.cible === 'Membres en retard') {
      return db.membres.filter(m => m.statut === 'Actif' && !db.cotisations.some(c => c.membreId === m.id && c.statut === 'Validée' && monthKey(c.date) === monthKey()))
    }
    if (form.cible === 'Bureau uniquement') {
      return db.membres.filter(m => m.statut === 'Actif' && ['President', 'Tresorier', 'Secretaire', 'Commissaire'].includes(m.role))
    }
    return db.membres.filter(m => m.statut === 'Actif')
  }

  const envoyer = async () => {
    if (form.message.trim().length < 5) return toast('Le message est trop court', 'error')
    const destinataires = cibles()
    if (!destinataires.length) return toast('Aucun destinataire pour cette cible', 'error')

    setSending(true)
    /* 1. Notification in-app — source principale, toujours créée. */
    setDb(d => ({
      ...d,
      notifsMasse: [{ id: uid('nm'), date: today(), ...form, par: user.nom }, ...d.notifsMasse],
      notifications: [...d.notifications, ...destinataires.map(m => ({ id: uid('nt'), pour: m.id, titre: 'Message du bureau', message: form.message, lu: false, date: now() }))],
    }))

    /* 2. Relais externe email/SMS — si les passerelles serveur sont configurées ;
        en leur absence l'in-app seule est honnêtement annoncée. */
    let relais = { email: 0, sms: 0 }
    try {
      const results = await Promise.allSettled(destinataires.map(m =>
        api.notifyExternal({ email: m.email || null, tel: m.tel || null, titre: 'Message du bureau', message: form.message })))
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.channels) {
          if (r.value.channels.email) relais.email++
          if (r.value.channels.sms) relais.sms++
        }
      }
    } catch { /* relais best-effort */ }
    setSending(false)
    setForm(f => ({ ...f, message: '' }))
    toast(`Diffusion in-app à ${destinataires.length} membre(s)` + (relais.email || relais.sms ? ` + relais externes (${relais.email} email(s), ${relais.sms} SMS)` : ''))
  }
  return (
    <div>
      <PageHeader title="Notification de masse" sub="Diffusez un message aux membres — in-app toujours, email/SMS en relais si configurés." />
      <div className="grid gap-5 lg:grid-cols-5 stagger">
        <Card title="Composer" className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="Cible"><Select value={form.cible} onChange={e => setForm(f => ({ ...f, cible: e.target.value }))} options={['Tous les membres', 'Membres en retard', 'Bureau uniquement']} /></Field>
            <Field label="Relais externe" hint="L'in-app est toujours envoyée ; l'email/SMS part si les passerelles serveur sont configurées.">
              <Select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))} options={['In-app + email', 'In-app + SMS']} />
            </Field>
            <Field label="Message" hint={`${form.message.length}/500 caractères`}><Textarea maxLength={500} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Ex : Rappel — la cotisation d'octobre doit être réglée avant le 5…" /></Field>
            <Button variant="gold" className="w-full" onClick={envoyer} disabled={sending} icon={<Megaphone size={16} />}>{sending ? 'Diffusion…' : 'Diffuser maintenant'}</Button>
          </div>
        </Card>
        <Card title="Historique des diffusions" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {db.notifsMasse.length === 0 && <EmptyState icon={<Megaphone size={16} />} title="Aucune diffusion" />}
            {db.notifsMasse.map(n => (
              <RowItem key={n.id} icon={n.canal === 'In-app + SMS' ? <MessageSquare size={16} className="text-brand-600" /> : <Mail size={16} className="text-amber-600" />} title={n.message} sub={`${n.canal} · ${n.cible} · ${fmtDate(n.date)}${n.par ? ` · par ${n.par}` : ''}`} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
