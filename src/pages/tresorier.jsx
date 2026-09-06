import { useState } from 'react'
import { useStore, useAuth } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Table, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem, Progress } from '../components/ui'
import { Donut, Bars, Legend } from '../components/charts'
import { fmtXAF, fmtDate, fmtNum, today, now, uid, sum, byId, pct, monthKey, monthLabel, cls } from '../lib/utils'

/* Helpers partagés du module trésorier */
const COMPTE_OF = { 'Espèces': 'Caisse', 'Orange Money': 'OM', 'MTN MoMo': 'MoMo', 'Carte': 'Banque' }
const CAISSE_COLORS = [
  { label: 'Banque', color: '#0a573d' },
  { label: 'Caisse', color: '#17855a' },
  { label: 'Orange Money', color: '#e7b233' },
  { label: 'MTN MoMo', color: '#3aa274' },
]
const lastMonths = (n = 6) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - (n - 1 - i)); return d.toISOString().slice(0, 7)
})

function notify(d, membreId, titre, message) {
  return [...d.notifications, { id: uid('nt'), pour: membreId, titre, message, lu: false, date: now() }]
}
function validePaiement(d, cot) {
  return {
    ...d,
    cotisations: d.cotisations.map(c => c.id === cot.id ? { ...c, statut: 'Validée' } : c),
    mouvements: [...d.mouvements, {
      id: uid('mv'), type: 'Cotisation', sens: 'in', compte: COMPTE_OF[cot.methode] || 'Caisse',
      montant: cot.montant, devise: cot.devise || 'XAF', date: today(),
      note: `Cotisation ${cot.periode} — ${cot.ref}`, membreId: cot.membreId,
    }],
    notifications: notify(d, cot.membreId, 'Cotisation validée ✅', `Votre paiement de ${fmtXAF(cot.montant)} (${cot.periode}) a été validé par le trésorier.`),
  }
}

