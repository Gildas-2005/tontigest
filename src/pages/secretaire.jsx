import { useState } from 'react'
import { api } from '../lib/api'
import { useStore, useAuth } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem } from '../components/ui'
import { fmtDate, fmtDateTime, today, now, uid, byId, pct, daysBetween, runValidators, vRequired } from '../lib/utils'
import { pdfMembres, pdfPresences, pdfPV, pdfArchive } from '../lib/pdf'
import {
  CalendarDays, Bell, Hand, ListChecks, Inbox, Send, Megaphone, FileText,
  MessageSquare, Mail, Users, Handshake, Timer, CircleCheck, Plus, ArrowRight,
  Printer, ChartColumn, UserCheck, FileDown,
} from '../components/icons'

/* ============================ ACCUEIL SECRÉTARIAT ============================ */
export function SecretariatHome() {
  const { db, setDb, toast } = useStore()
  const { user } = useAuth()
  const aujourdhui = today()
  const planifiees = db.seances.filter(s => s.statut === 'Planifiée').sort((a, b) => a.date.localeCompare(b.date))
  const prochaine = planifiees.find(s => s.date >= aujourdhui) || planifiees[0]
  const jRestants = prochaine ? daysBetween(aujourdhui, prochaine.date) : null
  const derniere = [...db.seances].filter(s => s.statut === 'Terminée').sort((a, b) => b.date.localeCompare(a.date))[0]
  const tauxPres = derniere ? pct(Object.values(derniere.presences || {}).filter(Boolean).length, db.membres.length) : 0
  const pvGeneres = db.seances.filter(s => s.pv).length
  const ouvertes = db.reclamations.filter(r => r.statut !== 'Résolue')
  const actifs = db.membres.filter(m => m.statut === 'Actif')

  const exporterMembres = () => {
    pdfMembres({ club: db.tontine, membres: db.membres })
    toast('Liste des membres exportée en PDF')
  }
  const convoquerProchaine = () => {
    if (!prochaine) return toast('Aucune séance planifiée à convoquer', 'error')
    const message = `Convocation : la séance « ${prochaine.titre} » aura lieu le ${fmtDate(prochaine.date)} à ${prochaine.lieu}. Votre présence est attendue.`
    setDb(d => ({
      ...d,
      convocations: [{ id: uid('cv'), seanceId: prochaine.id, canal: 'WhatsApp', message, date: now(), envoyees: actifs.length }, ...(d.convocations || [])],
      notifications: [...d.notifications, ...actifs.map(m => ({ id: uid('nt'), pour: m.id, titre: 'Convocation à la séance', message, lu: false, date: now() }))],
    }))
    toast(`${actifs.length} convocations envoyées pour la séance du ${fmtDate(prochaine.date)}`)
  }
  const rappelMasse = () => {
    if (!prochaine) return toast('Aucune séance planifiée', 'error')
    const message = `Rappel : la séance « ${prochaine.titre} » se tiendra le ${fmtDate(prochaine.date)} à ${prochaine.lieu}.`
    setDb(d => ({
      ...d,
      notifsMasse: [{ id: uid('nm'), message, canal: 'WhatsApp', date: today(), cible: 'Tous les membres' }, ...d.notifsMasse],
      notifications: [...d.notifications, ...actifs.map(m => ({ id: uid('nt'), pour: m.id, titre: 'Rappel de séance', message, lu: false, date: now() }))],
    }))
    toast('Rappel de séance diffusé à tous les membres')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord — Secrétariat"
        sub={`Bienvenue ${user.nom.split(' ')[0]}, pilotez séances, convocations, parrainages et réclamations.`}
        actions={<Badge tone="gold" dot>{db.tontine.nom}</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Prochaine séance" value={prochaine ? `J-${jRestants >= 0 ? jRestants : 0}` : '—'}
          sub={prochaine ? `${prochaine.titre} · ${fmtDate(prochaine.date)}` : 'Aucune séance planifiée'} icon={<CalendarDays size={18} />} tone="brand" />
        <Stat label="Présence — dernière séance" value={`${tauxPres}%`}
          sub={derniere ? derniere.titre : 'Aucune séance terminée'} icon={<UserCheck size={18} />} tone="gold" />
        <Stat label="PV générés" value={pvGeneres} sub={`${db.seances.length} séance(s) au total`} icon={<ListChecks size={18} />} tone="brand" />
        <Stat label="Réclamations ouvertes" value={ouvertes.length} sub="À traiter par le secrétariat" icon={<Inbox size={18} />} tone={ouvertes.length ? 'red' : 'blue'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Séances à venir" subtitle="Séances planifiées par ordre chronologique" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {planifiees.length === 0 && <EmptyState icon={<CalendarDays size={16} />} title="Aucune séance planifiée" sub="Créez une séance depuis l'onglet Calendrier." />}
            {planifiees.map((s, i) => (
              <RowItem key={s.id} icon={i === 0 ? <Bell size={16} className="text-sky-600" /> : <CalendarDays size={16} className="text-ink/50" />} title={s.titre}
                sub={`${fmtDate(s.date)} · ${s.lieu}`}
                right={i === 0 ? <Badge tone="brand" dot>Imminente</Badge> : <Badge tone="gray">Planifiée</Badge>} />
            ))}
          </div>
        </Card>

        <Card title="Actions rapides" subtitle="Raccourcis du secrétariat" className="lg:col-span-2">
          <div className="space-y-3">
            <Button className="w-full" icon={<Send size={16} />} onClick={convoquerProchaine}>Envoyer les convocations</Button>
            <Button variant="outline" className="w-full" icon={<Megaphone size={16} />} onClick={rappelMasse}>Diffuser un rappel de séance</Button>
            <Button variant="outline" className="w-full" icon={<FileText size={16} />} onClick={exporterMembres}>Exporter la liste des membres</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================ SÉANCES ============================ */
export function SeancesPage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('calendrier')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ titre: '', date: '', lieu: '', ordreJour: '' })
  const [errors, setErrors] = useState({})
  const [cibleId, setCibleId] = useState('')
  const [pvDrafts, setPvDrafts] = useState({})

  const triees = [...db.seances].sort((a, b) => b.date.localeCompare(a.date))
  const planifiees = db.seances.filter(s => s.statut === 'Planifiée').sort((a, b) => a.date.localeCompare(b.date))

  const validerSeance = (f) => runValidators(f, {
    titre: [vRequired('Le titre est obligatoire.'), v => v.trim().length < 4 ? 'Le titre doit faire au moins 4 caractères.' : ''],
    date: [vRequired('La date est obligatoire.'), v => String(v) < today() ? 'La date ne peut pas être dans le passé.' : ''],
    lieu: [vRequired('Le lieu est obligatoire.')],
  })

  const creer = () => {
    const errs = validerSeance(form)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return toast('Corrigez les champs signalés avant de planifier', 'error')
    setDb(d => ({
      ...d,
      seances: [...d.seances, { id: uid('se'), ...form, statut: 'Planifiée', pv: null, presences: {} }],
      // Notifier tous les membres actifs de la nouvelle séance.
      notifications: [...d.notifications, ...d.membres.filter(m => m.statut === 'Actif').map(m => ({
        id: uid('nt'), pour: m.id, titre: 'Nouvelle séance planifiée',
        message: `« ${form.titre} » le ${form.date}${form.lieu ? ` à ${form.lieu}` : ''}. Votre présence est attendue.`,
        lu: false, date: now(),
      }))],
    }))
    setOpen(false); setForm({ titre: '', date: '', lieu: '', ordreJour: '' }); setErrors({})
    toast('Séance planifiée — membres notifiés')
  }
  const marquerTerminee = (s) => {
    setDb(d => ({
      ...d,
      seances: d.seances.map(x => x.id === s.id
        ? { ...x, statut: 'Terminée', presences: x.presences && Object.keys(x.presences).length ? x.presences : Object.fromEntries(d.membres.map(m => [m.id, false])) }
        : x),
    }))
    toast(`Séance « ${s.titre} » marquée terminée — pensez à générer le PV`, 'info')
  }

  /* --- Pointage --- */
  const cible = db.seances.find(s => s.id === cibleId) || planifiees[0] || triees[0]
  const presents = cible ? db.membres.filter(m => cible.presences?.[m.id]).length : 0
  const absents = db.membres.length - presents
  const togglePresence = (mid) => {
    setDb(d => ({ ...d, seances: d.seances.map(x => x.id === cible.id ? { ...x, presences: { ...x.presences, [mid]: !x.presences?.[mid] } } : x) }))
  }
  /* Validation réelle de l'appel : trace (convocations) + notification aux absents. */
  const validerAppel = () => {
    if (!cible) return
    const absentsList = db.membres.filter(m => !cible.presences?.[m.id])
    setDb(d => ({
      ...d,
      convocations: [...d.convocations, {
        id: uid('cv'), seanceId: cible.id, canal: 'Appel validé',
        message: `Appel de la séance « ${cible.titre} » : ${presents} présent(s), ${absents} absent(s)`,
        envoyees: presents, date: now(),
      }],
      seances: d.seances.map(x => x.id === cible.id ? { ...x, statut: x.statut === 'Planifiée' ? 'Terminée' : x.statut, presences: x.id === cible.id && Object.keys(x.presences || {}).length === 0 ? Object.fromEntries(d.membres.map(m => [m.id, false])) : x.presences } : x),
      notifications: [...d.notifications, ...absentsList.map(m => ({
        id: uid('nt'), pour: m.id, titre: 'Absence constatée',
        message: `Votre absence à la séance « ${cible.titre} » du ${fmtDate(cible.date)} a été enregistrée au procès-verbal.`,
        lu: false, date: now(),
      }))],
    }))
    toast(`Appel validé et archivé — ${presents} présent(s), ${absents} absent(s)`)
  }

  /* --- PV & listes --- */
  const terminees = triees.filter(s => s.statut === 'Terminée')
  const enregistrerPV = (s) => {
    const texte = (pvDrafts[s.id] || '').trim()
    if (texte.length < 10) return toast('Le procès-verbal est trop court (10 caractères minimum)', 'error')
    setDb(d => ({ ...d, seances: d.seances.map(x => x.id === s.id ? { ...x, pv: texte } : x) }))
    toast(`PV de la séance « ${s.titre} » généré et archivé`)
  }
  const exporterPresences = (s) => {
    pdfPresences({ club: db.tontine, seance: s, membres: db.membres, presences: s.presences })
    toast(`Liste de présence « ${s.titre} » exportée en PDF`)
  }
  const exporterPV = (s) => {
    pdfPV({ club: db.tontine, seance: s, presencesCount: Object.values(s.presences || {}).filter(Boolean).length, total: db.membres.length })
    toast(`Procès-verbal « ${s.titre} » exporté en PDF`)
  }

  return (
    <div>
      <PageHeader title="Séances & pointage" sub="Planifiez les séances, faites l'appel, générez les PV et listes de présence."
        actions={tab === 'calendrier' && <Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Nouvelle séance</Button>} />
      <div className="mb-5"><Tabs active={tab} onChange={setTab} tabs={[
        { id: 'calendrier', label: 'Calendrier' },
        { id: 'pointage', label: 'Pointage' },
        { id: 'pv', label: 'PV & Listes' },
      ]} /></div>

      {tab === 'calendrier' && (
        <Card pad={false}>
          <div className="p-3">
            {triees.length === 0 && <EmptyState icon={<CalendarDays size={16} />} title="Aucune séance" sub="Créez votre première séance." />}
            {triees.map(s => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-50/60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50">{s.statut === 'Terminée' ? <CircleCheck size={18} className="text-brand-600" /> : <CalendarDays size={18} className="text-ink/45" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.titre}</p>
                  <p className="truncate text-xs text-ink/50">{fmtDate(s.date)} · {s.lieu}{s.pv ? ' · PV disponible' : ''}</p>
                </div>
                <Badge tone={statusTone(s.statut)} dot={s.statut === 'Planifiée'}>{s.statut}</Badge>
                {s.statut === 'Planifiée' && <Button size="sm" variant="outline" onClick={() => marquerTerminee(s)}>Marquer terminée</Button>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'pointage' && (
        !cible ? <EmptyState icon={<Hand size={16} />} title="Aucune séance à pointer" sub="Planifiez d'abord une séance." /> : (
          <div className="space-y-5">
            <Card title="Feuille d'appel" subtitle="Sélectionnez la séance puis pointez les présences">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Séance"><Select value={cible.id} onChange={e => setCibleId(e.target.value)}>
                  {triees.map(s => <option key={s.id} value={s.id}>{s.titre} — {fmtDate(s.date)}</option>)}
                </Select></Field>
                <Field label="Présents"><Input readOnly value={`${presents} membre(s)`} className="bg-brand-50 font-bold text-brand-700" /></Field>
                <Field label="Absents"><Input readOnly value={`${absents} membre(s)`} className="bg-red-50 font-bold text-red-700" /></Field>
              </div>
            </Card>
            <Card pad={false} title={`Membres — ${cible.titre}`} subtitle={`${fmtDate(cible.date)} · ${cible.lieu}`}
              actions={<Button variant="gold" icon={<CircleCheck size={16} />} onClick={validerAppel}>Valider l'appel</Button>}>
              <div className="p-3">
                {db.membres.map(m => {
                  const estLa = !!cible.presences?.[m.id]
                  return (
                    <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-brand-50/60">
                      <Avatar name={m.nom} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{m.nom}</p>
                        <p className="text-xs text-ink/50">{m.tel}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant={estLa ? 'primary' : 'outline'} onClick={() => togglePresence(m.id)}>Présent</Button>
                        <Button size="sm" variant={!estLa ? 'danger' : 'outline'} onClick={() => togglePresence(m.id)}>Absent</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )
      )}

      {tab === 'pv' && (
        <div className="space-y-5 stagger">
          {terminees.length === 0 && <EmptyState icon={<ListChecks size={16} />} title="Aucune séance terminée" sub="Le PV se génère après la tenue de la séance." />}
          {terminees.map(s => (
            <Card key={s.id} title={s.titre} subtitle={`${fmtDate(s.date)} · ${s.lieu}`}>
              {!s.pv ? (
                <div className="space-y-3">
                  <Field label="Rédiger le procès-verbal" hint="Ordre du jour, délibérations, décisions et clôture.">
                    <Textarea className="min-h-32" value={pvDrafts[s.id] || ''} onChange={e => setPvDrafts(d => ({ ...d, [s.id]: e.target.value }))}
                      placeholder="Ordre du jour : … Délibérations : … Décisions : …" />
                  </Field>
                  <Button icon={<ListChecks size={16} />} onClick={() => enregistrerPV(s)}>Générer le PV</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-black/10 bg-white p-6">
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-700">{db.tontine.nom} — {db.tontine.ville}</p>
                      <h3 className="mt-1 font-display text-lg font-semibold">Procès-verbal — {s.titre}</h3>
                      <p className="text-xs text-ink/50">Tenu le {fmtDate(s.date)} · {s.lieu}</p>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{s.pv}</p>
                    <p className="mt-6 text-right text-xs text-ink/50">Fait à {db.tontine.ville.split('—')[0].trim()}, le {fmtDate(today())}<br />Le Secrétaire</p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white p-6">
                    <h4 className="text-center font-display text-base font-semibold">Liste de présence — {s.titre}</h4>
                    <p className="text-center text-xs text-ink/50">{fmtDate(s.date)} · {s.lieu}</p>
                    <table className="mt-3 w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-brand-50">
                          <th className="border border-black/20 px-2 py-1.5 text-left">N°</th>
                          <th className="border border-black/20 px-2 py-1.5 text-left">Membre</th>
                          <th className="border border-black/20 px-2 py-1.5 text-left">Présence</th>
                          <th className="border border-black/20 px-2 py-1.5 text-left">Émargement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {db.membres.map((m, i) => (
                          <tr key={m.id}>
                            <td className="border border-black/20 px-2 py-2">{i + 1}</td>
                            <td className="border border-black/20 px-2 py-2">{m.nom}</td>
                            <td className="border border-black/20 px-2 py-2">{s.presences?.[m.id] ? 'Présent' : 'Absent'}</td>
                            <td className="border border-black/20 px-2 py-2" style={{ height: 26 }} />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" icon={<Printer size={16} />} onClick={() => exporterPV(s)}>Exporter le PV (PDF)</Button>
                    <Button variant="outline" icon={<FileDown size={16} />} onClick={() => exporterPresences(s)}>Exporter la feuille de présence (PDF)</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle séance" subtitle="La séance sera visible par tous les membres"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={creer}>Planifier</Button></>}>
        <div className="space-y-4">
          <Field label="Titre" required error={errors.titre}>
            <Input value={form.titre} error={errors.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex : Séance mensuelle d'Octobre" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required error={errors.date}>
              <Input type="date" min={today()} value={form.date} error={errors.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Lieu" required error={errors.lieu}>
              <Input value={form.lieu} error={errors.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Ex : Salle paroissiale St-Paul" />
            </Field>
          </div>
          <Field label="Ordre du jour" hint="Optionnel — sera repris dans le procès-verbal.">
            <Textarea value={form.ordreJour} onChange={e => setForm(f => ({ ...f, ordreJour: e.target.value }))}
              placeholder="Ex : Point des cotisations · Examens des demandes de prêt · Divers" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ CONVOCATIONS ============================ */
export function ConvocationsPage() {
  const { db, setDb, toast } = useStore()
  const [form, setForm] = useState({ seanceId: '', canal: 'In-app + email', message: '' })
  const [sending, setSending] = useState(false)
  const planifiees = db.seances.filter(s => s.statut === 'Planifiée').sort((a, b) => a.date.localeCompare(b.date))
  const actifs = db.membres.filter(m => m.statut === 'Actif')
  const historique = db.convocations || []

  const choisir = (id) => {
    const s = byId(db.seances, id)
    setForm(f => ({
      ...f, seanceId: id,
      message: s ? `Bonjour, la prochaine séance du club ${db.tontine.nom} (« ${s.titre} ») aura lieu le ${fmtDate(s.date)} à ${s.lieu}. Votre présence est vivement souhaitée. — Le Secrétariat` : f.message,
    }))
  }
  const envoyer = async () => {
    if (!form.seanceId) return toast('Sélectionnez d\'abord une séance', 'error')
    if (form.message.trim().length < 5) return toast('Le message de convocation est trop court', 'error')
    const seance = byId(db.seances, form.seanceId)
    setSending(true)

    /* 1. Notification in-app — toujours créée. */
    setDb(d => ({
      ...d,
      convocations: [{ id: uid('cv'), seanceId: form.seanceId, canal: form.canal, message: form.message, date: now(), envoyees: actifs.length }, ...(d.convocations || [])],
      notifications: [...d.notifications, ...actifs.map(m => ({ id: uid('nt'), pour: m.id, titre: 'Convocation à la séance', message: form.message, lu: false, date: now() }))],
    }))

    /* 2. Relais email/SMS via le serveur (notify.js) si configuré. */
    let relais = { email: 0, sms: 0 }
    try {
      const results = await Promise.allSettled(actifs.map(m =>
        api.notifyExternal({ email: m.email || null, tel: m.tel || null, titre: 'Convocation à une séance', message: form.message })))
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.channels) {
          if (r.value.channels.email) relais.email++
          if (r.value.channels.sms) relais.sms++
        }
      }
    } catch { /* relais best-effort */ }

    setSending(false)
    setForm({ seanceId: '', canal: 'In-app + email', message: '' })
    toast(`${actifs.length} convocation(s) in-app envoyée(s)` + (relais.email || relais.sms ? ` + relais externe (${relais.email} email(s), ${relais.sms} SMS)` : '') + ` pour « ${seance?.titre} »`)
  }

  return (
    <div>
      <PageHeader title="Convocations" sub="Convoquez les membres actifs à la prochaine séance — in-app toujours, email/SMS en relais si configurés." />
      <div className="grid gap-5 lg:grid-cols-5 stagger">
        <Card title="Composer la convocation" className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="Séance concernée"><Select value={form.seanceId} onChange={e => choisir(e.target.value)}>
              <option value="">— Choisir une séance —</option>
              {planifiees.map(s => <option key={s.id} value={s.id}>{s.titre} — {fmtDate(s.date)}</option>)}
            </Select></Field>
            <Field label="Relais externe" hint="L'in-app est toujours envoyée ; l'email/SMS part si les passerelles serveur sont configurées.">
              <Select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))} options={['In-app + email', 'In-app + SMS']} />
            </Field>
            <Field label="Message" hint={`${form.message.length} caractères · destinataires : ${actifs.length} membre(s) actif(s)`}>
              <Textarea className="min-h-32" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Le message est pré-rempli dès que vous choisissez une séance…" />
            </Field>
            <Button variant="gold" className="w-full" icon={<Send size={16} />} onClick={envoyer} disabled={sending}>{sending ? 'Envoi…' : 'Envoyer les convocations'}</Button>
          </div>
        </Card>
        <Card title="Historique des envois" subtitle="Convocations déjà diffusées" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {historique.length === 0 && <EmptyState icon={<Send size={16} />} title="Aucune convocation envoyée" sub="Les envois apparaîtront ici." />}
            {historique.map(c => {
              const s = byId(db.seances, c.seanceId)
              return (
                <RowItem key={c.id} icon={c.canal === 'In-app + SMS' ? <MessageSquare size={16} className="text-brand-600" /> : <Mail size={16} className="text-amber-600" />} title={s ? s.titre : 'Séance supprimée'}
                  sub={`${c.canal} · ${c.envoyees} destinataire(s) · ${fmtDateTime(c.date)}`}
                  right={<Badge tone="green">Envoyée</Badge>} />
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================ PARRAINAGES ============================ */
export function ParrainagePage() {
  const { db, setDb, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ membreId: '', parrainId: '' })
  const parraines = new Set(db.parrainages.map(p => p.membreId))
  const sansParrain = db.membres.filter(m => m.role === 'Membre' && m.statut === 'Actif' && !parraines.has(m.id))

  const declarer = () => {
    if (!form.membreId || !form.parrainId) return toast('Filleul et parrain sont obligatoires', 'error')
    if (form.membreId === form.parrainId) return toast('Un membre ne peut pas se parrainer lui-même', 'error')
    const filleul = byId(db.membres, form.membreId)
    const parrain = byId(db.membres, form.parrainId)
    setDb(d => ({
      ...d,
      parrainages: [...d.parrainages, { id: uid('pa'), membreId: form.membreId, parrainId: form.parrainId, date: today() }],
      notifications: [...d.notifications, { id: uid('nt'), pour: form.membreId, titre: 'Parrainage enregistré', message: `${parrain.nom} est désormais votre parrain/parraine au sein du club.`, lu: false, date: now() }],
    }))
    setOpen(false); setForm({ membreId: '', parrainId: '' })
    toast(`Parrainage déclaré : ${filleul.nom} est parrainé par ${parrain.nom}`)
  }

  return (
    <div>
      <PageHeader title="Parrainages" sub="Suivez le parrainage des nouveaux membres par les anciens."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Déclarer un parrainage</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Parrainages déclarés" value={db.parrainages.length} sub="Historique complet du cycle" icon={<Handshake size={18} />} tone="brand" />
        <Stat label="Membres parrainés" value={`${parraines.size}/${db.membres.length}`} sub="Membres rattachés à un parrain" icon={<Users size={18} />} tone="gold" />
        <Stat label="En attente de parrain" value={sansParrain.length} sub="Membres actifs sans parrain" icon={<Timer size={18} />} tone={sansParrain.length ? 'red' : 'blue'} />
      </div>

      <Card className="mt-5" title="Registre des parrainages" subtitle="Filleul → parrain / parraine" pad={false}>
        <div className="p-3">
          {db.parrainages.length === 0 && <EmptyState icon={<Handshake size={16} />} title="Aucun parrainage déclaré" />}
          {[...db.parrainages].reverse().map(p => {
            const filleul = byId(db.membres, p.membreId)
            const parrain = byId(db.membres, p.parrainId)
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-50/60">
                <Avatar name={filleul?.nom || '?'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{filleul?.nom || '—'}</p>
                  <p className="text-xs text-ink/50">Filleul · adhérent le {fmtDate(filleul?.dateAdhesion)}</p>
                </div>
                <ArrowRight size={14} className="text-gold-600" />
                <Avatar name={parrain?.nom || '?'} size="sm" ring />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{parrain?.nom || '—'}</p>
                  <p className="text-xs text-ink/50">Parrain / Parraine</p>
                </div>
                <Badge tone="gray">Déclaré le {fmtDate(p.date)}</Badge>
              </div>
            )
          })}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Déclarer un parrainage" subtitle="Le membre est notifié de son parrain"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={declarer}>Enregistrer</Button></>}>
        <div className="space-y-4">
          <Field label="Membre (filleul)"><Select value={form.membreId} onChange={e => setForm(f => ({ ...f, membreId: e.target.value }))}>
            <option value="">— Choisir —</option>
            {db.membres.filter(m => m.id !== form.parrainId).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </Select></Field>
          <Field label="Parrain / Parraine"><Select value={form.parrainId} onChange={e => setForm(f => ({ ...f, parrainId: e.target.value }))}>
            <option value="">— Choisir —</option>
            {db.membres.filter(m => m.statut === 'Actif' && m.id !== form.membreId).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </Select></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ RÉCLAMATIONS ============================ */
export function ReclamationsPage() {
  const { db, setDb, toast } = useStore()
  const [sel, setSel] = useState(null)
  const [reponse, setReponse] = useState('')

  const ouvrir = (r) => { setSel(r); setReponse(r.reponse || '') }
  const repondre = () => {
    if (reponse.trim().length < 5) return toast('La réponse est trop courte', 'error')
    setDb(d => ({
      ...d,
      reclamations: d.reclamations.map(x => x.id === sel.id ? { ...x, statut: 'En cours', reponse } : x),
      notifications: [...d.notifications, { id: uid('nt'), pour: sel.membreId, titre: 'Réponse à votre réclamation', message: reponse, lu: false, date: now() }],
    }))
    setSel(null)
    toast('Réponse envoyée — la réclamation passe « En cours »')
  }
  const resoudre = (r) => {
    setDb(d => ({
      ...d,
      reclamations: d.reclamations.map(x => x.id === r.id ? { ...x, statut: 'Résolue' } : x),
      notifications: [...d.notifications, { id: uid('nt'), pour: r.membreId, titre: 'Réclamation résolue', message: `Votre réclamation « ${r.sujet} » a été marquée résolue par le secrétariat.`, lu: false, date: now() }],
    }))
    if (sel?.id === r.id) setSel(null)
    toast(`Réclamation « ${r.sujet} » marquée résolue`)
  }

  const ouvertes = db.reclamations.filter(r => r.statut === 'Ouverte')
  return (
    <div>
      <PageHeader title="Réclamations" sub="Réceptionnez, traitez et résolvez les réclamations des membres."
        actions={<Badge tone={ouvertes.length ? 'red' : 'green'} dot={!!ouvertes.length}>{ouvertes.length} ouverte(s)</Badge>} />
      <Card pad={false}>
        <div className="p-3">
          {db.reclamations.length === 0 && <EmptyState icon={<Inbox size={16} />} title="Aucune réclamation" sub="Les doléances des membres apparaîtront ici." />}
          {[...db.reclamations].sort((a, b) => b.date.localeCompare(a.date)).map(r => {
            const m = byId(db.membres, r.membreId)
            return (
              <RowItem key={r.id} icon={r.statut === 'Résolue' ? <CircleCheck size={16} className="text-brand-600" /> : <Inbox size={16} className="text-ink/50" />} onClick={() => ouvrir(r)}
                title={r.sujet}
                sub={`${m?.nom || '—'} · ${fmtDate(r.date)}${r.reponse ? ' · répondu' : ''}`}
                right={<Badge tone={statusTone(r.statut)} dot={r.statut === 'Ouverte'}>{r.statut}</Badge>} />
            )
          })}
        </div>
      </Card>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.sujet || ''} subtitle={sel ? `${byId(db.membres, sel.membreId)?.nom || '—'} · reçue le ${fmtDate(sel.date)}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSel(null)}>Fermer</Button>
            {sel && sel.statut !== 'Résolue' && <><Button variant="outline" onClick={() => resoudre(sel)}>Marquer résolue</Button><Button onClick={repondre}>Répondre</Button></>}
          </>
        }>
        {sel && (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900">{sel.detail}</div>
            {sel.reponse && (
              <div className="rounded-xl border border-brand-200 bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Réponse du secrétariat</p>
                <p className="mt-1 text-sm text-ink/75">{sel.reponse}</p>
              </div>
            )}
            {sel.statut !== 'Résolue' && (
              <Field label="Réponse au membre" hint="La réponse est notifiée au membre et la réclamation passe « En cours ».">
                <Textarea className="min-h-28" value={reponse} onChange={e => setReponse(e.target.value)} placeholder="Ex : Votre signalement a été vérifié auprès du trésorier…" />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================ ARCHIVES ============================ */
export function ArchivesPage() {
  const { db, toast } = useStore()
  const terminees = [...db.seances].filter(s => s.statut === 'Terminée').sort((a, b) => b.date.localeCompare(a.date))
  const rapportsValides = db.rapports.filter(r => r.statut === 'Validé')

  const archives = [
    {
      id: 'pv', titre: 'PV de séances', icon: <ListChecks size={18} className="text-brand-600" />, sub: `${terminees.filter(s => s.pv).length} procès-verbal(aux) archivé(s)`,
      pdf: () => {
        pdfArchive({
          club: db.tontine, titre: 'PV de séances',
          sections: terminees.map(s => ({
            title: `${s.titre} — ${fmtDate(s.date)} · ${s.lieu}`,
            columns: [{ key: 'k', label: 'PV', width: 10 }],
            rows: [{ k: s.pv || 'PV non généré.' }],
          })),
        })
        toast('Archive des PV exportée en PDF')
      },
      body: terminees.length === 0 ? <EmptyState icon={<ListChecks size={16} />} title="Aucun PV archivé" /> : terminees.map(s => (
        <div key={s.id} className="border-b border-black/5 py-3 last:border-0">
          <p className="text-sm font-semibold">{s.titre} <span className="ml-1 text-xs font-normal text-ink/50">— {fmtDate(s.date)} · {s.lieu}</span></p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink/65">{s.pv || 'PV non encore généré.'}</p>
        </div>
      )),
    },
    {
      id: 'presences', titre: 'Listes de présence', icon: <UserCheck size={18} className="text-brand-600" />, sub: `${terminees.length} séance(s) avec feuille d'émargement`,
      pdf: () => {
        pdfArchive({
          club: db.tontine, titre: 'Listes de présence',
          sections: terminees.map(s => ({
            title: `${s.titre} — ${fmtDate(s.date)} · ${s.lieu}`,
            columns: [
              { key: 'nom', label: 'Membre', width: 2.6 },
              { key: 'present', label: 'Présence', width: 1.4, render: r => (s.presences?.[r.id] ? 'Présent' : 'Absent') },
            ],
            rows: db.membres,
          })),
        })
        toast('Archive des présences exportée en PDF')
      },
      body: terminees.length === 0 ? <EmptyState icon={<UserCheck size={16} />} title="Aucune liste archivée" /> : terminees.map(s => {
        const pres = db.membres.filter(m => s.presences?.[m.id]).length
        return (
          <RowItem key={s.id} icon={<UserCheck size={16} className="text-ink/50" />} title={s.titre} sub={`${fmtDate(s.date)} · ${pres}/${db.membres.length} présent(s)`}
            right={<Badge tone={pct(pres, db.membres.length) >= 80 ? 'green' : 'amber'}>{pct(pres, db.membres.length)}%</Badge>} />
        )
      }),
    },
    {
      id: 'rapports', titre: 'Rapports financiers validés', icon: <ChartColumn size={18} className="text-brand-600" />, sub: `${rapportsValides.length} rapport(s) validé(s) par le bureau`,
      pdf: () => {
        pdfArchive({
          club: db.tontine, titre: 'Rapports financiers validés',
          sections: [{
            title: 'Rapports validés',
            columns: [
              { key: 'periode', label: 'Période', width: 1.4 },
              { key: 'auteur', label: 'Auteur', width: 1.6 },
              { key: 'resume', label: 'Résumé', width: 4 },
            ],
            rows: rapportsValides,
          }],
        })
        toast('Archive des rapports validés exportée en PDF')
      },
      body: rapportsValides.length === 0 ? <EmptyState icon={<ChartColumn size={16} />} title="Aucun rapport validé" sub="Les rapports validés par le bureau seront archivés ici." /> : rapportsValides.map(r => (
        <RowItem key={r.id} icon={<ChartColumn size={16} className="text-ink/50" />} title={`Rapport ${r.type} — ${r.periode}`} sub={`Par ${r.auteur} · ${fmtDate(r.date)}`}
          right={<Badge tone="green">Validé</Badge>} />
      )),
    },
    {
      id: 'membres', titre: 'Liste des membres', icon: <Users size={18} className="text-brand-600" />, sub: `${db.membres.length} membre(s) — contacts et statuts`,
      pdf: () => {
        pdfMembres({ club: db.tontine, membres: db.membres })
        toast('Liste des membres exportée en PDF')
      },
      body: (
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-black/5">
            <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">Membre</th>
            <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">Téléphone</th>
            <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">Statut</th>
          </tr></thead>
          <tbody>
            {db.membres.map(m => (
              <tr key={m.id} className="border-b border-black/[.04] last:border-0">
                <td className="px-2 py-2 font-semibold">{m.nom}</td>
                <td className="px-2 py-2 text-ink/60">{m.tel}</td>
                <td className="px-2 py-2"><Badge tone={statusTone(m.statut)}>{m.statut}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Archives" sub="Consultez et téléchargez en PDF les documents officiels du club." />
      <div className="grid gap-5 lg:grid-cols-2 stagger">
        {archives.map(a => (
          <Card key={a.id} title={<span className="flex items-center gap-2">{a.icon} {a.titre}</span>} subtitle={a.sub} pad={false}
            actions={
              <Button size="sm" variant="outline" icon={<FileDown size={16} />} onClick={a.pdf}>Télécharger PDF</Button>
            }>
            <div className="p-5">{a.body}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
