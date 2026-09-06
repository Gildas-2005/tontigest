import { useState } from 'react'
import { useStore, useAuth } from '../lib/store'
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Select, Textarea, Stat, Tabs, Avatar, statusTone, EmptyState, RowItem } from '../components/ui'
import { fmtDate, fmtDateTime, today, now, uid, byId, pct, daysBetween } from '../lib/utils'

/* Export CSV réutilisable (Blob + lien de téléchargement) */
function downloadCSV(nomFichier, lignes) {
  const csv = lignes.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  a.click()
  URL.revokeObjectURL(url)
}

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
    downloadCSV('liste-membres.csv', [['Nom', 'Téléphone', 'Statut'], ...db.membres.map(m => [m.nom, m.tel, m.statut])])
    toast('Liste des membres exportée en CSV')
  }
  const convoquerProchaine = () => {
    if (!prochaine) return toast('Aucune séance planifiée à convoquer', 'error')
    const message = `Convocation : la séance « ${prochaine.titre} » aura lieu le ${fmtDate(prochaine.date)} à ${prochaine.lieu}. Votre présence est attendue.`
    setDb(d => ({
      ...d,
      convocations: [{ id: uid('cv'), seanceId: prochaine.id, canal: 'WhatsApp', message, date: now(), envoyees: actifs.length }, ...(d.convocations || [])],
      notifications: [...d.notifications, ...actifs.map(m => ({ id: uid('nt'), pour: m.id, titre: 'Convocation à la séance', message, lu: false, date: now() }))],
    }))
    toast(`${actifs.length} convocations envoyées pour la séance du ${fmtDate(prochaine.date)} 📨`)
  }
  const rappelMasse = () => {
    if (!prochaine) return toast('Aucune séance planifiée', 'error')
    const message = `Rappel : la séance « ${prochaine.titre} » se tiendra le ${fmtDate(prochaine.date)} à ${prochaine.lieu}.`
    setDb(d => ({
      ...d,
      notifsMasse: [{ id: uid('nm'), message, canal: 'WhatsApp', date: today(), cible: 'Tous les membres' }, ...d.notifsMasse],
      notifications: [...d.notifications, ...actifs.map(m => ({ id: uid('nt'), pour: m.id, titre: 'Rappel de séance', message, lu: false, date: now() }))],
    }))
    toast('Rappel de séance diffusé à tous les membres 📣')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord — Secrétariat"
        sub={`Bienvenue ${user.nom.split(' ')[0]}, pilotez séances, convocations, parrainages et réclamations (UC35 · UC38 · UC40 · UC41).`}
        actions={<Badge tone="gold" dot>{db.tontine.nom}</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Prochaine séance" value={prochaine ? `J-${jRestants >= 0 ? jRestants : 0}` : '—'}
          sub={prochaine ? `${prochaine.titre} · ${fmtDate(prochaine.date)}` : 'Aucune séance planifiée'} icon="📅" tone="brand" />
        <Stat label="Présence — dernière séance" value={`${tauxPres}%`}
          sub={derniere ? derniere.titre : 'Aucune séance terminée'} icon="✋" tone="gold" />
        <Stat label="PV générés" value={pvGeneres} sub={`${db.seances.length} séance(s) au total`} icon="📝" tone="violet" />
        <Stat label="Réclamations ouvertes" value={ouvertes.length} sub="À traiter par le secrétariat" icon="📬" tone={ouvertes.length ? 'red' : 'blue'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Séances à venir" subtitle="Séances planifiées par ordre chronologique" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {planifiees.length === 0 && <EmptyState icon="📅" title="Aucune séance planifiée" sub="Créez une séance depuis l'onglet Calendrier." />}
            {planifiees.map((s, i) => (
              <RowItem key={s.id} icon={i === 0 ? '🔔' : '📅'} title={s.titre}
                sub={`${fmtDate(s.date)} · ${s.lieu}`}
                right={i === 0 ? <Badge tone="blue" dot>Imminente</Badge> : <Badge tone="gray">Planifiée</Badge>} />
            ))}
          </div>
        </Card>

        <Card title="Actions rapides" subtitle="Raccourcis du secrétariat" className="lg:col-span-2">
          <div className="space-y-3">
            <Button className="w-full" icon="📨" onClick={convoquerProchaine}>Envoyer les convocations</Button>
            <Button variant="outline" className="w-full" icon="📣" onClick={rappelMasse}>Diffuser un rappel de séance</Button>
            <Button variant="outline" className="w-full" icon="📄" onClick={exporterMembres}>Exporter la liste des membres</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================ SÉANCES (UC35 · UC36 · UC37) ============================ */
export function SeancesPage() {
  const { db, setDb, toast } = useStore()
  const [tab, setTab] = useState('calendrier')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ titre: '', date: '', lieu: '' })
  const [cibleId, setCibleId] = useState('')
  const [pvDrafts, setPvDrafts] = useState({})

  const triees = [...db.seances].sort((a, b) => b.date.localeCompare(a.date))
  const planifiees = db.seances.filter(s => s.statut === 'Planifiée').sort((a, b) => a.date.localeCompare(b.date))

  const creer = () => {
    if (!form.titre || !form.date || !form.lieu) return toast('Titre, date et lieu sont obligatoires', 'error')
    setDb(d => ({ ...d, seances: [...d.seances, { id: uid('se'), ...form, statut: 'Planifiée', pv: null, presences: {} }] }))
    setOpen(false); setForm({ titre: '', date: '', lieu: '' })
    toast('Séance planifiée et enregistrée au calendrier 📅')
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
  const validerAppel = () => {
    if (!cible) return
    toast(`Appel validé — ${presents} présent(s), ${absents} absent(s) pour « ${cible.titre} » ✅`)
  }

  /* --- PV & listes --- */
  const terminees = triees.filter(s => s.statut === 'Terminée')
  const enregistrerPV = (s) => {
    const texte = (pvDrafts[s.id] || '').trim()
    if (texte.length < 10) return toast('Le procès-verbal est trop court (10 caractères minimum)', 'error')
    setDb(d => ({ ...d, seances: d.seances.map(x => x.id === s.id ? { ...x, pv: texte } : x) }))
    toast(`PV de la séance « ${s.titre} » généré et archivé 📝`)
  }
  const exporterPresences = (s) => {
    downloadCSV(`presences-${s.date}.csv`, [
      ['N°', 'Membre', 'Téléphone', 'Présence'],
      ...db.membres.map((m, i) => [i + 1, m.nom, m.tel, s.presences?.[m.id] ? 'Présent' : 'Absent']),
    ])
    toast(`Liste de présence « ${s.titre} » exportée en CSV`)
  }

  return (
    <div>
      <PageHeader title="Séances & pointage" sub="Planifiez les séances, faites l'appel, générez les PV et listes de présence (UC35 · UC36 · UC37)."
        actions={tab === 'calendrier' && <Button icon="＋" onClick={() => setOpen(true)}>Nouvelle séance</Button>} />
      <div className="mb-5"><Tabs active={tab} onChange={setTab} tabs={[
        { id: 'calendrier', label: 'Calendrier' },
        { id: 'pointage', label: 'Pointage' },
        { id: 'pv', label: 'PV & Listes' },
      ]} /></div>

      {tab === 'calendrier' && (
        <Card pad={false}>
          <div className="p-3">
            {triees.length === 0 && <EmptyState icon="📅" title="Aucune séance" sub="Créez votre première séance." />}
            {triees.map(s => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-50/60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-base">{s.statut === 'Terminée' ? '✅' : '📅'}</span>
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
        !cible ? <EmptyState icon="✋" title="Aucune séance à pointer" sub="Planifiez d'abord une séance." /> : (
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
              actions={<Button variant="gold" icon="✅" onClick={validerAppel}>Valider l'appel</Button>}>
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
          {terminees.length === 0 && <EmptyState icon="📝" title="Aucune séance terminée" sub="Le PV se génère après la tenue de la séance." />}
          {terminees.map(s => (
            <Card key={s.id} title={s.titre} subtitle={`${fmtDate(s.date)} · ${s.lieu}`}>
              {!s.pv ? (
                <div className="space-y-3">
                  <Field label="Rédiger le procès-verbal" hint="Ordre du jour, délibérations, décisions et clôture.">
                    <Textarea className="min-h-32" value={pvDrafts[s.id] || ''} onChange={e => setPvDrafts(d => ({ ...d, [s.id]: e.target.value }))}
                      placeholder="Ordre du jour : … Délibérations : … Décisions : …" />
                  </Field>
                  <Button icon="📝" onClick={() => enregistrerPV(s)}>Générer le PV</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="print-area rounded-2xl border border-black/10 bg-white p-6">
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-700">{db.tontine.nom} — {db.tontine.ville}</p>
                      <h3 className="mt-1 font-display text-lg font-semibold">Procès-verbal — {s.titre}</h3>
                      <p className="text-xs text-ink/50">Tenu le {fmtDate(s.date)} · {s.lieu}</p>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{s.pv}</p>
                    <p className="mt-6 text-right text-xs text-ink/50">Fait à {db.tontine.ville.split('—')[0].trim()}, le {fmtDate(today())}<br />Le Secrétaire</p>
                  </div>

                  <div className="print-area rounded-2xl border border-black/10 bg-white p-6">
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

                  <div className="flex flex-wrap gap-2 no-print">
                    <Button variant="outline" icon="🖨" onClick={() => { window.print(); toast('Document envoyé à l\'impression (PDF)') }}>Exporter PDF</Button>
                    <Button variant="outline" icon="📊" onClick={() => exporterPresences(s)}>Exporter Excel/CSV</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle séance" subtitle="La séance sera visible par tous les membres (UC35)"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={creer}>Planifier</Button></>}>
        <div className="space-y-4">
          <Field label="Titre"><Input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex : Séance mensuelle d'Octobre" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Lieu"><Input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Ex : Salle paroissielle St-Paul" /></Field>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================ CONVOCATIONS (UC38) ============================ */
export function ConvocationsPage() {
  const { db, setDb, toast } = useStore()
  const [form, setForm] = useState({ seanceId: '', canal: 'WhatsApp', message: '' })
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
  const envoyer = () => {
    if (!form.seanceId) return toast('Sélectionnez d\'abord une séance', 'error')
    if (form.message.trim().length < 5) return toast('Le message de convocation est trop court', 'error')
    const seance = byId(db.seances, form.seanceId)
    setDb(d => ({
      ...d,
      convocations: [{ id: uid('cv'), seanceId: form.seanceId, canal: form.canal, message: form.message, date: now(), envoyees: actifs.length }, ...(d.convocations || [])],
      notifications: [...d.notifications, ...actifs.map(m => ({ id: uid('nt'), pour: m.id, titre: 'Convocation à la séance', message: form.message, lu: false, date: now() }))],
    }))
    setForm({ seanceId: '', canal: 'WhatsApp', message: '' })
    toast(`${actifs.length} convocations envoyées via ${form.canal} pour « ${seance?.titre} » 📨`)
  }

  return (
    <div>
      <PageHeader title="Convocations" sub="Convoquez les membres actifs à la prochaine séance par WhatsApp ou SMS (UC38)." />
      <div className="grid gap-5 lg:grid-cols-5 stagger">
        <Card title="Composer la convocation" className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="Séance concernée"><Select value={form.seanceId} onChange={e => choisir(e.target.value)}>
              <option value="">— Choisir une séance —</option>
              {planifiees.map(s => <option key={s.id} value={s.id}>{s.titre} — {fmtDate(s.date)}</option>)}
            </Select></Field>
            <Field label="Canal d'envoi"><Select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))} options={['WhatsApp', 'SMS']} /></Field>
            <Field label="Message" hint={`${form.message.length} caractères · destinataires : ${actifs.length} membre(s) actif(s)`}>
              <Textarea className="min-h-32" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Le message est pré-rempli dès que vous choisissez une séance…" />
            </Field>
            <Button variant="gold" className="w-full" icon="📨" onClick={envoyer}>Envoyer les convocations</Button>
          </div>
        </Card>
        <Card title="Historique des envois" subtitle="Convocations déjà diffusées" className="lg:col-span-3" pad={false}>
          <div className="p-3">
            {historique.length === 0 && <EmptyState icon="📨" title="Aucune convocation envoyée" sub="Les envois apparaîtront ici." />}
            {historique.map(c => {
              const s = byId(db.seances, c.seanceId)
              return (
                <RowItem key={c.id} icon={c.canal === 'WhatsApp' ? '💬' : '✉️'} title={s ? s.titre : 'Séance supprimée'}
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

/* ============================ PARRAINAGES (UC40) ============================ */
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
    toast(`Parrainage déclaré : ${filleul.nom} → ${parrain.nom} 🤝`)
  }

  return (
    <div>
      <PageHeader title="Parrainages" sub="Suivez le parrainage des nouveaux membres par les anciens (UC40)."
        actions={<Button icon="＋" onClick={() => setOpen(true)}>Déclarer un parrainage</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 stagger">
        <Stat label="Parrainages déclarés" value={db.parrainages.length} sub="Historique complet du cycle" icon="🤝" tone="brand" />
        <Stat label="Membres parrainés" value={`${parraines.size}/${db.membres.length}`} sub="Membres rattachés à un parrain" icon="👥" tone="gold" />
        <Stat label="En attente de parrain" value={sansParrain.length} sub="Membres actifs sans parrain" icon="⏳" tone={sansParrain.length ? 'red' : 'blue'} />
      </div>

      <Card className="mt-5" title="Registre des parrainages" subtitle="Filleul → parrain / parraine" pad={false}>
        <div className="p-3">
          {db.parrainages.length === 0 && <EmptyState icon="🤝" title="Aucun parrainage déclaré" />}
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
                <span className="text-gold-600">→</span>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Déclarer un parrainage" subtitle="Le membre est notifié de son parrain (UC40)"
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

/* ============================ RÉCLAMATIONS (UC41) ============================ */
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
    toast('Réponse envoyée — la réclamation passe « En cours » ✉️')
  }
  const resoudre = (r) => {
    setDb(d => ({ ...d, reclamations: d.reclamations.map(x => x.id === r.id ? { ...x, statut: 'Résolue' } : x) }))
    if (sel?.id === r.id) setSel(null)
    toast(`Réclamation « ${r.sujet} » marquée résolue ✅`)
  }

  const ouvertes = db.reclamations.filter(r => r.statut === 'Ouverte')
  return (
    <div>
      <PageHeader title="Réclamations" sub="Réceptionnez, traitez et résolvez les réclamations des membres (UC41)."
        actions={<Badge tone={ouvertes.length ? 'red' : 'green'} dot={!!ouvertes.length}>{ouvertes.length} ouverte(s)</Badge>} />
      <Card pad={false}>
        <div className="p-3">
          {db.reclamations.length === 0 && <EmptyState icon="📬" title="Aucune réclamation" sub="Les doléances des membres apparaîtront ici." />}
          {[...db.reclamations].sort((a, b) => b.date.localeCompare(a.date)).map(r => {
            const m = byId(db.membres, r.membreId)
            return (
              <RowItem key={r.id} icon={r.statut === 'Résolue' ? '✅' : '📬'} onClick={() => ouvrir(r)}
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

/* ============================ ARCHIVES (UC42) ============================ */
export function ArchivesPage() {
  const { db, toast } = useStore()
  const terminees = [...db.seances].filter(s => s.statut === 'Terminée').sort((a, b) => b.date.localeCompare(a.date))
  const rapportsValides = db.rapports.filter(r => r.statut === 'Validé')

  const imprimer = (quoi) => { window.print(); toast(`« ${quoi} » envoyé à l'impression (PDF)`) }

  const archives = [
    {
      id: 'pv', titre: 'PV de séances', icon: '📝', sub: `${terminees.filter(s => s.pv).length} procès-verbal(aux) archivé(s)`,
      csv: () => {
        downloadCSV('archives-pv.csv', [['Séance', 'Date', 'Lieu', 'Procès-verbal'], ...terminees.map(s => [s.titre, s.date, s.lieu, s.pv || 'Non généré'])])
        toast('Archive des PV exportée en CSV')
      },
      body: terminees.length === 0 ? <EmptyState icon="📝" title="Aucun PV archivé" /> : terminees.map(s => (
        <div key={s.id} className="border-b border-black/5 py-3 last:border-0">
          <p className="text-sm font-semibold">{s.titre} <span className="ml-1 text-xs font-normal text-ink/50">— {fmtDate(s.date)} · {s.lieu}</span></p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink/65">{s.pv || 'PV non encore généré.'}</p>
        </div>
      )),
    },
    {
      id: 'presences', titre: 'Listes de présence', icon: '✋', sub: `${terminees.length} séance(s) avec feuille d'émargement`,
      csv: () => {
        downloadCSV('archives-presences.csv', [['Séance', 'Date', 'Membre', 'Présence'],
          ...terminees.flatMap(s => db.membres.map(m => [s.titre, s.date, m.nom, s.presences?.[m.id] ? 'Présent' : 'Absent']))])
        toast('Archive des présences exportée en CSV')
      },
      body: terminees.length === 0 ? <EmptyState icon="✋" title="Aucune liste archivée" /> : terminees.map(s => {
        const pres = db.membres.filter(m => s.presences?.[m.id]).length
        return (
          <RowItem key={s.id} icon="✋" title={s.titre} sub={`${fmtDate(s.date)} · ${pres}/${db.membres.length} présent(s)`}
            right={<Badge tone={pct(pres, db.membres.length) >= 80 ? 'green' : 'amber'}>{pct(pres, db.membres.length)}%</Badge>} />
        )
      }),
    },
    {
      id: 'rapports', titre: 'Rapports financiers validés', icon: '📊', sub: `${rapportsValides.length} rapport(s) validé(s) par le bureau`,
      csv: () => {
        downloadCSV('archives-rapports.csv', [['Période', 'Type', 'Statut', 'Auteur', 'Date', 'Résumé'],
          ...rapportsValides.map(r => [r.periode, r.type, r.statut, r.auteur, r.date, r.resume])])
        toast('Archive des rapports validés exportée en CSV')
      },
      body: rapportsValides.length === 0 ? <EmptyState icon="📊" title="Aucun rapport validé" sub="Les rapports validés par le bureau seront archivés ici." /> : rapportsValides.map(r => (
        <RowItem key={r.id} icon="📊" title={`Rapport ${r.type} — ${r.periode}`} sub={`Par ${r.auteur} · ${fmtDate(r.date)}`}
          right={<Badge tone="green">Validé</Badge>} />
      )),
    },
    {
      id: 'membres', titre: 'Listes des membres', icon: '👥', sub: `${db.membres.length} membre(s) — contacts et statuts`,
      csv: () => {
        downloadCSV('liste-membres.csv', [['Nom', 'Téléphone', 'Statut'], ...db.membres.map(m => [m.nom, m.tel, m.statut])])
        toast('Liste des membres exportée en CSV')
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
      <PageHeader title="Archives" sub="Consultez, imprimez (PDF) et exportez (Excel/CSV) les documents officiels du club (UC42)." />
      <div className="grid gap-5 lg:grid-cols-2 stagger">
        {archives.map(a => (
          <Card key={a.id} title={`${a.icon} ${a.titre}`} subtitle={a.sub} pad={false}
            actions={
              <div className="no-print flex gap-2">
                <Button size="sm" variant="outline" icon="🖨" onClick={() => imprimer(a.titre)}>Exporter PDF</Button>
                <Button size="sm" variant="outline" icon="📊" onClick={a.csv}>Exporter Excel/CSV</Button>
              </div>
            }>
            <div className="print-area p-5">{a.body}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