/* ============================ TABLEAU DE BORD TRÉSORIER ============================ */
export function TresorierHome() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const t = db.tontine
  const validées = db.cotisations.filter(c => c.statut === 'Validée')
  const attendes = db.cotisations.filter(c => c.statut === 'En attente')
  const totalCaisse = sum(Object.values(db.caisse.XAF)) + sum(Object.values(db.caisse.EUR)) * 650
  const mois = monthKey()
  const cotisMois = sum(validées.filter(c => monthKey(c.date) === mois), c => c.montant)
  const pretsEnCours = db.prets.filter(p => p.statut === 'En cours')
  const totalPrets = sum(pretsEnCours, p => p.montant)
  const caisseData = CAISSE_COLORS.map(c => ({ ...c, value: db.caisse.XAF[c.label === 'Banque' ? 'Banque' : c.label === 'Caisse' ? 'Caisse' : c.label === 'Orange Money' ? 'OM' : 'MoMo'] }))
  const bars = lastMonths(6).map(k => ({ label: monthLabel(k).split(' ')[0].slice(0, 4), value: sum(validées.filter(c => monthKey(c.date) === k), c => c.montant) }))
  const valider = (cot) => { setDb(d => validePaiement(d, cot)); toast(`Paiement de ${byId(db.membres, cot.membreId)?.nom || '—'} validé (${fmtXAF(cot.montant)})`) }
  const rejeter = (cot) => {
    setDb(d => ({ ...d, cotisations: d.cotisations.map(c => c.id === cot.id ? { ...c, statut: 'Rejetée' } : c), notifications: notify(d, cot.membreId, 'Paiement rejeté ❌', `Votre paiement de ${fmtXAF(cot.montant)} (${cot.periode}) a été rejeté par le trésorier.`) }))
    toast(`Paiement de ${byId(db.membres, cot.membreId)?.nom || '—'} rejeté`, 'error')
  }
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-brand-950 p-6 text-white sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#032018,#063626_50%,#0a573d)] bg-[length:200%_200%] animate-gradient" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl animate-float" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-300">Espace Trésorier · {t.nom}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Bonjour {user?.nom?.split(' ')[0] || 'Trésorier'}, la <span className="gold-text">caisse est saine</span>.</h1>
          <p className="mt-2 max-w-xl text-sm text-brand-100/70">Cotisation : {fmtXAF(t.montantCotisation)} {t.frequence.toLowerCase()} · Banque : {t.banque} · {attendes.length} paiement(s) à valider</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Trésor total" value={fmtXAF(totalCaisse)} sub="Caisse + banque + mobile money" icon="🏦" tone="brand" />
        <Stat label="Cotisations du mois" value={fmtXAF(cotisMois)} sub={`${validées.filter(c => monthKey(c.date) === mois).length} paiements validés`} icon="📥" tone="gold" />
        <Stat label="Paiements en attente" value={fmtNum(attendes.length)} sub="OM / MoMo / Carte à confirmer" icon="⏳" tone="violet" />
        <Stat label="Prêts en cours" value={fmtXAF(totalPrets)} sub={`${pretsEnCours.length} prêt(s) à recouvrer`} icon="🤝" tone="blue" />
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
          {attendes.length === 0 && <EmptyState icon="✅" title="Aucun paiement en attente" sub="Tous les encaissements ont été traités." />}
          {attendes.slice().reverse().map(c => {
            const m = byId(db.membres, c.membreId)
            return (
              <RowItem key={c.id} icon={c.methode === 'Orange Money' ? '🟠' : c.methode === 'MTN MoMo' ? '🟡' : '💳'}
                title={`${m?.nom || '—'} — ${fmtXAF(c.montant)}`}
                sub={`${c.methode} · période ${c.periode} · réf. ${c.ref} · ${fmtDate(c.date)}`}
                right={<div className="flex gap-1.5">
                  <Button size="sm" onClick={() => valider(c)} icon="✓">Valider</Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => rejeter(c)}>Rejeter</Button>
                </div>} />
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/* ============================ COTISATIONS (UC14 · UC15) ============================ */
export function CotisationsPage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ membreId: '', montant: db.tontine.montantCotisation, periode: monthKey(), date: today() })
  const attendes = db.cotisations.filter(c => c.statut === 'En attente')
  const recents = db.cotisations.slice().reverse().slice(0, 12)
  const membres = Object.fromEntries(db.membres.map(m => [m.id, m]))

  const encaisser = () => {
    if (!form.membreId || !form.montant) return toast('Membre et montant obligatoires', 'error')
    const m = membres[form.membreId]
    const cot = { id: uid('cot'), membreId: form.membreId, montant: +form.montant, devise: 'XAF', date: form.date || today(), periode: form.periode || monthKey(), methode: 'Espèces', ref: uid('TG'), statut: 'Validée' }
    setDb(d => ({
      ...d,
      cotisations: [...d.cotisations, cot],
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Cotisation', sens: 'in', compte: 'Caisse', montant: cot.montant, devise: 'XAF', date: cot.date, note: `Cotisation ${cot.periode} (espèces)`, membreId: cot.membreId }],
      notifications: notify(d, cot.membreId, 'Cotisation reçue ✅', `Votre cotisation de ${fmtXAF(cot.montant)} pour ${cot.periode} a été encaissée en espèces.`),
    }))
    setOpen(false); setForm(f => ({ ...f, membreId: '', montant: db.tontine.montantCotisation }))
    toast(`Cotisation de ${m?.nom || '—'} encaissée : ${fmtXAF(cot.montant)}`)
  }
  const valider = (cot) => { setDb(d => validePaiement(d, cot)); toast(`Paiement ${cot.ref} validé (${fmtXAF(cot.montant)})`) }
  const rejeter = (cot) => {
    setDb(d => ({ ...d, cotisations: d.cotisations.map(c => c.id === cot.id ? { ...c, statut: 'Rejetée' } : c), notifications: notify(d, cot.membreId, 'Paiement rejeté ❌', `Votre paiement de ${fmtXAF(cot.montant)} (${cot.periode}) a été rejeté.`) }))
    toast(`Paiement ${cot.ref} rejeté`, 'error')
  }
  const methodesIcon = { 'Espèces': '💵', 'Orange Money': '🟠', 'MTN MoMo': '🟡', 'Carte': '💳' }
  return (
    <div className="space-y-6">
      <PageHeader title="Cotisations" sub="Encaissement manuel en espèces et validation des paiements mobiles (UC14 · UC15)."
        actions={<Button icon="＋" onClick={() => setOpen(true)}>Encaisser en espèces</Button>} />

      <Card title={`Paiements en attente (${attendes.length})`} subtitle="À valider après vérification du reçu mobile" pad={false}>
        <Table empty="Aucun paiement en attente — tout est à jour ✅" rows={attendes} columns={[
          { key: 'membre', label: 'Membre', render: r => <span className="flex items-center gap-2"><Avatar name={membres[r.membreId]?.nom || '?'} size="sm" /><span className="font-semibold">{membres[r.membreId]?.nom || '—'}</span></span> },
          { key: 'montant', label: 'Montant', render: r => <span className="font-bold">{fmtXAF(r.montant)}</span> },
          { key: 'methode', label: 'Méthode', render: r => <Badge tone="blue">{methodesIcon[r.methode]} {r.methode}</Badge> },
          { key: 'periode', label: 'Période' },
          { key: 'ref', label: 'Référence', render: r => <span className="font-mono text-xs text-ink/50">{r.ref}</span> },
          { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
          { key: 'actions', label: 'Actions', render: r => <div className="flex gap-1.5"><Button size="sm" onClick={() => valider(r)}>Valider</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => rejeter(r)}>Rejeter</Button></div> },
        ]} />
      </Card>

      <Card title="Cotisations récentes" subtitle="Historique des encaissements" pad={false}>
        <Table empty="Aucune cotisation enregistrée" rows={recents} columns={[
          { key: 'membre', label: 'Membre', render: r => membres[r.membreId]?.nom || '—' },
          { key: 'montant', label: 'Montant', render: r => <span className="font-bold">{fmtXAF(r.montant)}</span> },
          { key: 'methode', label: 'Méthode', render: r => <Badge tone="blue">{methodesIcon[r.methode]} {r.methode}</Badge> },
          { key: 'periode', label: 'Période' },
          { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
          { key: 'statut', label: 'Statut', render: r => <Badge tone={statusTone(r.statut)}>{r.statut}</Badge> },
        ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Encaisser une cotisation (espèces)" subtitle="UC14 — le paiement est enregistré comme validé"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="gold" onClick={encaisser} icon="💰">Encaisser</Button></>}>
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

/* ============================ CAISSE MULTI-DEVISES (UC17) ============================ */
export function CaissePage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ devise: 'XAF', from: 'Caisse', to: 'Banque', montant: '', note: '' })
  const comptesXAF = [['Caisse', '💵'], ['Banque', '🏦'], ['OM', '🟠'], ['MoMo', '🟡']]
  const comptesEUR = [['Caisse', '💵'], ['Banque', '🏦']]
  const mouvements = db.mouvements.slice().reverse().slice(0, 15)
  const MEMBRES = Object.fromEntries(db.membres.map(m => [m.id, m.nom]))

  const transfertsDispo = (devise) => devise === 'XAF' ? comptesXAF.map(c => c[0]) : comptesEUR.map(c => c[0])
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
    toast(`Transfert de ${fmtXAF(montant, form.devise)} : ${form.from} → ${form.to} effectué`)
    setForm(f => ({ ...f, montant: '', note: '' }))
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Caisse multi-comptes" sub="Soldes par compte et par devise, virements internes et journal des mouvements (UC17)."
        actions={<Button variant="gold" icon="🔁" onClick={() => setOpen(true)}>Virement interne</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        {comptesXAF.map(([cpte, icon]) => (
          <Stat key={cpte} label={cpte === 'OM' ? 'Orange Money' : cpte === 'MoMo' ? 'MTN MoMo' : cpte} value={fmtXAF(db.caisse.XAF[cpte])} sub="Devise : XAF" icon={icon} tone={cpte === 'Banque' ? 'brand' : cpte === 'Caisse' ? 'gold' : 'violet'} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 stagger">
        {comptesEUR.map(([cpte, icon]) => (
          <Stat key={cpte} label={`${cpte} (EUR)`} value={fmtXAF(db.caisse.EUR[cpte], 'EUR')} sub="Devise : Euro" icon={icon} tone="blue" />
        ))}
      </div>

      <Card title="Mouvements récents" subtitle="Journal de caisse — entrées et sorties" pad={false}>
        <Table empty="Aucun mouvement enregistré" rows={mouvements} columns={[
          { key: 'sens', label: '', render: r => <span className={cls('font-bold', r.sens === 'in' ? 'text-brand-600' : 'text-red-600')}>{r.sens === 'in' ? '▲' : '▼'}</span> },
          { key: 'type', label: 'Type', render: r => <span className="font-semibold">{r.type}</span> },
          { key: 'note', label: 'Détail', render: r => <span className="text-ink/60">{r.note}{r.membreId && MEMBRES[r.membreId] ? ` · ${MEMBRES[r.membreId]}` : ''}</span> },
          { key: 'compte', label: 'Compte', render: r => <Badge tone="gray">{r.compte}</Badge> },
          { key: 'montant', label: 'Montant', render: r => <span className={cls('font-bold', r.sens === 'in' ? 'text-brand-700' : 'text-red-600')}>{r.sens === 'in' ? '+' : '−'}{fmtXAF(r.montant, r.devise || 'XAF')}</span> },
          { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
        ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Virement interne" subtitle="UC17 — déplacer des fonds entre comptes du club"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={transferer} icon="🔁">Effectuer le virement</Button></>}>
        <div className="space-y-4">
          <Field label="Devise"><Select value={form.devise} onChange={e => setForm(f => ({ ...f, devise: e.target.value, from: 'Caisse', to: e.target.value === 'XAF' ? 'Banque' : 'Banque' }))} options={['XAF', 'EUR']} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Depuis"><Select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} options={transfertsDispo(form.devise)} /></Field>
            <Field label="Vers"><Select value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} options={transfertsDispo(form.devise)} /></Field>
          </div>
          <Field label="Montant" hint={`Disponible sur ${form.from} : ${fmtXAF(db.caisse[form.devise][form.from] || 0, form.devise)}`}>
            <Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Note (optionnel)"><Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : sécurité de la caisse" /></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ BANQUE (UC18 · UC19 · UC20 · UC34) ============================ */
export function BanqueOpsPage() {
  const { db, setDb, toast } = useStore()
  const [opForm, setOpForm] = useState({ montant: '', note: '' })
  const [bordereau, setBordereau] = useState(null)
  const [rel, setRel] = useState('')
  const banque = db.caisse.XAF.Banque
  const caisse = db.caisse.XAF.Caisse
  const ecart = rel === '' ? null : (+rel || 0) - banque

  const op = (kind) => {
    const montant = +opForm.montant
    if (!montant || montant <= 0) return toast('Montant invalide', 'error')
    if (kind === 'versement' && caisse < montant) return toast('Espèces insuffisantes en caisse', 'error')
    if (kind === 'retrait' && banque < montant) return toast('Solde bancaire insuffisant', 'error')
    const label = kind === 'versement' ? 'Versement bancaire' : 'Retrait bancaire'
    const note = opForm.note || (kind === 'versement' ? 'Dépôt en banque' : 'Retrait vers la caisse')
    setDb(d => ({
      ...d,
      caisse: { ...d.caisse, XAF: kind === 'versement' ? { ...d.caisse.XAF, Caisse: caisse - montant, Banque: banque + montant } : { ...d.caisse.XAF, Caisse: caisse + montant, Banque: banque - montant } },
      mouvements: [...d.mouvements,
        { id: uid('mv'), type: label, sens: 'out', compte: kind === 'versement' ? 'Caisse' : 'Banque', montant, devise: 'XAF', date: today(), note },
        { id: uid('mv'), type: label, sens: 'in', compte: kind === 'versement' ? 'Banque' : 'Caisse', montant, devise: 'XAF', date: today(), note },
      ],
    }))
    setBordereau({ kind, montant, note, date: today() })
    setOpForm({ montant: '', note: '' })
    toast(`${label} de ${fmtXAF(montant)} enregistré — bordereau généré 🧾`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Opérations bancaires" sub="Versements, retraits, rapprochement bancaire et bordereaux (UC18 · UC19 · UC20 · UC34)." />

      <div className="grid gap-5 lg:grid-cols-2 stagger">
        <Card title="Versement bancaire" subtitle="UC18 — déposer les espèces à la banque">
          <div className="space-y-4">
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">Caisse espèces : <b>{fmtXAF(caisse)}</b> → Compte <b>{db.tontine.banque}</b></p>
            <Field label="Montant (XAF)"><Input type="number" value={opForm.montant} onChange={e => setOpForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" /></Field>
            <Field label="Note"><Input value={opForm.note} onChange={e => setOpForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : sécurité de la caisse" /></Field>
            <Button variant="gold" className="w-full" icon="🏦" onClick={() => op('versement')}>Effectuer le versement</Button>
          </div>
        </Card>
        <Card title="Retrait bancaire" subtitle="UC19 — retirer des fonds vers la caisse">
          <div className="space-y-4">
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">Solde bancaire : <b>{fmtXAF(banque)}</b></p>
            <Field label="Montant (XAF)"><Input type="number" value={opForm.montant} onChange={e => setOpForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" /></Field>
            <Field label="Note"><Input value={opForm.note} onChange={e => setOpForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : paiement des aides du mois" /></Field>
            <Button className="w-full" icon="🏧" onClick={() => op('retrait')}>Effectuer le retrait</Button>
          </div>
        </Card>
      </div>

      <Card title="Rapprochement bancaire" subtitle="UC20 — comparer le relevé bancaire au solde du club">
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
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">⚠ Vérifiez les derniers versements/retraits, les frais bancaires ou les paiements non encore crédités.</p>
        )}
      </Card>

      <Modal open={!!bordereau} onClose={() => setBordereau(null)} title="Bordereau d'opération bancaire" subtitle="UC34 — document à signer et archiver" wide
        footer={<><Button variant="ghost" onClick={() => setBordereau(null)}>Fermer</Button><Button variant="gold" icon="🖨" onClick={() => window.print()}>Imprimer</Button></>}>
        {bordereau && (
          <div className="print-area rounded-2xl border border-black/10 p-6">
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

/* ============================ PÉNALITÉS (UC21) ============================ */
export function PenalitesPage() {
  const { db, setDb, toast } = useStore()
  const [confirm, setConfirm] = useState(false)
  const mois = monthKey()
  const impayees = db.penalites.filter(p => !p.payee)
  const retardataires = db.membres.filter(m => m.statut === 'Actif' && !db.cotisations.some(c => c.membreId === m.id && c.statut === 'Validée' && monthKey(c.date) === mois))

  const genererAuto = () => {
    const cibles = retardataires.filter(m => !db.penalites.some(p => p.membreId === m.id && monthKey(p.date) === mois))
    if (!cibles.length) { setConfirm(false); return toast('Aucune nouvelle pénalité à générer — tout le monde est à jour ✅', 'info') }
    setDb(d => ({
      ...d,
      penalites: [...d.penalites, ...cibles.map(m => ({ id: uid('pen'), membreId: m.id, montant: d.tontine.penaliteRetard, motif: `Retard de cotisation (${monthLabel(mois)})`, date: today(), payee: false }))],
      notifications: cibles.reduce((acc, m) => notify(acc, m.id, 'Pénalité de retard ⚠️', `Aucune cotisation validée pour ${monthLabel(mois)} — pénalité de ${fmtXAF(d.tontine.penaliteRetard)} appliquée.`), d.notifications),
    }))
    setConfirm(false)
    toast(`${cibles.length} pénalité(s) de ${fmtXAF(db.tontine.penaliteRetard)} générée(s) pour le mois de ${monthLabel(mois)}`, 'info')
  }
  const marquerPayee = (p) => {
    setDb(d => ({
      ...d,
      penalites: d.penalites.map(x => x.id === p.id ? { ...x, payee: true } : x),
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Penalite', sens: 'in', compte: 'Caisse', montant: p.montant, devise: 'XAF', date: today(), note: `Pénalité payée — ${p.motif}`, membreId: p.membreId }],
      notifications: notify(d, p.membreId, 'Pénalité réglée ✅', `Votre pénalité de ${fmtXAF(p.montant)} a été encaissée. Merci.`),
    }))
    toast(`Pénalité de ${byId(db.membres, p.membreId)?.nom || '—'} marquée payée (${fmtXAF(p.montant)})`)
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Pénalités de retard" sub="Application automatique et suivi des règlements (UC21)."
        actions={<Button variant="gold" icon="⚡" onClick={() => setConfirm(true)}>Pénalités automatiques</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Pénalités impayées" value={fmtXAF(sum(impayees, p => p.montant))} sub={`${impayees.length} pénalité(s)`} icon="⚠️" tone="red" />
        <Stat label="Retardataires du mois" value={fmtNum(retardataires.length)} sub={`Aucune cotisation validée en ${monthLabel(mois)}`} icon="⏰" tone="amber" />
        <Stat label="Barème appliqué" value={fmtXAF(db.tontine.penaliteRetard)} sub="Par mois de retard" icon="📋" tone="brand" />
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
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Annuler</Button><Button variant="danger" onClick={genererAuto} icon="⚡">Générer</Button></>}>
        <p className="text-sm text-ink/70">
          {retardataires.length === 0
            ? `Tous les membres actifs ont une cotisation validée pour ${monthLabel(mois)}. Aucune pénalité ne sera créée.`
            : `${retardataires.length} membre(s) n'ont aucune cotisation validée pour ${monthLabel(mois)} : une pénalité de ${fmtXAF(db.tontine.penaliteRetard)} sera appliquée à ${retardataires.map(m => m.nom.split(' ')[0]).join(', ')}.`}
        </p>
      </Modal>
    </div>
  )
}

/* ============================ ÉPARGNE (UC22 · UC23 · UC24) ============================ */
export function EpargnePage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('individuelle')
  const [versement, setVersement] = useState(null)
  const [montant, setMontant] = useState('')
  const [newGroup, setNewGroup] = useState(false)
  const [gForm, setGForm] = useState({ nom: '', objectif: 500000, membres: [] })
  const ep = Object.fromEntries(db.epargneIndividuelle.map(e => [e.membreId, e]))

  const enregistrerVersement = () => {
    const m = +montant
    if (!versement) return
    if (!m || m <= 0) return toast('Montant invalide', 'error')
    const membre = byId(db.membres, versement.membreId)
    setDb(d => ({
      ...d,
      epargneIndividuelle: d.epargneIndividuelle.map(e => e.membreId === versement.membreId
        ? { ...e, solde: e.solde + m, versements: [...e.versements, { id: uid('v'), montant: m, date: today() }] } : e),
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Epargne', sens: 'in', compte: 'Caisse', montant: m, devise: 'XAF', date: today(), note: `Versement épargne volontaire — ${membre?.nom || ''}`, membreId: versement.membreId }],
      notifications: notify(d, versement.membreId, 'Épargne crédité 🏦', `Votre versement volontaire de ${fmtXAF(m)} a été crédité sur votre épargne.`),
    }))
    setVersement(null); setMontant('')
    toast(`Versement de ${fmtXAF(m)} enregistré pour ${membre?.nom || '—'}`)
  }
  const creerGroupe = () => {
    if (!gForm.nom.trim()) return toast('Nom du groupe obligatoire', 'error')
    if (!gForm.membres.length) return toast('Sélectionnez au moins un membre', 'error')
    setDb(d => ({ ...d, groupesEpargne: [...d.groupesEpargne, { id: uid('gr'), nom: gForm.nom.trim(), membres: gForm.membres, solde: 0, objectif: +gForm.objectif || 0 }] }))
    setNewGroup(false); setGForm({ nom: '', objectif: 500000, membres: [] })
    toast('Groupe d\'épargne créé 🎉')
  }
  const versementsRecents = db.epargneIndividuelle.flatMap(e => e.versements.map(v => ({ ...v, membreId: e.membreId })))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  const totalEpargne = sum(db.epargneIndividuelle, e => e.solde)
  return (
    <div className="space-y-6">
      <PageHeader title="Épargne" sub="Épargne individuelle, groupes solidaires et versements volontaires (UC22 · UC23 · UC24)."
        actions={tab === 'groupes' && <Button icon="＋" onClick={() => setNewGroup(true)}>Nouveau groupe</Button>} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'individuelle', label: 'Individuelle' },
        { id: 'groupes', label: `Groupes (${db.groupesEpargne.length})` },
        { id: 'volontaire', label: 'Versements volontaires' },
      ]} />

      {tab === 'individuelle' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 stagger">
            <Stat label="Épargne totale" value={fmtXAF(totalEpargne)} sub={`${db.epargneIndividuelle.length} épargnant(s)`} icon="💰" tone="gold" />
            <Stat label="Part bloquée" value={fmtXAF(sum(db.epargneIndividuelle, e => e.bloquee))} sub="Non retirable avant échéance" icon="🔒" tone="brand" />
            <Stat label="Part volontaire" value={fmtXAF(sum(db.epargneIndividuelle, e => e.solde - e.bloquee))} sub="Disponible sur demande" icon="🔓" tone="violet" />
          </div>
          <Card title="Comptes d'épargne individuelle" subtitle="UC22 — chaque membre dispose d'un compte d'épargne" pad={false}>
            <Table empty="Aucun compte d'épargne" rows={db.epargneIndividuelle} keyField="membreId" columns={[
              { key: 'membre', label: 'Membre', render: e => <span className="flex items-center gap-2"><Avatar name={byId(db.membres, e.membreId)?.nom || '?'} size="sm" /><span className="font-semibold">{byId(db.membres, e.membreId)?.nom || '—'}</span></span> },
              { key: 'solde', label: 'Solde', render: e => <span className="font-bold">{fmtXAF(e.solde)}</span> },
              { key: 'bloquee', label: 'Part bloquée', render: e => fmtXAF(e.bloquee) },
              { key: 'type', label: 'Type', render: e => <Badge tone={e.type === 'Bloquée' ? 'violet' : 'green'}>{e.type}</Badge> },
              { key: 'versements', label: 'Versements', render: e => <span className="text-ink/50">{e.versements.length}</span> },
              { key: 'actions', label: 'Action', render: e => <Button size="sm" variant="outline" onClick={() => setVersement(e)}>＋ Versement</Button> },
            ]} />
          </Card>
        </div>
      )}

      {tab === 'groupes' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          {db.groupesEpargne.length === 0 && <div className="lg:col-span-2"><EmptyState icon="👥" title="Aucun groupe d'épargne" sub="Créez le premier groupe solidaire du club." action={<Button onClick={() => setNewGroup(true)}>Créer un groupe</Button>} /></div>}
          {db.groupesEpargne.map(g => (
            <Card key={g.id} title={g.nom} subtitle={`${g.membres.length} membre(s) · objectif ${fmtXAF(g.objectif)}`}>
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
        <Card title="Derniers versements volontaires" subtitle="UC24 — historique consolidé (UC24)" pad={false}>
          <Table empty="Aucun versement enregistré" rows={versementsRecents} columns={[
            { key: 'membre', label: 'Membre', render: v => <span className="flex items-center gap-2"><Avatar name={byId(db.membres, v.membreId)?.nom || '?'} size="sm" /><span className="font-semibold">{byId(db.membres, v.membreId)?.nom || '—'}</span></span> },
            { key: 'montant', label: 'Montant', render: v => <span className="font-bold">+{fmtXAF(v.montant)}</span> },
            { key: 'date', label: 'Date', render: v => fmtDate(v.date) },
            { key: 'type', label: 'Compte', render: v => <Badge tone={ep[v.membreId]?.type === 'Bloquée' ? 'violet' : 'green'}>{ep[v.membreId]?.type || 'Volontaire'}</Badge> },
          ]} />
        </Card>
      )}

      <Modal open={!!versement} onClose={() => setVersement(null)} title="Versement volontaire" subtitle={`Épargne de ${versement ? byId(db.membres, versement.membreId)?.nom : ''} — solde : ${versement ? fmtXAF(versement.solde) : ''}`}
        footer={<><Button variant="ghost" onClick={() => setVersement(null)}>Annuler</Button><Button variant="gold" onClick={enregistrerVersement} icon="💰">Enregistrer</Button></>}>
        <Field label="Montant du versement (XAF)"><Input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" /></Field>
      </Modal>

      <Modal open={newGroup} onClose={() => setNewGroup(false)} title="Nouveau groupe d'épargne" subtitle="UC23 — groupe solidaire avec objectif commun"
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
    </div>
  )
}

/* ============================ PRÊTS (UC25 · UC26) ============================ */
export function PretsPage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('demandes')
  const [remb, setRemb] = useState(null)
  const [montant, setMontant] = useState('')
  const membres = Object.fromEntries(db.membres.map(m => [m.id, m]))
  const demandes = db.prets.filter(p => p.statut === 'En attente')
  const enCours = db.prets.filter(p => p.statut === 'En cours')

  const approuver = (p) => {
    setDb(d => ({
      ...d,
      prets: d.prets.map(x => x.id === p.id ? { ...x, statut: 'En cours', reste: p.montant } : x),
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Pret', sens: 'out', compte: 'Caisse', montant: p.montant, devise: 'XAF', date: today(), note: `Prêt accordé — ${p.motif}`, membreId: p.membreId }],
      notifications: notify(d, p.membreId, 'Prêt approuvé ✅', `Votre prêt de ${fmtXAF(p.montant)} a été approuvé par le trésorier. Décaissement effectué en caisse.`),
    }))
    toast(`Prêt de ${membres[p.membreId]?.nom || '—'} approuvé : ${fmtXAF(p.montant)} décaissés`)
  }
  const refuser = (p) => {
    setDb(d => ({ ...d, prets: d.prets.map(x => x.id === p.id ? { ...x, statut: 'Rejeté' } : x), notifications: notify(d, p.membreId, 'Prêt rejeté ❌', `Votre demande de prêt de ${fmtXAF(p.montant)} a été rejetée par le trésorier.`) }))
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
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Remboursement', sens: 'in', compte: 'Caisse', montant: m, devise: 'XAF', date: today(), note: `Remboursement prêt${solde <= 0 ? ' — soldé ✅' : ` — reste ${fmtNum(solde)}`}`, membreId: remb.membreId }],
      notifications: solde <= 0 ? notify(d, remb.membreId, 'Prêt soldé 🎉', `Votre prêt de ${fmtXAF(remb.montant)} est entièrement remboursé. Félicitations !`) : [],
    }))
    setRemb(null); setMontant('')
    toast(solde <= 0 ? `Prêt de ${membres[remb.membreId]?.nom || '—'} entièrement remboursé 🎉` : `Remboursement de ${fmtXAF(m)} enregistré — reste ${fmtXAF(solde)}`)
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Prêts internes" sub="Étude des demandes, décaissements et suivi des remboursements (UC25 · UC26)."
        actions={<Badge tone="blue">Taux club : {db.tontine.tauxPret}%</Badge>} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'demandes', label: `Demandes (${demandes.length})` },
        { id: 'encours', label: `En cours (${enCours.length})` },
        { id: 'historique', label: 'Historique' },
      ]} />

      {tab === 'demandes' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          {demandes.length === 0 && <div className="lg:col-span-2"><EmptyState icon="📨" title="Aucune demande en attente" sub="Les nouvelles demandes des membres apparaîtront ici." /></div>}
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
                  <Button onClick={() => approuver(p)} icon="✅">Approuver & décaisser</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'encours' && (
        <div className="grid gap-5 lg:grid-cols-2 stagger">
          {enCours.length === 0 && <div className="lg:col-span-2"><EmptyState icon="🤝" title="Aucun prêt en cours" sub="Tous les prêts accordés ont été remboursés." /></div>}
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
        footer={<><Button variant="ghost" onClick={() => setRemb(null)}>Annuler</Button><Button variant="gold" onClick={enregistrerRemb} icon="💰">Encaisser</Button></>}>
        <Field label="Montant remboursé (XAF)" hint="Le prêt est marqué « Remboursé » lorsque le solde atteint zéro.">
          <Input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" />
        </Field>
      </Modal>
    </div>
  )
}

/* ============================ INTÉRÊTS (UC27) ============================ */
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
      return {
        ...d,
        interetsRedistribues: [...d.interetsRedistribues, { id: uid('ir'), total: dispo, date: today(), parts: d.epargneIndividuelle.map(e => ({ membreId: e.membreId, montant: Math.round((e.solde / te) * dispo) })) }],
        notifications: d.epargneIndividuelle.filter(e => e.solde > 0).map(e => ({ id: uid('nt'), pour: e.membreId, titre: 'Intérêts redistribués 🎁', message: `Votre part des intérêts de la tontine a été créditée : ${fmtXAF(Math.round((e.solde / te) * dispo))}.`, lu: false, date: now() })),
      }
    })
    toast(`${fmtXAF(disponible)} d'intérêts redistribués aux épargnants 🎁`)
  }
  const dernier = db.interetsRedistribues[db.interetsRedistribues.length - 1]
  return (
    <div className="space-y-6">
      <PageHeader title="Intérêts redistribués" sub="Répartition des intérêts de prêts au prorata de l'épargne de chaque membre (UC27)."
        actions={<Button variant="gold" icon="🎁" onClick={redistribuer} disabled={disponible <= 0}>Redistribuer aux épargnants</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Intérêts collectés" value={fmtXAF(totalInterets)} sub="Prêts entièrement remboursés" icon="📈" tone="gold" />
        <Stat label="Déjà redistribués" value={fmtXAF(dejaRedistribue)} sub={`${db.interetsRedistribues.length} redistribution(s)`} icon="🎁" tone="brand" />
        <Stat label="Disponible" value={fmtXAF(disponible)} sub={`Base de répartition : ${fmtXAF(totalEpargne)} d'épargne`} icon="⚖️" tone="violet" />
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

/* ============================ AIDES SOCIALES (UC28) ============================ */
const AIDE_ICONS = { Deces: '⚰️', Mariage: '💍', Naissance: '👶', Maladie: '🏥' }
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
      notifications: notify(d, form.membreId, 'Demande d\'aide enregistrée 🤲', `Votre demande d'aide (${form.type}) de ${fmtXAF(form.montant)} est en cours d'examen par le bureau.`),
    }))
    setOpen(false); setForm({ membreId: '', type: 'Naissance', montant: 100000, motif: '' })
    toast('Aide sociale enregistrée — en attente de validation')
  }
  const decider = (a, statut) => {
    setDb(d => ({ ...d, aides: d.aides.map(x => x.id === a.id ? { ...x, statut } : x) }))
    toast(statut === 'Rejetée' ? `Aide de ${membres[a.membreId]?.nom || '—'} rejetée` : `Aide de ${membres[a.membreId]?.nom || '—'} ${statut.toLowerCase()}`, statut === 'Rejetée' ? 'error' : 'success')
  }
  const payer = (a) => {
    setDb(d => ({
      ...d,
      aides: d.aides.map(x => x.id === a.id ? { ...x, statut: 'Payée' } : x),
      mouvements: [...d.mouvements, { id: uid('mv'), type: 'Aide sociale', sens: 'out', compte: 'Caisse', montant: a.montant, devise: 'XAF', date: today(), note: `Aide ${a.type} — ${a.motif}`, membreId: a.membreId }],
      notifications: notify(d, a.membreId, 'Aide versée 🤲', `Votre aide de ${fmtXAF(a.montant)} (${a.type}) a été versée. Bon rétablissement / félicitations !`),
    }))
    toast(`Aide de ${fmtXAF(a.montant)} versée à ${membres[a.membreId]?.nom || '—'}`)
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Aides sociales" sub="Solidarité du club : décès, mariage, naissance, maladie (UC28)."
        actions={<Button icon="＋" onClick={() => setOpen(true)}>Nouvelle aide</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Aides versées" value={fmtXAF(sum(db.aides.filter(a => a.statut === 'Payée'), a => a.montant))} sub={`${db.aides.filter(a => a.statut === 'Payée').length} aide(s)`} icon="🤲" tone="brand" />
        <Stat label="En attente" value={fmtXAF(sum(db.aides.filter(a => a.statut === 'En attente'), a => a.montant))} sub={`${db.aides.filter(a => a.statut === 'En attente').length} demande(s)`} icon="⏳" tone="amber" />
        <Stat label="Validées à payer" value={fmtXAF(sum(db.aides.filter(a => a.statut === 'Validée'), a => a.montant))} sub="Prêtes pour le décaissement" icon="💸" tone="gold" />
      </div>

      <Card title="Demandes d'aide" subtitle="Circuit : validation du bureau → paiement par le trésorier" pad={false}>
        <Table empty="Aucune demande d'aide" rows={db.aides} columns={[
          { key: 'type', label: 'Type', render: a => <Badge tone="violet">{AIDE_ICONS[a.type] || '🤲'} {a.type}</Badge> },
          { key: 'membre', label: 'Membre', render: a => <span className="flex items-center gap-2"><Avatar name={membres[a.membreId]?.nom || '?'} size="sm" /><span className="font-semibold">{membres[a.membreId]?.nom || '—'}</span></span> },
          { key: 'montant', label: 'Montant', render: a => <span className="font-bold">{fmtXAF(a.montant)}</span> },
          { key: 'motif', label: 'Motif', render: a => <span className="text-ink/60">{a.motif}</span> },
          { key: 'date', label: 'Date', render: a => fmtDate(a.date) },
          { key: 'statut', label: 'Statut', render: a => <Badge tone={statusTone(a.statut)}>{a.statut}</Badge> },
          { key: 'actions', label: 'Actions', render: a => (
            <div className="flex flex-wrap gap-1.5">
              {a.statut === 'En attente' && <><Button size="sm" onClick={() => decider(a, 'Validée')}>Valider</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => decider(a, 'Rejetée')}>Rejeter</Button></>}
              {a.statut === 'Validée' && <Button size="sm" variant="gold" onClick={() => payer(a)} icon="💸">Payer</Button>}
              {a.statut === 'Payée' && <span className="text-xs text-ink/40">Traitée</span>}
              {a.statut === 'Rejetée' && <span className="text-xs text-ink/40">—</span>}
            </div>
          ) },
        ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle demande d'aide" subtitle="UC28 — l'aide sera validée puis payée par la caisse"
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
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={Object.keys(AIDE_ICONS).map(k => ({ value: k, label: `${AIDE_ICONS[k]} ${k}` }))} />
            </Field>
            <Field label="Montant (XAF)"><Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: +e.target.value }))} /></Field>
          </div>
          <Field label="Motif"><Textarea value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Décrire la situation…" /></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ ENCHÈRES (UC29) ============================ */
export function EncheresPage() {
  const { db, setDb, toast } = useStore()
  const [form, setForm] = useState({ membreId: '', montant: db.tontine.tauxEnchereMin })
  const ouverte = db.encheres.find(e => e.statut === 'Ouverte')
  const historique = db.encheres.filter(e => e.statut === 'Clôturée')
  const membres = Object.fromEntries(db.membres.map(m => [m.id, m]))
  const offres = ouverte ? [...ouverte.offres].sort((a, b) => b.montant - a.montant) : []
  const meilleure = offres[0]

  const ajouterOffre = () => {
    if (!ouverte) return toast('Aucune enchère ouverte', 'error')
    if (!form.membreId) return toast('Choisissez un membre', 'error')
    const montant = +form.montant
    if (!montant || montant < db.tontine.tauxEnchereMin) return toast(`L'offre minimum est de ${fmtXAF(db.tontine.tauxEnchereMin)}`, 'error')
    if (ouverte.offres.some(o => o.membreId === form.membreId)) return toast('Ce membre a déjà fait une offre', 'error')
    setDb(d => ({ ...d, encheres: d.encheres.map(e => e.id === ouverte.id ? { ...e, offres: [...e.offres, { membreId: form.membreId, montant }] } : e) }))
    toast(`Offre de ${fmtXAF(montant)} enregistrée pour ${membres[form.membreId]?.nom || '—'}`)
    setForm(f => ({ ...f, membreId: '', montant: db.tontine.tauxEnchereMin }))
  }
  const cloturer = () => {
    if (!ouverte) return
    if (!offres.length) return toast('Aucune offre reçue — enchère non clôturable', 'error')
    setDb(d => ({
      ...d,
      encheres: d.encheres.map(e => e.id === ouverte.id ? { ...e, statut: 'Clôturée', gagnantId: offres[0].membreId } : e),
      notifications: notify(d, offres[0].membreId, 'Enchère remportée 🏆', `Félicitations ! Vous remportez le tour de ${fmtDate(ouverte.date)} avec une offre de ${fmtXAF(offres[0].montant)}.`),
    }))
    toast(`Enchère clôturée — gagnant : ${membres[offres[0].membreId]?.nom || '—'} avec ${fmtXAF(offres[0].montant)} 🏆`)
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Enchères du tour" sub="Le tour est attribué à la meilleure offre, minimum requis : mise commune (UC29)."
        actions={<Badge tone="gold">Enchère minimum : {fmtXAF(db.tontine.tauxEnchereMin)}</Badge>} />

      {ouverte ? (
        <div className="grid gap-5 lg:grid-cols-5 stagger">
          <Card title="Enchère ouverte" subtitle={`Tour du ${fmtDate(ouverte.date)} — mise commune : ${fmtXAF(db.tontine.tauxEnchereMin)}`} className="lg:col-span-3" pad={false}>
            <div className="p-3">
              {offres.length === 0 && <EmptyState icon="🔨" title="Aucune offre pour le moment" sub="Enregistrez la première offre ci-contre." />}
              {offres.map((o, i) => (
                <div key={i} className={cls('flex items-center gap-3 rounded-xl px-3 py-3', i === 0 ? 'bg-gold-50 ring-1 ring-gold-300' : 'hover:bg-brand-50/60')}>
                  <Avatar name={membres[o.membreId]?.nom || '?'} ring={i === 0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{membres[o.membreId]?.nom || '—'} {i === 0 && <Badge tone="gold">Meilleure offre</Badge>}</p>
                    <p className="text-xs text-ink/50">{o.montant >= db.tontine.tauxEnchereMin ? 'Offre conforme' : 'Sous le minimum'}</p>
                  </div>
                  <p className={cls('font-display font-bold', i === 0 ? 'text-gold-600' : 'text-ink')}>{fmtXAF(o.montant)}</p>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-5 lg:col-span-2">
            <Card title="Enregistrer une offre" subtitle={`Minimum : ${fmtXAF(db.tontine.tauxEnchereMin)}`}>
              <div className="space-y-4">
                <Field label="Membre enchérisseur">
                  <Select value={form.membreId} onChange={e => setForm(f => ({ ...f, membreId: e.target.value }))}>
                    <option value="">— Choisir un membre —</option>
                    {db.membres.filter(m => !ouverte.offres.some(o => o.membreId === m.id)).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </Select>
                </Field>
                <Field label="Montant de l'offre (XAF)"><Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: +e.target.value }))} /></Field>
                <Button className="w-full" icon="🔨" onClick={ajouterOffre}>Enregistrer l'offre</Button>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Meilleure offre actuelle</p>
                <p className="mt-1 font-display text-2xl font-semibold text-gold-600">{meilleure ? fmtXAF(meilleure.montant) : '—'}</p>
                <p className="text-xs text-ink/50">{meilleure ? membres[meilleure.membreId]?.nom : 'En attente d\'offres'}</p>
                <Button variant="danger" className="mt-4 w-full" icon="🏁" onClick={cloturer}>Clôturer l'enchère</Button>
                <p className="mt-2 text-[11px] text-ink/40">Le membre avec la meilleure offre remportera le tour.</p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState icon="🔨" title="Aucune enchère ouverte" sub="Le secrétaire ouvrira la prochaine enchère au tour venu." />
      )}

      <Card title="Historique des enchères" subtitle="Tours attribués aux meilleures offres" pad={false}>
        <Table empty="Aucune enchère clôturée" rows={historique} columns={[
          { key: 'date', label: 'Date', render: e => fmtDate(e.date) },
          { key: 'gagnant', label: 'Gagnant', render: e => <span className="flex items-center gap-2"><Avatar name={membres[e.gagnantId]?.nom || '?'} size="sm" /><span className="font-semibold">{membres[e.gagnantId]?.nom || '—'}</span></span> },
          { key: 'offres', label: 'Offres reçues', render: e => e.offres.length },
          { key: 'montant', label: 'Meilleure offre', render: e => <span className="font-bold">{fmtXAF(Math.max(...e.offres.map(o => o.montant), 0))}</span> },
          { key: 'statut', label: 'Statut', render: e => <Badge tone={statusTone(e.statut)}>{e.statut}</Badge> },
        ]} />
      </Card>
    </div>
  )
}

/* ============================ RAPPORTS FINANCIERS (UC30 · UC31 · UC32 · UC33) ============================ */
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
    const resume = `Encaissements ${fmtNum(s.encaisse)} XAF, décaissements ${fmtNum(s.decaisse)} XAF, solde caisse ${fmtNum(s.solde)} XAF. ${db.cotisations.filter(c => c.statut === 'En attente').length} paiement(s) en attente, ${db.penalites.filter(p => !p.payee).length} pénalité(s) impayée(s).`
    setDb(d => ({ ...d, rapports: [{ id: uid('ra'), periode: monthLabel(mois), type: 'Financier', statut: 'Soumis', auteur: user?.nom || 'Trésorier', date: today(), resume }, ...d.rapports] }))
    toast(`Rapport financier de ${monthLabel(mois)} généré et soumis au président 📊`)
  }
  const cloturer = () => {
    const s = statsMois(moisCloture)
    const resume = `Clôture de ${monthLabel(moisCloture)} : encaissements ${fmtNum(s.encaisse)} XAF, décaissements ${fmtNum(s.decaisse)} XAF, solde final ${fmtNum(s.solde)} XAF. Comptes arrêtés et transmis pour validation.`
    setDb(d => ({ ...d, rapports: [{ id: uid('ra'), periode: monthLabel(moisCloture), type: 'Financier', statut: 'Soumis', auteur: user?.nom || 'Trésorier', date: today(), resume }, ...d.rapports] }))
    toast(`${monthLabel(moisCloture)} clôturé — rapport soumis au président 🏁`)
  }
  const impayes = db.membres.filter(m => m.statut === 'Actif' && !db.cotisations.some(c => c.membreId === m.id && c.statut === 'Validée' && monthKey(c.date) === mois))
    .map(m => {
      const pens = db.penalites.filter(p => p.membreId === m.id && !p.payee)
      return { id: m.id, membre: m, cotisation: db.tontine.montantCotisation, penalites: sum(pens, p => p.montant), total: db.tontine.montantCotisation + sum(pens, p => p.montant) }
    })
  const dernierIR = db.interetsRedistribues[db.interetsRedistribues.length - 1]
  const rapportsFin = db.rapports.filter(r => r.type === 'Financier')

  return (
    <div className="space-y-6">
      <PageHeader title="Rapports financiers" sub="Rapport mensuel, membres en retard, répartition des intérêts et clôture (UC30 · UC31 · UC32 · UC33)."
        actions={tab === 'mensuel' && <Button variant="gold" icon="📊" onClick={genererMensuel}>Générer le rapport du mois</Button>} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'mensuel', label: 'Rapport mensuel' },
        { id: 'impayes', label: `Impayés (${impayes.length})` },
        { id: 'interets', label: 'Répartition intérêts' },
        { id: 'cloture', label: 'Clôture' },
      ]} />

      {tab === 'mensuel' && (
        <div className="space-y-4 stagger">
          {rapportsFin.length === 0 && <EmptyState icon="📊" title="Aucun rapport financier" sub="Générez le premier rapport mensuel du cycle." />}
          {rapportsFin.map(r => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><h3 className="font-display text-lg font-semibold">Rapport financier — {r.periode}</h3><Badge tone={statusTone(r.statut)}>{r.statut}</Badge></div>
                  <p className="mt-1 text-xs text-ink/50">Par {r.auteur} · {fmtDate(r.date)}</p>
                  <p className="mt-2 max-w-2xl text-sm text-ink/70">{r.resume}</p>
                </div>
                <Button size="sm" variant="outline" icon="🖨" onClick={() => setPrint(r)}>Imprimer</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'impayes' && (
        <Card title={`Membres en retard — ${monthLabel(mois)}`} subtitle="UC31 — cotisation du mois non validée et pénalités impayées" pad={false}>
          <Table empty="Aucun impayé — tous les membres sont à jour 🎉" rows={impayes} columns={[
            { key: 'membre', label: 'Membre', render: r => <span className="flex items-center gap-2"><Avatar name={r.membre.nom} size="sm" /><span className="font-semibold">{r.membre.nom}</span></span> },
            { key: 'tel', label: 'Téléphone', render: r => r.membre.tel },
            { key: 'cotisation', label: 'Cotisation due', render: r => fmtXAF(r.cotisation) },
            { key: 'penalites', label: 'Pénalités impayées', render: r => fmtXAF(r.penalites) },
            { key: 'total', label: 'Total dû', render: r => <span className="font-bold text-red-600">{fmtXAF(r.total)}</span> },
          ]} />
        </Card>
      )}

      {tab === 'interets' && (
        <Card title="Répartition des intérêts" subtitle="UC32 — dernière redistribution au prorata de l'épargne" pad={false}>
          {!dernierIR && <EmptyState icon="🎁" title="Aucune redistribution" sub="Utilisez la page Intérêts pour effectuer la première redistribution." />}
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
          <Card title="Clôture de période" subtitle="UC33 — arrêté des comptes pour un mois donné">
            <div className="space-y-4">
              <Field label="Mois à clôturer"><Input type="month" value={moisCloture} onChange={e => setMoisCloture(e.target.value)} /></Field>
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-brand-50 p-4 text-center text-xs">
                <div><p className="font-bold uppercase tracking-wider text-ink/40">Encaissé</p><p className="mt-1 text-sm font-bold">{fmtNum(statsMois(moisCloture).encaisse)}</p></div>
                <div><p className="font-bold uppercase tracking-wider text-ink/40">Décaissé</p><p className="mt-1 text-sm font-bold">{fmtNum(statsMois(moisCloture).decaisse)}</p></div>
                <div><p className="font-bold uppercase tracking-wider text-ink/40">Solde caisse</p><p className="mt-1 text-sm font-bold">{fmtNum(statsMois(moisCloture).solde)}</p></div>
              </div>
              <Button variant="gold" className="w-full" icon="🏁" onClick={cloturer}>Clôturer {monthLabel(moisCloture)}</Button>
            </div>
          </Card>
          <Card title="Rapports de clôture" subtitle="Historique des arrêtés de comptes" pad={false}>
            <div className="p-3">
              {db.rapports.filter(r => r.resume.startsWith('Clôture')).length === 0 && <EmptyState icon="🏁" title="Aucune clôture" sub="Clôturez un mois pour archiver l'arrêté des comptes." />}
              {db.rapports.filter(r => r.resume.startsWith('Clôture')).map(r => (
                <RowItem key={r.id} icon="🏁" title={`Clôture — ${r.periode}`} sub={`${r.auteur} · ${fmtDate(r.date)}`} right={<Badge tone={statusTone(r.statut)}>{r.statut}</Badge>} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <Modal open={!!print} onClose={() => setPrint(null)} title="Aperçu avant impression" subtitle={print ? `Rapport financier — ${print.periode}` : ''} wide
        footer={<><Button variant="ghost" onClick={() => setPrint(null)}>Fermer</Button><Button variant="gold" icon="🖨" onClick={() => window.print()}>Imprimer</Button></>}>
        {print && (
          <div className="print-area rounded-2xl border border-black/10 p-6">
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
