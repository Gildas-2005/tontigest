import { useState } from 'react'
import { useStore, useAuth } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Select, Textarea, Stat, Table, statusTone, EmptyState, RowItem } from '../components/ui'
import { Donut, Bars, Legend } from '../components/charts'
import { fmtXAF, fmtDate, today, uid, sum, pct, monthKey, monthLabel } from '../lib/utils'

/* ============================ ACCUEIL AUDIT (UC43) ============================ */
export function AuditHome() {
  const { db } = useStore()
  const { user } = useAuth()
  const totalCaisse = sum(Object.values(db.caisse.XAF)) + sum(Object.values(db.caisse.EUR)) * 650
  const mois = monthKey()
  const mvMois = db.mouvements.filter(m => monthKey(m.date) === mois)
  const conformes = db.audits.filter(a => a.verdict === 'Conforme').length
  const anomalies = db.audits.filter(a => a.verdict === 'Anomalie').length
  const enAttente = db.rapports.filter(r => r.statut === 'Soumis').length

  const donutData = [
    { label: 'Conforme', value: conformes, color: '#17855a' },
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
        sub={`Bonjour ${user.nom.split(' ')[0]}, contrôlez mouvements, rapports et conformité du club (UC43).`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Trésor total" value={fmtXAF(totalCaisse)} sub="Caisse + banque + mobile money" icon="🏦" tone="brand" />
        <Stat label="Mouvements ce mois" value={mvMois.length} sub={`${fmtXAF(sum(mvMois, m => m.montant))} transités ce mois`} icon="🔁" tone="gold" />
        <Stat label="Anomalies détectées" value={anomalies} sub={`${conformes} mouvement(s) conforme(s) audité(s)`} icon="⚠️" tone={anomalies ? 'red' : 'blue'} />
        <Stat label="Rapports en attente" value={enAttente} sub="Rapports financiers soumis non validés" icon="📄" tone={enAttente ? 'violet' : 'blue'} />
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

      <Card title="Dernières alertes" subtitle="Signalements de fraude et d'anomalies (UC47)" pad={false}
        actions={<Badge tone={db.alertes.filter(a => a.statut === 'Nouvelle').length ? 'red' : 'green'}>{db.alertes.filter(a => a.statut === 'Nouvelle').length} nouvelle(s)</Badge>}>
        <div className="p-3">
          {db.alertes.length === 0 && <EmptyState icon="🛡️" title="Aucune alerte" sub="Aucune fraude ou anomalie signalée." />}
          {[...db.alertes].reverse().slice(0, 5).map(a => (
            <RowItem key={a.id} icon={a.type === 'Fraude' ? '🚨' : '⚠️'} title={a.message}
              sub={`${a.type} · par ${a.de} · ${fmtDate(a.date.slice(0, 10))}`}
              right={a.statut === 'Nouvelle' ? <Badge tone="red" dot>{a.statut}</Badge> : <Badge tone="green">Traitée</Badge>} />
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ============================ AUDIT DES TRANSACTIONS (UC44) ============================ */
export function AuditTransactionsPage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({ verdict: 'Conforme', note: '' })

  const recentes = [...db.mouvements].sort((a, b) => b.date.localeCompare(a.date))
  const auditer = () => {
    if (form.note.trim().length < 5) return toast('Ajoutez une note d\'audit (5 caractères minimum)', 'error')
    setDb(d => ({
      ...d,
      audits: [{ id: uid('au'), cible: `Mouvement ${sel.type} ${fmtXAF(sel.montant)} du ${fmtDate(sel.date)}`, verdict: form.verdict, note: form.note, date: today(), par: user.nom }, ...d.audits],
    }))
    setSel(null); setForm({ verdict: 'Conforme', note: '' })
    toast('Mouvement audité — verdict enregistré au registre ✅')
  }

  return (
    <div>
      <PageHeader title="Audit des transactions" sub="Contrôlez les mouvements récents et consignez vos verdicts (UC44)." />
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
              rows={recentes} />
          </div>
        </Card>

        <Card title="Registre des audits" subtitle="Verdicts consignés par le commissariat" pad={false}>
          <div className="p-3">
            {db.audits.length === 0 && <EmptyState icon="🔍" title="Aucun audit réalisé" sub="Auditez un mouvement pour commencer." />}
            {[...db.audits].reverse().map(a => (
              <RowItem key={a.id} icon={a.verdict === 'Conforme' ? '✅' : '⚠️'} title={a.cible}
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

/* ============================ RAPPORTS (UC45 · UC46) ============================ */
export function AuditRapportsPage() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const financiers = db.rapports.filter(r => r.type === 'Financier')
  const dernierAudit = [...db.rapports].filter(r => r.type === 'Audit').sort((a, b) => b.date.localeCompare(a.date))[0]

  const decider = (r, ok) => {
    setDb(d => ({ ...d, rapports: d.rapports.map(x => x.id === r.id ? { ...x, statut: ok ? 'Validé' : 'Rejeté' } : x) }))
    toast(ok ? `Rapport ${r.periode} validé par le commissariat ✅` : `Rapport ${r.periode} rejeté — retourné au trésorier`, ok ? 'success' : 'error')
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
    toast('Rapport d\'audit généré, signé et archivé 📄')
  }

  return (
    <div>
      <PageHeader title="Rapports financiers & d'audit" sub="Validez les rapports du trésorier et produisez votre rapport d'audit (UC45 · UC46)." />
      <div className="space-y-5">
        <Card title="Rapports financiers soumis" subtitle="Décision du commissaire aux comptes (UC45)" pad={false}>
          <div className="p-3">
            {financiers.length === 0 && <EmptyState icon="📊" title="Aucun rapport financier" />}
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

        <Card title="Générer le rapport d'audit" subtitle="Synthèse automatique de vos verdicts (UC46)"
          actions={<Button variant="gold" icon="📝" onClick={generer}>Générer le rapport d'audit</Button>}>
          {dernierAudit ? (
            <div className="space-y-4">
              <div className="print-area rounded-2xl border border-black/10 bg-white p-6">
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
              <div className="flex flex-wrap gap-2 no-print">
                <Button variant="outline" icon="🖨" onClick={() => { window.print(); toast('Rapport d\'audit envoyé à l\'impression (PDF)') }}>Exporter PDF</Button>
              </div>
            </div>
          ) : (
            <EmptyState icon="📄" title="Aucun rapport d'audit généré" sub="Le rapport synthétise automatiquement vos audits conformes et vos anomalies." />
          )}
        </Card>
      </div>
    </div>
  )
}

/* ============================ SIGNALEMENT FRAUDE (UC47) ============================ */
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
    toast('Le président a été alerté 🚨', form.type === 'Fraude' ? 'error' : 'info')
  }

  return (
    <div>
      <PageHeader title="Alerte fraude & anomalies" sub="Signalez immédiatement toute fraude ou anomalie au président (UC47)."
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
              icon={form.type === 'Fraude' ? '🚨' : '⚠️'} onClick={signaler}>Signaler au président</Button>
          </div>
        </Card>
        <Card title="Signalements transmis" subtitle="Historique des alertes du commissariat" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {db.alertes.length === 0 && <EmptyState icon="🛡️" title="Aucun signalement" sub="Vos alertes apparaîtront ici." />}
            {[...db.alertes].reverse().map(a => (
              <RowItem key={a.id} icon={a.type === 'Fraude' ? '🚨' : '⚠️'} title={a.message}
                sub={`${a.type} · par ${a.de} · ${fmtDate(a.date)}`}
                right={a.statut === 'Nouvelle' ? <Badge tone="red" dot>{a.statut}</Badge> : <Badge tone="green">Traitée</Badge>} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
