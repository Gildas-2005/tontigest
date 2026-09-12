import { useState, useMemo } from 'react'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Select, Textarea, Stat, Table, statusTone, EmptyState, RowItem, Avatar, Input } from '../components/ui'
import { Donut, Bars, Legend } from '../components/charts'
import { fmtXAF, fmtDate, today, now, uid, sum, pct, monthKey, monthLabel, byId } from '../lib/utils'
import { pdfRapportAudit, pdfFicheMembre } from '../lib/pdf'
import {
  UsersRound, Search, PiggyBank, HandCoins, Heart, Gavel, CalendarDays,
  Bell, Ban, Receipt, UserCheck, TriangleAlert, ArrowLeftRight, Check,
  ShieldAlert, Clock, Crown, Landmark, Repeat, FileText, ChartColumn,
  ListChecks, Printer, FileSearch, Siren, ShieldCheck, Phone, CircleCheck,
} from '../components/icons'

/* ============================ ACCUEIL AUDIT ============================ */
export function AuditHome() {
  const { db } = useStore()
  const { user } = useAuth()
  const totalCaisse = sum(Object.values(db.caisse.XAF))
  const mois = monthKey()
  const mvMois = db.mouvements.filter(m => monthKey(m.date) === mois)
  const conformes = db.audits.filter(a => a.verdict === 'Conforme').length
  const anomalies = db.audits.filter(a => a.verdict === 'Anomalie').length
  const enAttente = db.rapports.filter(r => r.statut === 'Soumis').length

  const donutData = [
    { label: 'Conforme', value: conformes, color: '#187830' },
    { label: 'Anomalie', value: anomalies, color: '#dc2626' },
  ]
  const LIBELLES = { Cotisation: 'Cotisations', Decaissement: 'Décaissements', 'Versement banque': 'Versements', Pret: 'Prêts' }
  const types = [...new Set(db.mouvements.map(m => m.type))].map(t => ({
    label: LIBELLES[t] || t,
    value: sum(db.mouvements.filter(m => m.type === t), m => m.montant),
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Commissariat aux comptes"
        sub={`Bonjour ${user.nom.split(' ')[0]}, contrôlez mouvements, rapports et conformité du club.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Trésor total" value={fmtXAF(totalCaisse)} sub="Caisse + banque + mobile money" icon={<Landmark size={18} />} tone="brand" />
        <Stat label="Mouvements ce mois" value={mvMois.length} sub={`${fmtXAF(sum(mvMois, m => m.montant))} transités oe mois`} icon={<Repeat size={18} />} tone="gold" />
        <Stat label="Anomalies détectées" value={anomalies} sub={`${conformes} mouvement(s) conforme(s) audité(s)`} icon={<TriangleAlert size={18} />} tone={anomalies ? 'red' : 'blue'} />
        <Stat label="Rapports en attente" value={enAttente} sub="Rapports financiers soumis non validés" icon={<FileText size={18} />} tone={enAttente ? 'violet' : 'blue'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card title="Conformité des audits" subtitle="Verdicts posés sur les mouvements contrôlés" className="xl:col-span-2">
          <div className="flex items-center gap-6">
            <Donut data={donutData} center={<div><p className="font-display text-lg font-semibold">{pct(conformes, conformes + anomalies)}%</p><p className="text-[10px] font-bold text-ink/40">Conforme</p></div>} />
            <Legend data={donutData} total={conformes + anomalies} />
          </div>
        </Card>
        <Card title="Mouvements par type" subtitle="Volume cumulé par nature d'opération" className="xl:col-span-3">
          <Bars data={types} format={fmtXAF} />
        </Card>
      </div>

      <Card title="Dernières alertes" subtitle="Signalements de fraude et d'anomalies" pad={false}
        actions={<Badge tone={db.alertes.filter(a => a.statut === 'Nouvelle').length ? 'red' : 'green'}>{db.alertes.filter(a => a.statut === 'Nouvelle').length} nouvelle(s)</Badge>}>
        <div className="p-3">
          {db.alertes.length === 0 && <EmptyState icon={<ShieldCheck size={16} />} title="Aucune alerte" sub="Aucune fraude ou anomalie signalée." />}
          {[...db.alertes].reverse().slice(0, 5).map(a => (
            <RowItem key={a.id} icon={a.type === 'Fraude' ? <Siren size={16} className="text-red-600" /> : <TriangleAlert size={16} className="text-amber-600" />} title={a.message}
              sub={`${a.type} · par ${a.de} · ${fmtDate(a.date.slice(0, 10))}`}
              right={a.statut === 'Nouvelle' ? <Badge tone="red" dot>{a.statut}</Badge> : <Badge tone="green">Traitée</Badge>} />
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ============================ AUDIT DES TRANSACTIONS ============================ */
export function AuditTransactionsPage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({ verdict: 'Conforme', note: '' })

  const récentes = [...db.mouvements].sort((a, b) => b.date.localeCompare(a.date))
  const auditer = () => {
    if (form.note.trim().length < 5) return toast('Ajoutez une note d\'audit (5 caractères minimum)', 'error')
    const anomalie = form.verdict !== 'Conforme'
    // En cas d'anomalie, alerter le Président et le Trésorier.
    const bureau = d => d.membres.filter(m => ['President', 'Tresorier'].includes(m.role))
    setDb(d => ({
      ...d,
      audits: [{ id: uid('au'), cible: `Mouvement ${sel.type} ${fmtXAF(sel.montant)} du ${fmtDate(sel.date)}`, verdict: form.verdict, note: form.note, date: today(), par: user.nom }, ...d.audits],
      notifications: anomalie ? [...d.notifications, ...bureau(d).map(m => ({
        id: uid('nt'), pour: m.id, titre: '⚠ Anomalie détectée',
        message: `Le commissaire a détecté une anomalie sur un mouvement ${sel.type} de ${fmtXAF(sel.montant)} : ${form.note}`,
        lu: false, date: now(),
      }))] : d.notifications,
    }))
    setSel(null); setForm({ verdict: 'Conforme', note: '' })
    toast(anomalie ? 'Anomalie consignée — Président et Trésorier notifiés' : 'Mouvement audité — verdict enregistré au registre')
  }

  return (
    <div>
      <PageHeader title="Audit des transactions" sub="Contrôlez les mouvements récents et consignez vos verdicts." />
      <div className="space-y-5">
        <Card title="Mouvements récents" subtitle="Tous comptes confondus — caisse, banque, mobile money" pad={false}>
          <div className="p-3">
            <Table
              columns={[
                { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
                { key: 'type', label: 'Type', render: r => <span className="font-semibold">{r.type}</span> },
                { key: 'compte', label: 'Compte', render: r => <Badge tone="gray">{r.compte}</Badge> },
                { key: 'montant', label: 'Montant', render: r => <span className="font-bold">{fmtXAF(r.montant)}</span> },
                { key: 'sens', label: 'Sens', render: r => r.sens === 'in' ? <Badge tone="green">Entrée</Badge> : <Badge tone="amber">Sortie</Badge> },
                { key: 'act', label: '', render: r => <Button size="sm" variant="outline" onClick={() => { setSel(r); setForm({ verdict: 'Conforme', note: '' }) }}>Auditer</Button> },
              ]}
              rows={récentes} />
          </div>
        </Card>

        <Card title="Registre des audits" subtitle="Verdicts consignés par le commissariat" pad={false}>
          <div className="p-3">
            {db.audits.length === 0 && <EmptyState icon={<FileSearch size={16} />} title="Aucun audit réalisé" sub="Auditez un mouvement pour commencer." />}
            {[...db.audits].reverse().map(a => (
              <RowItem key={a.id} icon={a.verdict === 'Conforme' ? <CircleCheck size={16} className="text-brand-600" /> : <TriangleAlert size={16} className="text-amber-600" />} title={a.cible}
                sub={`${a.note} — par ${a.par} · ${fmtDate(a.date)}`}
                right={<Badge tone={statusTone(a.verdict)}>{a.verdict}</Badge>} />
            ))}
          </div>
        </Card>
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title="Auditer le mouvement" subtitle={sel ? `${sel.type} · ${fmtXAF(sel.montant)} · ${fmtDate(sel.date)}` : ''}
        footer={<><Button variant="ghost" onClick={() => setSel(null)}>Annuler</Button><Button variant="gold" onClick={auditer}>Consigner le verdict</Button></>}>
        {sel && (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <p><span className="font-semibold">Opération :</span> {sel.type} — {fmtXAF(sel.montant)} ({sel.sens === 'in' ? 'entrée' : 'sortie'})</p>
              <p className="mt-1"><span className="font-semibold">Compte :</span> {sel.compte} {sel.note ? `· ${sel.note}` : ''}</p>
            </div>
            <Field label="Verdict"><Select value={form.verdict} onChange={e => setForm(f => ({ ...f, verdict: e.target.value }))} options={['Conforme', 'Anomalie']} /></Field>
            <Field label="Note d'audit" hint="Justifiez le verdict : pièces justificatives, signatures, rapprochements…">
              <Textarea className="min-h-28" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex : Reçu joint, rapprochement bancaire concordant…" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================ RAPPORTS ============================ */
export function AuditRapportsPage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const financiers = db.rapports.filter(r => r.type === 'Financier')
  const dernierAudit = [...db.rapports].filter(r => r.type === 'Audit').sort((a, b) => b.date.localeCompare(a.date))[0]

  const decider = (r, ok) => {
    const tresorier = db.membres.find(m => m.role === 'Tresorier')
    setDb(d => ({
      ...d,
      rapports: d.rapports.map(x => x.id === r.id ? { ...x, statut: ok ? 'Validé' : 'Rejeté' } : x),
      notifications: tresorier ? [...d.notifications, { id: uid('nt'), pour: tresorier.id, titre: ok ? 'Rapport validé' : 'Rapport rejeté', message: `Le commissariat a ${ok ? 'validé' : 'rejeté'} votre rapport ${r.type} de la période ${r.periode}.${ok ? '' : ' Veuillez le corriger.'}`, lu: false, date: now() }] : d.notifications,
    }))
    toast(ok ? `Rapport ${r.periode} validé par le commissariat` : `Rapport ${r.periode} rejeté — retourné au trésorier`, ok ? 'success' : 'error')
  }
  const generer = () => {
    const conformes = db.audits.filter(a => a.verdict === 'Conforme').length
    const anomalies = db.audits.filter(a => a.verdict === 'Anomalie').length
    const nouvellesAlertes = db.alertes.filter(a => a.statut === 'Nouvelle').length
    const resume = `Audit interne : ${conformes} contrôle(s) conforme(s), ${anomalies} anomalie(s) détectée(s). ${nouvellesAlertes} alerte(s) en attente de traitement par le bureau. Trésor contrôlé : ${fmtXAF(sum(Object.values(db.caisse.XAF)))}.`
    setDb(d => ({
      ...d,
      rapports: [{ id: uid('ra'), periode: monthLabel(monthKey()), type: 'Audit', statut: 'Validé', auteur: user.nom, date: today(), resume }, ...d.rapports],
    }))
    toast('Rapport d\'audit généré, signé et archivé')
  }
  const exporterAuditPDF = () => {
    if (!dernierAudit) return
    pdfRapportAudit({
      club: db.tontine,
      audit: { cible: `Rapport d'audit — ${dernierAudit.periode}`, par: dernierAudit.auteur, date: dernierAudit.date, verdict: 'Conforme', note: dernierAudit.resume },
      verdicts: [
        { libelle: 'Audits conformes', resultat: String(db.audits.filter(a => a.verdict === 'Conforme').length) },
        { libelle: 'Anomalies relevées', resultat: String(db.audits.filter(a => a.verdict === 'Anomalie').length) },
        { libelle: 'Alertes en attente', resultat: String(db.alertes.filter(a => a.statut === 'Nouvelle').length) },
      ],
    })
    toast('Rapport d\'audit téléchargé en PDF')
  }

  return (
    <div>
      <PageHeader title="Rapports financiers & d'audit" sub="Validez les rapports du trésorier et produisez votre rapport d'audit." />
      <div className="space-y-5">
        <Card title="Rapports financiers soumis" subtitle="Décision du commissaire aux comptes" pad={false}>
          <div className="p-3">
            {financiers.length === 0 && <EmptyState icon={<ChartColumn size={16} />} title="Aucun rapport financier" />}
            {financiers.map(r => (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl px-3 py-4 transition hover:bg-brand-50/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">Rapport {r.type} — {r.periode}</p>
                    <Badge tone={statusTone(r.statut)}>{r.statut}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink/50">Par {r.auteur} · {fmtDate(r.date)}</p>
                  <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-ink/65">{r.resume}</p>
                </div>
                {r.statut === 'Soumis' ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => decider(r, false)}>Rejeter</Button>
                    <Button size="sm" onClick={() => decider(r, true)}>Valider</Button>
                  </div>
                ) : <Badge tone={statusTone(r.statut)}>Décision rendue</Badge>}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Générer le rapport d'audit" subtitle="Synthèse automatique de vos verdicts"
          actions={<Button variant="gold" icon={<ListChecks size={16} />} onClick={generer}>Générer le rapport d'audit</Button>}>
          {dernierAudit ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-700">{db.tontine.nom} — {db.tontine.ville}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold">Rapport d'audit — {dernierAudit.periode}</h3>
                  <p className="text-xs text-ink/50">Établi par {dernierAudit.auteur}, Commissaire aux comptes · {fmtDate(dernierAudit.date)}</p>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink/80">{dernierAudit.resume}</p>
                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-xl bg-brand-50 px-3 py-2"><span className="font-bold text-brand-700">Audits conformes :</span> {db.audits.filter(a => a.verdict === 'Conforme').length}</div>
                  <div className="rounded-xl bg-red-50 px-3 py-2"><span className="font-bold text-red-700">Anomalies relevées :</span> {db.audits.filter(a => a.verdict === 'Anomalie').length}</div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2"><span className="font-bold text-amber-700">Alertes en attente :</span> {db.alertes.filter(a => a.statut === 'Nouvelle').length}</div>
                </div>
                <p className="mt-6 text-right text-xs text-ink/50">Fait à {db.tontine.ville.split('—')[0].trim()}, le {fmtDate(dernierAudit.date)}<br />Signature : {dernierAudit.auteur}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" icon={<Printer size={16} />} onClick={() => exporterAuditPDF()}>Télécharger le rapport (PDF)</Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={<FileText size={16} />} title="Aucun rapport d'audit généré" sub="Le rapport synthétise automatiquement vos audits conformes et vos anomalies." />
          )}
        </Card>
      </div>
    </div>
  )
}

/* ============================ SIGNALEMENT FRAUDE ============================ */
export function FraudePage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [form, setForm] = useState({ type: 'Anomalie', message: '' })

  const signaler = () => {
    if (form.message.trim().length < 10) return toast('Décrivez le signalement (10 caractères minimum)', 'error')
    setDb(d => ({
      ...d,
      alertes: [{ id: uid('al'), de: user.nom, type: form.type, message: form.message, statut: 'Nouvelle', date: today() }, ...d.alertes],
    }))
    setForm({ type: 'Anomalie', message: '' })
    toast('Le président a été alerté', form.type === 'Fraude' ? 'error' : 'info')
  }

  return (
    <div>
      <PageHeader title="Alerte fraude & anomalies" sub="Signalez immédiatement toute fraude ou anomalie au président."
        actions={<Badge tone={db.alertes.filter(a => a.statut === 'Nouvelle').length ? 'red' : 'green'} dot={!!db.alertes.filter(a => a.statut === 'Nouvelle').length}>{db.alertes.filter(a => a.statut === 'Nouvelle').length} non traitée(s)</Badge>} />
      <div className="grid gap-5 lg:grid-cols-5 stagger">
        <Card title="Nouveau signalement" className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="Type de signalement"><Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={['Fraude', 'Anomalie']} /></Field>
            <Field label="Description" hint="Soyez précis : montants, dates, pièces manquantes…">
              <Textarea className="min-h-32" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Ex : Écart de 50 000 XAF entre le bordereau et la caisse du 12/09…" />
            </Field>
            <Button variant={form.type === 'Fraude' ? 'danger' : 'primary'} className="w-full"
              icon={form.type === 'Fraude' ? <Siren size={16} /> : <TriangleAlert size={16} />} onClick={signaler}>Signaler au président</Button>
          </div>
        </Card>
        <Card title="Signalements transmis" subtitle="Historique des alertes du commissariat" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {db.alertes.length === 0 && <EmptyState icon={<ShieldCheck size={16} />} title="Aucun signalement" sub="Vos alertes apparaîtront ici." />}
            {[...db.alertes].reverse().map(a => (
              <RowItem key={a.id} icon={a.type === 'Fraude' ? <Siren size={16} className="text-red-600" /> : <TriangleAlert size={16} className="text-amber-600" />} title={a.message}
                sub={`${a.type} · par ${a.de} · ${fmtDate(a.date)}`}
                right={a.statut === 'Nouvelle' ? <Badge tone="red" dot>{a.statut}</Badge> : <Badge tone="green">Traitée</Badge>} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================ SUIVI COMPLET PAR MEMBRE ============================ */
export function AuditMembresPage() {
  const { db, toast } = useStore()
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState(null)

  const membres = db.membres
  const filtres = membres.filter(m =>
    !q || m.nom.toLowerCase().includes(q.toLowerCase()) || (m.tel || '').includes(q) || (m.email || '').toLowerCase().includes(q.toLowerCase())
  )
  const sel = byId(membres, selId) || filtres[0] || membres[0] || null

  const data = useMemo(() => {
    if (!sel) return null
    const id = sel.id
    const cot = db.cotisations.filter(o => o.membreId === id)
    const cotVal = cot.filter(o => o.statut === 'Validée')
    const cotAtt = cot.filter(o => o.statut === 'En attente')
    const pen = db.penalites.filter(p => p.membreId === id)
    const penImp = pen.filter(p => !p.payee)
    const ep = db.epargneIndividuelle.find(e => e.membreId === id) || { solde: 0, bloquee: 0, versements: [] }
    const prets = db.prets.filter(p => p.membreId === id)
    const pretsEnCours = prets.filter(p => p.statut === 'En cours')
    const aides = db.aides.filter(a => a.membreId === id)
    const sanctions = db.sanctions.filter(s => s.membreId === id)
    const seancesTerm = db.seances.filter(s => s.statut === 'Terminée')
    const presentes = seancesTerm.filter(s => s.presences && s.presences[id]).length
    const notifs = [...db.notifications].filter(n => n.pour === id).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6)
    const mv = [...db.mouvements].filter(x => x.membreId === id).sort((a, b) => b.date.localeCompare(a.date))
    return {
      cot, cotVal, cotAtt, pen, penImp, ep, prets, pretsEnCours, aides, sanctions,
      seancesTerm, presentes, notifs, mv,
      totalCot: sum(cotVal, o => o.montant),
      totalAtt: sum(cotAtt, o => o.montant),
      totalPenImp: sum(penImp, p => p.montant),
      restePret: sum(pretsEnCours, p => p.reste),
      rembourse: sum(prets.filter(p => p.statut === 'Remboursé'), p => p.montant),
      tauxPresence: pct(presentes, seancesTerm.length),
      derniereCot: [...cotVal].sort((a, b) => b.date.localeCompare(a.date))[0],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.id, db])

  const alerte = (m) => {
    const att = db.cotisations.some(o => o.membreId === m.id && o.statut === 'En attente')
    const imp = db.penalites.some(p => p.membreId === m.id && !p.payee)
    return att || imp
  }

  const exporterFiche = () => {
    if (!sel || !data) return
    pdfFicheMembre({
      club: db.tontine,
      membre: sel,
      sections: [
        {
          title: 'Cotisations validées',
          columns: [
            { key: 'mois', label: 'Mois', width: 2, render: r => monthLabel(monthKey(r.date)) },
            { key: 'date', label: 'Date', width: 1.4, render: r => fmtDate(r.date) },
            { key: 'montant', label: 'Montant', width: 1.4, align: 'right', render: r => fmtXAF(r.montant) },
            { key: 'methode', label: 'Méthode', width: 1.6, render: r => r.methode || '—' },
          ],
          rows: data.cotVal,
        },
        {
          title: 'Pénalités',
          columns: [
            { key: 'motif', label: 'Motif', width: 2.6, render: r => r.motif || '—' },
            { key: 'montant', label: 'Montant', width: 1.2, align: 'right', render: r => fmtXAF(r.montant) },
            { key: 'payee', label: 'État', width: 1, render: r => r.payee ? 'Payée' : 'Impayée' },
          ],
          rows: data.pen,
        },
        {
          title: 'Prêts',
          columns: [
            { key: 'date', label: 'Date', width: 1.4, render: r => fmtDate(r.date) },
            { key: 'montant', label: 'Montant', width: 1.4, align: 'right', render: r => fmtXAF(r.montant) },
            { key: 'statut', label: 'Statut', width: 1, render: r => r.statut || '—' },
            { key: 'reste', label: 'Reste', width: 1.2, align: 'right', render: r => fmtXAF(r.reste ?? r.montant) },
          ],
          rows: data.prets,
        },
        {
          title: `Mouvements (${data.mv.length})`,
          columns: [
            { key: 'date', label: 'Date', width: 1.4, render: r => fmtDate(r.date) },
            { key: 'type', label: 'Type', width: 1.8 },
            { key: 'compte', label: 'Compte', width: 1 },
            { key: 'montant', label: 'Montant', width: 1.4, align: 'right', render: r => (r.sens === 'out' ? '−' : '+') + ' ' + fmtXAF(r.montant) },
          ],
          rows: data.mv.slice(0, 20),
        },
      ],
    })
    toast(`Fiche d'audit de ${sel.nom} téléchargée en PDF`)
  }

  return (
    <div>
      <PageHeader title="Suivi par membre" sub="Vision complète et précise de chaque membre : cotisations, pénalités, épargne, prêts, aides, sanctions et assiduité."
        actions={<><Badge tone="brand"><UsersRound size={14} className="mr-1 inline" />{membres.length} membres</Badge>{sel && <Button variant="outline" icon={<Printer size={15} />} onClick={exporterFiche}>Fiche PDF</Button>}</>} />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr] items-start">
        {/* Liste des membres */}
        <Card pad={false} className="lg:sticky lg:top-4">
          <div className="border-b border-black/5 p-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un membre…" className="pl-9" />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {filtres.length === 0 && <EmptyState icon={<Search size={26} />} title="Aucun membre" sub="Aucun résultat pour cette recherche." />}
            {filtres.map(m => (
              <button key={m.id} onClick={() => setSelId(m.id)}
                className={clsRow(sel && sel.id === m.id)}>
                <Avatar name={m.nom} size="md" ring={m.role === 'President'} />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{m.nom}</p>
                  <p className="truncate text-xs text-ink/50">{BUREAU_LABELS[m.role] || m.role}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {m.statut !== 'Actif' && <Badge tone="amber">{m.statut}</Badge>}
                  {alerte(m) ? <TriangleAlert size={16} className="text-red-500" /> : <CircleCheckIcon />}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Panneau détaillé */}
        <div className="space-y-5">
          {!sel || !data ? (
            <EmptyState icon={<UsersRound size={28} />} title="Sélectionnez un membre" sub="Le détail complet de son dossier s'affichera ici." />
          ) : (
            <>
              {/* Identité */}
              <Card>
                <div className="flex flex-wrap items-start gap-5">
                  <Avatar name={sel.nom} size="xl" ring={sel.role === 'President'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-semibold">{sel.nom}</h2>
                      {sel.role === 'President' && <Crown size={18} className="text-gold-500" />}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone="gold">{BUREAU_LABELS[sel.role] || sel.role}</Badge>
                      <Badge tone={sel.statut === 'Actif' ? 'green' : 'amber'}>{sel.statut}</Badge>
                      <Badge tone="gray">Adhérent depuis {fmtDate(sel.dateAdhesion)}</Badge>
                    </div>
                    <div className="mt-4 grid gap-x-8 gap-y-1.5 text-sm text-ink/70 sm:grid-cols-2">
                      <p className="flex items-center gap-2"><Receipt size={14} className="text-ink/40" />{sel.profession || '—'}</p>
                      <p className="flex items-center gap-2"><Phone size={14} className="text-ink/40" />{sel.tel || '—'}</p>
                      <p className="flex items-center gap-2 sm:col-span-2"><span className="text-ink/40">@</span>{sel.email || '—'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Indicateurs clés */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
                <Stat label="Cotisations validées" value={fmtXAF(data.totalCot)} sub={`${data.cotVal.length} versement(s)${data.derniereCot ? ' · dernier ' + fmtDate(data.derniereCot.date) : ''}`} icon={<Receipt size={20} />} tone="brand" />
                <Stat label="En attente" value={data.cotAtt.length} sub={data.totalAtt ? `${fmtXAF(data.totalAtt)} à valider` : 'Aucun paiement en attente'} icon={<Clock size={20} />} tone={data.cotAtt.length ? 'gold' : 'blue'} />
                <Stat label="Épargne" value={fmtXAF(data.ep.solde)} sub={data.ep.bloquee ? `${fmtXAF(data.ep.bloquee)} bloquée(s)` : 'Disponible'} icon={<PiggyBank size={20} />} tone="brand" />
                <Stat label="Prêt en cours" value={data.restePret ? fmtXAF(data.restePret) : 'Aucun'} sub={data.restePret ? `${data.pretsEnCours.length} prêt(s) — reste à rembourser` : `${fmtXAF(data.rembourse)} déjà remboursé(s)`} icon={<HandCoins size={20} />} tone={data.restePret ? 'red' : 'blue'} />
              </div>

              {/* Alertes de conformité */}
              {(data.penImp.length > 0 || data.sanctions.length > 0 || sel.statut !== 'Actif') && (
                <Card className="border-red-100 bg-red-50/40">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={20} className="mt-0.5 shrink-0 text-red-600" />
                    <div className="text-sm">
                      <p className="font-bold text-red-800">Points de vigilance</p>
                      <ul className="mt-1 space-y-0.5 text-red-700/90">
                        {data.penImp.length > 0 && <li>• {data.penImp.length} pénalité(s) impayée(s) — {fmtXAF(data.totalPenImp)}</li>}
                        {data.sanctions.length > 0 && <li>• {data.sanctions.length} sanction(s) au dossier</li>}
                        {sel.statut !== 'Actif' && <li>• Membre au statut « {sel.statut} »</li>}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid gap-5 xl:grid-cols-2">
                {/* Cotisations */}
                <Card title="Cotisations" subtitle={`${data.cotVal.length} validée(s) · ${data.cotAtt.length} en attente`} pad={false} className="xl:col-span-2">
                  <div className="p-3">
                    {data.cot.length === 0 && <EmptyState icon={<Receipt size={26} />} title="Aucune cotisation" />}
                    <Table
                      columns={[
                        { key: 'periode', label: 'Période', render: r => <span className="font-semibold">{monthLabel(r.periode)}</span> },
                        { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
                        { key: 'methode', label: 'Moyen', render: r => <Badge tone="gray">{r.methode}</Badge> },
                        { key: 'ref', label: 'Référence', render: r => <span className="text-xs text-ink/50">{r.ref || '—'}</span> },
                        { key: 'montant', label: 'Montant', render: r => <span className="font-bold">{fmtXAF(r.montant)}</span> },
                        { key: 'statut', label: 'Statut', render: r => <Badge tone={statusTone(r.statut)}>{r.statut}</Badge> },
                      ]}
                      rows={[...data.cot].sort((a, b) => b.date.localeCompare(a.date))} />
                  </div>
                </Card>

                {/* Prêts */}
                <Card title="Prêts internes" subtitle={`${data.prets.length} dossier(s)`} pad={false}>
                  <div className="p-3">
                    {data.prets.length === 0 && <EmptyState icon={<HandCoins size={26} />} title="Aucun prêt" />}
                    {data.prets.map(p => (
                      <RowItem key={p.id} icon={<HandCoins size={18} />}
                        title={`${fmtXAF(p.montant)} — ${p.motif || 'prêt'}`}
                        sub={`Demandé le ${fmtDate(p.dateDemande)} · reste ${fmtXAF(p.reste || 0)} · taux ${p.taux}%`}
                        right={<Badge tone={statusTone(p.statut)}>{p.statut}</Badge>} />
                    ))}
                  </div>
                </Card>

                {/* Épargne */}
                <Card title="Épargne individuelle" subtitle={`Solde ${fmtXAF(data.ep.solde)}${data.ep.bloquee ? ` · ${fmtXAF(data.ep.bloquee)} bloquée(s)` : ''}`} pad={false}>
                  <div className="p-3">
                    {(data.ep.versements || []).length === 0 && <EmptyState icon={<PiggyBank size={26} />} title="Aucun versement" />}
                    {(data.ep.versements || []).map(v => (
                      <RowItem key={v.id} icon={<PiggyBank size={18} />} title={fmtXAF(v.montant)} sub={`Versé le ${fmtDate(v.date)}`}
                        right={<Badge tone="green">Crédité</Badge>} />
                    ))}
                  </div>
                </Card>

                {/* Aides sociales */}
                <Card title="Aides sociales" subtitle={`${data.aides.length} demande(s)`} pad={false}>
                  <div className="p-3">
                    {data.aides.length === 0 && <EmptyState icon={<Heart size={26} />} title="Aucune aide" />}
                    {data.aides.map(a => (
                      <RowItem key={a.id} icon={<Heart size={18} />} title={`${a.type} — ${fmtXAF(a.montant)}`}
                        sub={`${a.motif || ''} · ${fmtDate(a.date)}`} right={<Badge tone={statusTone(a.statut)}>{a.statut}</Badge>} />
                    ))}
                  </div>
                </Card>

                {/* Pénalités */}
                <Card title="Pénalités" subtitle={data.penImp.length ? `${fmtXAF(data.totalPenImp)} impayée(s)` : 'Toutes réglées'} pad={false}>
                  <div className="p-3">
                    {data.pen.length === 0 && <EmptyState icon={<Ban size={26} />} title="Aucune pénalité" />}
                    {data.pen.map(p => (
                      <RowItem key={p.id} icon={<Ban size={18} />} title={`${fmtXAF(p.montant)} — ${p.motif || 'pénalité'}`}
                        sub={fmtDate(p.date)} right={p.payee ? <Badge tone="green">Payée</Badge> : <Badge tone="red" dot>Impayée</Badge>} />
                    ))}
                  </div>
                </Card>

                {/* Sanctions */}
                <Card title="Sanctions" subtitle={`${data.sanctions.length} au dossier`} pad={false}>
                  <div className="p-3">
                    {data.sanctions.length === 0 && <EmptyState icon={<Gavel size={26} />} title="Aucune sanction" sub="Dossier disciplinaire vierge." />}
                    {data.sanctions.map(s => (
                      <RowItem key={s.id} icon={<Gavel size={18} />} title={s.type} sub={`${s.motif || ''} · ${fmtDate(s.date)}`}
                        right={<Badge tone="red">{s.type}</Badge>} />
                    ))}
                  </div>
                </Card>

                {/* Assiduité */}
                <Card title="Assiduité aux séances" subtitle={`${data.presentes} présence(s) sur ${data.seancesTerm.length} séance(s) terminée(s)`}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                      <span className="font-display text-lg font-semibold">{data.tauxPresence}%</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-black/[.07]">
                        <div className="h-full rounded-full bg-brand-500 transition-all duration-700" style={{ width: `${data.tauxPresence}%` }} />
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/50"><CalendarDays size={13} />Taux de présence</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {data.seancesTerm.length === 0 && <p className="text-xs text-ink/45">Aucune séance terminée.</p>}
                    {data.seancesTerm.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                        <span className="truncate text-ink/70">{s.titre} · {fmtDate(s.date)}</span>
                        {s.presences && s.presences[sel.id]
                          ? <Badge tone="green"><UserCheck size={12} className="mr-1" />Présent</Badge>
                          : <Badge tone="red">Absent</Badge>}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Mouvements */}
                <Card title="Mouvements de caisse" subtitle={`${data.mv.length} opération(s) liée(s)`} pad={false} className="xl:col-span-2">
                  <div className="p-3">
                    {data.mv.length === 0 && <EmptyState icon={<ArrowLeftRight size={26} />} title="Aucun mouvement" />}
                    <Table
                      columns={[
                        { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
                        { key: 'type', label: 'Type', render: r => <span className="font-semibold">{r.type}</span> },
                        { key: 'compte', label: 'Compte', render: r => <Badge tone="gray">{r.compte}</Badge> },
                        { key: 'montant', label: 'Montant', render: r => <span className="font-bold">{fmtXAF(r.montant)}</span> },
                        { key: 'sens', label: 'Sens', render: r => r.sens === 'in' ? <Badge tone="green">Entrée</Badge> : <Badge tone="amber">Sortie</Badge> },
                      ]}
                      rows={data.mv} />
                  </div>
                </Card>

                {/* Notifications */}
                <Card title="Dernières notifications" subtitle="Communication reçue par le membre" pad={false} className="xl:col-span-2">
                  <div className="p-3">
                    {data.notifs.length === 0 && <EmptyState icon={<Bell size={26} />} title="Aucune notification" />}
                    {data.notifs.map((n, i) => (
                      <RowItem key={n.id || i} icon={<Bell size={18} />} title={n.titre}
                        sub={`${n.message} · ${fmtDate((n.date || '').slice(0, 10))}`}
                        right={n.lu ? <Badge tone="gray">Lue</Badge> : <Badge tone="brand" dot>Nouvelle</Badge>} />
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const clsRow = (active) => [
  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors cursor-pointer',
  active ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-black/[.03]',
].join(' ')

function CircleCheckIcon() {
  return <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-100 text-brand-600"><Check size={11} /></span>
}
