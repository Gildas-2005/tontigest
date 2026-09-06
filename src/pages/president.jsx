import { useState } from 'react'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem } from '../components/ui'
import { Donut, Bars, Legend } from '../components/charts'
import { fmtXAF, fmtDate, fmtNum, today, now, uid, sum, byId, monthKey, monthLabel } from '../lib/utils'

/* ============================ DASHBOARD (UC43-like view for président) ============================ */
export function PresidentHome() {
  const { db } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const validées = db.cotisations.filter(c => c.statut === 'Validée')
  const attendes = db.cotisations.filter(c => c.statut === 'En attente')
  const totalCaisse = sum(Object.values(db.caisse.XAF)) + sum(Object.values(db.caisse.EUR)) * 650
  const mois = monthKey()
  const cotisMois = sum(validées.filter(c => monthKey(c.date) === mois), c => c.montant)
  const aJour = db.membres.filter(m => m.statut === 'Actif' && !db.penalites.some(p => p.membreId === m.id && !p.payee)).length
  const prochainTour = db.ordrePassage.find(id => db.membres.find(m => m.id === id).statut === 'Actif')
  const ben = byId(db.membres, prochainTour)
  const moisCotis = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', mois].map(k => ({ label: monthLabel(k).split(' ')[0].slice(0, 4), value: sum(validées.filter(c => monthKey(c.date) === k), c => c.montant) }))
  const caisseData = [
    { label: 'Banque BICEC', value: db.caisse.XAF.Banque, color: '#0a573d' },
    { label: 'Caisse espèces', value: db.caisse.XAF.Caisse, color: '#17855a' },
    { label: 'Orange Money', value: db.caisse.XAF.OM, color: '#e7b233' },
    { label: 'MTN MoMo', value: db.caisse.XAF.MoMo, color: '#3aa274' },
  ]
  return (
    <div className="space-y-6">
      {/* Hero bandeau */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-950 p-6 text-white sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#032018,#063626_50%,#0a573d)] bg-[length:200%_200%] animate-gradient" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl animate-float" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-300">Espace Président · {BUREAU_LABELS[user.role]}</p>
            <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Bonjour {user.nom.split(' ')[0]}, <span className="gold-text">{t.nom}</span> va bien.</h1>
            <p className="mt-2 max-w-xl text-sm text-brand-100/70">{t.type} · {fmtXAF(t.montantCotisation)} {t.frequence.toLowerCase()} · {db.membres.filter(m => m.statut === 'Actif').length} membres actifs · Démarrée le {fmtDate(t.dateDebut)}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-gold-400/30 bg-white/5 px-5 py-4 backdrop-blur">
            <Avatar name={ben?.nom || ''} size="lg" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">Bénéficiaire du tour en cours</p>
              <p className="font-display text-lg font-semibold">{ben?.nom}</p>
              <p className="text-xs text-brand-100/60">Montant attendu : {fmtXAF(t.tauxEnchereMin)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Trésor total" value={fmtXAF(totalCaisse)} sub="Caisse + banque + mobile money" icon="🏦" tone="brand" />
        <Stat label="Cotisations du mois" value={fmtXAF(cotisMois)} sub={`${validées.filter(c => monthKey(c.date) === mois).length} paiements validés`} icon="📥" tone="gold" />
        <Stat label="Paiements à valider" value={fmtNum(attendes.length)} sub="Encaissements OM / MoMo / Carte en attente" icon="⏳" tone="violet" />
        <Stat label="Membres à jour" value={`${aJour}/${db.membres.length}`} sub={`${db.penalites.filter(p => !p.payee).length} pénalités impayées`} icon="✅" tone="blue" />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card title="Répartition du trésor" subtitle="Multi-comptes & multi-devises (XAF)" className="xl:col-span-2">
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
                <RowItem key={id} icon={déjà ? '✅' : `${i + 1}`} title={m.nom} sub={déjà ? 'Tour servi' : i === 3 ? 'Tour en cours' : `Prévu mois +${i - 2}`}
                  right={déjà ? <Badge tone="green">Payé</Badge> : i === 3 ? <Badge tone="blue" dot>En cours</Badge> : <Badge tone="gray">À venir</Badge>} />
              )
            })}
          </div>
        </Card>
        <Card title="Alertes du commissaire" subtitle="Fraudes et anomalies signalées (UC47)" pad={false}
          actions={<Badge tone={db.alertes.filter(a => a.statut === 'Nouvelle').length ? 'red' : 'green'}>{db.alertes.filter(a => a.statut === 'Nouvelle').length} nouvelle(s)</Badge>}>
          <div className="p-3">
            {db.alertes.length === 0 && <EmptyState icon="🛡️" title="Aucune alerte" sub="Le commissaire aux comptes n'a rien signalé." />}
            {db.alertes.slice().reverse().map(a => (
              <RowItem key={a.id} icon={a.type === 'Fraude' ? '🚨' : '⚠️'} title={a.message} sub={`${a.type} · par ${a.de} · ${fmtDate(a.date.slice(0, 10))}`}
                right={a.statut === 'Nouvelle' ? <Badge tone="red" dot>{a.statut}</Badge> : <Badge tone="green">Traitée</Badge>} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================ TONTINE (UC5, UC6, UC7, UC11) ============================ */
export function TontinePage() {
  const { db, setDb, toast } = useStore()
  const t = db.tontine
  const [form, setForm] = useState({ ...t })
  const [confirm, setConfirm] = useState(null)

  const save = () => { setDb(d => ({ ...d, tontine: { ...d.tontine, ...form } })); toast('Paramètres de la tontine enregistrés') }
  const setStatut = (statut) => {
    setDb(d => ({ ...d, tontine: { ...d.tontine, statut } }))
    setConfirm(null)
    toast(statut === 'Active' ? 'La tontine est relancée 🚀' : statut === 'Pause' ? 'Tontine mise en pause ⏸' : 'Tontine clôturée — cycle terminé 🏁', 'info')
  }

  return (
    <div>
      <PageHeader title="Ma tontine" sub="Créez, paramétrez et pilotez le cycle de vie de la tontine (UC5 · UC6 · UC7 · UC11)."
        actions={
          <>
            {t.statut === 'Active' && <Button variant="outline" icon="⏸" onClick={() => setConfirm('Pause')}>Mettre en pause</Button>}
            {t.statut === 'Pause' && <Button icon="▶" onClick={() => setConfirm('Active')}>Relancer</Button>}
            {t.statut !== 'Clôturée' && <Button variant="danger" icon="🏁" onClick={() => setConfirm('Clôturée')}>Clôturer le cycle</Button>}
          </>
        } />
      <div className="mb-5 flex items-center gap-2 animate-fade-up">
        {['Active', 'Pause', 'Clôturée'].map(s => <Badge key={s} tone={t.statut === s ? (s === 'Active' ? 'green' : s === 'Pause' ? 'amber' : 'red') : 'gray'} dot={t.statut === s}>{s}</Badge>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-3 stagger">
        <Card title="Identité (UC5)" className="lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nom du club"><Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></Field>
            <Field label="Ville / Pays"><Input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} /></Field>
            <Field label="Date de début"><Input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} /></Field>
          </div>
        </Card>

        <Card title="Type de tontine (UC6)">
          <Field label="Formule">
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={['Classique', 'Rotative', 'Enchère']} />
          </Field>
          <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">
            {form.type === 'Classique' && 'Chaque membre cotise ; le bénéficiaire est désigné à l\'avance et reçoit la totalité du tour.'}
            {form.type === 'Rotative' && 'Les membres reçoivent le tour à la date convenue, dans l\'ordre du calendrier validé.'}
            {form.type === 'Enchère' && 'Le tour est attribué au membre qui propose la meilleure enchère (remise) sur la mise commune.'}
          </p>
        </Card>

        <Card title="Règles financières (UC7)" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Cotisation (XAF)"><Input type="number" value={form.montantCotisation} onChange={e => setForm(f => ({ ...f, montantCotisation: +e.target.value }))} /></Field>
            <Field label="Fréquence"><Select value={form.frequence} onChange={e => setForm(f => ({ ...f, frequence: e.target.value }))} options={['Hebdomadaire', 'Mensuelle', 'Trimestrielle']} /></Field>
            <Field label="Pénalité de retard"><Input type="number" value={form.penaliteRetard} onChange={e => setForm(f => ({ ...f, penaliteRetard: +e.target.value }))} /></Field>
            <Field label="Taux de prêt (%)"><Input type="number" value={form.tauxPret} onChange={e => setForm(f => ({ ...f, tauxPret: +e.target.value }))} /></Field>
            <Field label="Montant du tour (XAF)"><Input type="number" value={form.tauxEnchereMin} onChange={e => setForm(f => ({ ...f, tauxEnchereMin: +e.target.value }))} /></Field>
            <Field label="Banque du club (UC13)" className="sm:col-span-2 xl:col-span-3"><Input value={form.banque} onChange={e => setForm(f => ({ ...f, banque: e.target.value }))} /></Field>
          </div>
          <div className="mt-4"><Button variant="gold" onClick={save} icon="💾">Enregistrer les paramètres</Button></div>
        </Card>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirmer l'action" subtitle="Cette action est visible par tout le bureau."
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button><Button variant={confirm === 'Clôturée' ? 'danger' : 'primary'} onClick={() => setStatut(confirm)}>Confirmer</Button></>}>
        <p className="text-sm text-ink/70">{confirm === 'Clôturée' ? 'La clôture arrête définitivement les cotisations et décaissements du cycle en cours.' : confirm === 'Pause' ? 'La pause suspend temporairement cotisations et décaissements.' : 'La relance réactive toutes les opérations de la tontine.'}</p>
      </Modal>
    </div>
  )
}

/* ============================ ORDRE DE PASSAGE (UC10) ============================ */
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
  return (
    <div>
      <PageHeader title="Calendrier de passage" sub="Approuvez et ajustez l'ordre des bénéficiaires du cycle (UC10 · UC39)."
        actions={<Button variant="gold" icon="✅" onClick={() => toast('Calendrier de passage validé et notifié aux membres')}>Valider le calendrier</Button>} />
      <Card pad={false}>
        <div className="p-3">
          {db.ordrePassage.map((id, i) => {
            const m = byId(db.membres, id)
            const déjà = i < 3
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-50/60">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-semibold ${déjà ? 'bg-brand-100 text-brand-700' : 'bg-brand-950 text-gold-300'}`}>{i + 1}</span>
                <Avatar name={m.nom} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.nom}</p>
                  <p className="text-xs text-ink/50">{BUREAU_LABELS[m.role]}</p>
                </div>
                {déjà ? <Badge tone="green">Tour servi</Badge> : i === 3 ? <Badge tone="blue" dot>Tour en cours</Badge> : <Badge tone="gray">Prévu</Badge>}
                <div className="ml-2 flex gap-1">
                  <button onClick={() => move(id, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg bg-black/5 text-xs transition hover:bg-brand-100 disabled:opacity-30 cursor-pointer">▲</button>
                  <button onClick={() => move(id, 1)} disabled={i === db.ordrePassage.length - 1} className="grid h-8 w-8 place-items-center rounded-lg bg-black/5 text-xs transition hover:bg-brand-100 disabled:opacity-30 cursor-pointer">▼</button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/* ============================ MEMBRES (UC9) ============================ */
export function MembresPage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('liste')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nom: '', tel: '', email: '', profession: '' })
  const [importOpen, setImportOpen] = useState(false)
  const [bulk, setBulk] = useState('')

  const add = () => {
    if (!form.nom || !form.tel) return toast('Nom et téléphone obligatoires', 'error')
    const m = { id: uid('m'), ...form, role: 'Membre', statut: 'En attente', motDePasse: 'demo1234', twoFA: false, dateAdhesion: today(), photo: null }
    setDb(d => ({ ...d, membres: [...d.membres, m], ordrePassage: [...d.ordrePassage, m.id], notifications: [...d.notifications, { id: uid('nt'), pour: m.id, titre: 'Bienvenue au club 🎉', message: `Votre compte ${d.tontine.nom} a été créé. Il sera actif après validation du bureau.`, lu: false, date: now() }] }))
    setOpen(false); setForm({ nom: '', tel: '', email: '', profession: '' })
    toast(`Membre « ${form.nom} » enregistré (statut : en attente d'activation)`)
  }
  const importBulk = () => {
    const lignes = bulk.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [nom, tel] = l.split(/[;,\t]/); return { nom: nom?.trim(), tel: tel?.trim() } }).filter(x => x.nom && x.tel)
    if (!lignes.length) return toast('Format attendu : une ligne par membre — « Nom ; Téléphone »', 'error')
    const nouveaux = lignes.map(x => ({ id: uid('m'), nom: x.nom, tel: x.tel, email: '', profession: '', role: 'Membre', statut: 'En attente', motDePasse: 'demo1234', twoFA: false, dateAdhesion: today(), photo: null }))
    setDb(d => ({ ...d, membres: [...d.membres, ...nouveaux], ordrePassage: [...d.ordrePassage, ...nouveaux.map(n => n.id)] }))
    setImportOpen(false); setBulk(''); toast(`${nouveaux.length} membre(s) importé(s)`)
  }
  const activer = (m) => { setDb(d => ({ ...d, membres: d.membres.map(x => x.id === m.id ? { ...x, statut: 'Actif' } : x) })); toast(`${m.nom} est maintenant actif ✅`) }
  const suspendre = (m) => { setDb(d => ({ ...d, membres: d.membres.map(x => x.id === m.id ? { ...x, statut: x.statut === 'Suspendu' ? 'Actif' : 'Suspendu' } : x) })); toast(`Statut de ${m.nom} modifié`, 'info') }

  const rows = db.membres.filter(m => tab === 'liste' ? true : tab === 'attente' ? m.statut === 'En attente' : m.statut !== 'Actif')
  return (
    <div>
      <PageHeader title="Gestion des membres" sub="Créez, importez (CSV) et activez les membres du club (UC9)."
        actions={<><Button variant="outline" icon="📄" onClick={() => setImportOpen(true)}>Importer CSV</Button><Button icon="＋" onClick={() => setOpen(true)}>Nouveau membre</Button></>} />
      <div className="mb-4"><Tabs active={tab} onChange={setTab} tabs={[{ id: 'liste', label: `Tous (${db.membres.length})` }, { id: 'attente', label: `En attente (${db.membres.filter(m => m.statut === 'En attente').length})` }, { id: 'inactifs', label: 'Inactifs / Suspendus' }]} /></div>
      <Card pad={false}>
        <div className="p-3">
          {rows.length === 0 && <EmptyState title="Aucun membre dans cette vue" />}
          {rows.map(m => {
            const cotis = db.cotisations.filter(c => c.membreId === m.id && c.statut === 'Validée')
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
          <Field label="Nom complet"><Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Atangana Mve Barbara" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone"><Input value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="+237 6 …" /></Field>
            <Field label="Profession"><Input value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} /></Field>
          </div>
          <Field label="E-mail (optionnel)"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importer des membres (CSV)" subtitle="Une ligne par membre : Nom ; Téléphone" footer={<><Button variant="ghost" onClick={() => setImportOpen(false)}>Annuler</Button><Button onClick={importBulk}>Importer</Button></>}>
        <Textarea value={bulk} onChange={e => setBulk(e.target.value)} className="min-h-40 font-mono text-xs" placeholder={'Atangana Mve Barbara ; +237 6 55 00 11 22\nMvondo Éric ; +237 6 90 22 33 44'} />
      </Modal>
    </div>
  )
}

/* ============================ BUREAU (UC8) ============================ */
export function BureauPage() {
  const { db, setDb, toast } = useStore()
  const [edit, setEdit] = useState(null)
  const posts = ['President', 'Tresorier', 'Secretaire', 'Commissaire']
  const nominate = (membreId, poste) => {
    if (!membreId) return
    setDb(d => {
      let membres = d.membres.map(m => m.role === poste ? { ...m, role: 'Membre' } : m)
      membres = membres.map(m => m.id === membreId ? { ...m, role: poste } : m)
      return { ...d, membres }
    })
    setEdit(null)
    toast(`${db.membres.find(m => m.id === membreId).nom} nommé(e) ${BUREAU_LABELS[poste]} 👑`)
  }
  const revoke = (poste) => {
    setDb(d => ({ ...d, membres: d.membres.map(m => m.role === poste ? { ...m, role: 'Membre' } : m) }))
    toast(`Le poste de ${BUREAU_LABELS[poste]} est vacant`, 'info')
  }
  const titulaires = Object.fromEntries(posts.map(p => [p, db.membres.find(m => m.role === p)]))
  return (
    <div>
      <PageHeader title="Bureau exécutif" sub="Nommez ou révoquez les membres du bureau (UC8)." />
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
              <span className="text-gold-600">→</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

/* ============================ SANCTIONS (UC12) ============================ */
export function SanctionsPage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ membreId: '', type: 'Amende', motif: '' })
  const add = () => {
    if (!form.membreId || !form.motif) return toast('Membre et motif obligatoires', 'error')
    setDb(d => ({ ...d, sanctions: [{ id: uid('sa'), date: today(), ...form }, ...d.sanctions] }))
    setOpen(false); setForm({ membreId: '', type: 'Amende', motif: '' })
    toast('Sanction enregistrée et notifiée au membre', 'info')
  }
  const exclure = (m) => {
    setDb(d => ({ ...d, membres: d.membres.map(x => x.id === m.id ? { ...x, statut: 'Exclu' } : x) }))
    toast(`${m.nom} a été exclu(e) de la tontine`, 'error')
  }
  return (
    <div>
      <PageHeader title="Sanctions & exclusions" sub="Avertissements, amendes et exclusions — les pénalités de retard sont gérées par le trésorier (UC12 · UC21)."
        actions={<Button icon="＋" onClick={() => setOpen(true)}>Nouvelle sanction</Button>} />
      <div className="grid gap-5 lg:grid-cols-2 stagger">
        <Card title="Historique des sanctions" pad={false}>
          <div className="p-3">
            {db.sanctions.length === 0 && <EmptyState icon="🕊️" title="Aucune sanction" />}
            {db.sanctions.slice().reverse().map(s => (
              <RowItem key={s.id} icon={s.type === 'Exclusion' ? '🚫' : s.type === 'Amende' ? '⚖️' : '📢'} title={byId(db.membres, s.membreId)?.nom || '—'}
                sub={`${s.type} · ${s.motif} · ${fmtDate(s.date)}`} right={<Badge tone={s.type === 'Exclusion' ? 'red' : s.type === 'Amende' ? 'amber' : 'blue'}>{s.type}</Badge>} />
            ))}
          </div>
        </Card>
        <Card title="Membres à risque" subtitle="Suspendus, exclus ou avec pénalités impayées" pad={false}>
          <div className="p-3">
            {db.membres.filter(m => m.statut !== 'Actif' && m.statut !== 'En attente').map(m => (
              <RowItem key={m.id} icon="👤" title={m.nom} sub={`Statut : ${m.statut}`} right={m.statut !== 'Exclu' && <Button size="sm" variant="danger" onClick={() => exclure(m)}>Exclure</Button>} />
            ))}
            {db.penalites.filter(p => !p.payee).map(p => (
              <RowItem key={p.id} icon="💸" title={`${byId(db.membres, p.membreId)?.nom} — pénalité impayée`} sub={`${p.motif} · ${fmtXAF(p.montant)}`} right={<Badge tone="amber">{fmtXAF(p.montant)}</Badge>} />
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

/* ============================ RAPPORTS À VALIDER (UC45) ============================ */
export function RapportsPage() {
  const { db, setDb, toast } = useStore()
  const decide = (r, ok) => {
    setDb(d => ({ ...d, rapports: d.rapports.map(x => x.id === r.id ? { ...x, statut: ok ? 'Validé' : 'Rejeté' } : x) }))
    toast(ok ? `Rapport ${r.periode} validé ✅` : `Rapport ${r.periode} rejeté — retourné au trésorier`, ok ? 'success' : 'error')
  }
  return (
    <div>
      <PageHeader title="Rapports financiers" sub="Validez ou rejetez les rapports soumis par le trésorier (UC45)." />
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
                  <Button onClick={() => decide(r, true)} icon="✅">Valider</Button>
                </div>
              ) : <Badge tone={statusTone(r.statut)}>Décision rendue</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ============================ ALERTES FRAUDE (UC47) ============================ */
export function AlertesPage() {
  const { db, setDb, toast } = useStore()
  const traiter = (a) => { setDb(d => ({ ...d, alertes: d.alertes.map(x => x.id === a.id ? { ...x, statut: 'Traitée' } : x) })); toast('Alerte marquée comme traitée') }
  const ouvertes = db.alertes.filter(a => a.statut === 'Nouvelle')
  return (
    <div>
      <PageHeader title="Alertes & anomalies" sub="Signalements du commissaire aux comptes (UC47)." actions={<Badge tone={ouvertes.length ? 'red' : 'green'} dot={!!ouvertes.length}>{ouvertes.length} en attente</Badge>} />
      <div className="space-y-4 stagger">
        {db.alertes.length === 0 && <EmptyState icon="🛡️" title="Aucune alerte reçue" sub="Le commissaire n'a signalé aucune anomalie." />}
        {db.alertes.slice().reverse().map(a => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${a.type === 'Fraude' ? 'bg-red-100' : 'bg-amber-100'}`}>{a.type === 'Fraude' ? '🚨' : '⚠️'}</span>
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

/* ============================ NOTIFICATIONS DE MASSE (UC61) ============================ */
export function DiffusionPage() {
  const { db, setDb, toast } = useStore()
  const [form, setForm] = useState({ message: '', canal: 'WhatsApp', cible: 'Tous les membres' })
  const envoyer = () => {
    if (form.message.trim().length < 5) return toast('Le message est trop court', 'error')
    setDb(d => ({ ...d, notifsMasse: [{ id: uid('nm'), date: today(), ...form }, ...d.notifsMasse], notifications: [...d.notifications, ...db.membres.filter(m => m.statut === 'Actif').map(m => ({ id: uid('nt'), pour: m.id, titre: 'Message du bureau', message: form.message, lu: false, date: now() }))] }))
    setForm(f => ({ ...f, message: '' }))
    toast(`Message diffusé à ${db.membres.filter(m => m.statut === 'Actif').length} membres via ${form.canal} 📣`)
  }
  return (
    <div>
      <PageHeader title="Notification de masse" sub="Diffusez un message à tous les membres par WhatsApp, SMS ou notification push (UC61)." />
      <div className="grid gap-5 lg:grid-cols-5 stagger">
        <Card title="Composer" className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="Cible"><Select value={form.cible} onChange={e => setForm(f => ({ ...f, cible: e.target.value }))} options={['Tous les membres', 'Membres en retard', 'Bureau uniquement']} /></Field>
            <Field label="Canal d'envoi"><Select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))} options={['WhatsApp', 'SMS', 'Push in-app']} /></Field>
            <Field label="Message" hint={`${form.message.length}/500 caractères`}><Textarea maxLength={500} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Ex : Rappel — la cotisation d'octobre doit être réglée avant le 5…" /></Field>
            <Button variant="gold" className="w-full" onClick={envoyer} icon="📣">Diffuser maintenant</Button>
          </div>
        </Card>
        <Card title="Historique des diffusions" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {db.notifsMasse.length === 0 && <EmptyState icon="📣" title="Aucune diffusion" />}
            {db.notifsMasse.map(n => (
              <RowItem key={n.id} icon={n.canal === 'WhatsApp' ? '💬' : n.canal === 'SMS' ? '✉️' : '🔔'} title={n.message} sub={`${n.canal} · ${n.cible} · ${fmtDate(n.date)}`} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
