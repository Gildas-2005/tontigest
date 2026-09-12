import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { PageHeader, Card, Button, Badge, Stat, Table, EmptyState, Input, Modal, Avatar } from '../components/ui'
import { Building2, Users, Wallet, ShieldCheck, Eye, Landmark, Search, UserCog, CalendarDays } from '../components/icons'
import { fmtXAF, fmtDate, fmtNum } from '../lib/utils'

const ROLE_LABEL = {
  President: 'Président(e)', Tresorier: 'Trésorier(ère)', Secretaire: 'Secrétaire',
  Commissaire: 'Commissaire aux comptes', Membre: 'Membre', SuperAdmin: 'Superadministrateur',
}

/* Payload JSON peut arriver en chaîne (TEXT Postgres) ou objet (mysql2). */
const parsePayload = (p) => {
  if (!p) return {}
  if (typeof p === 'string') { try { return JSON.parse(p) } catch { return {} } }
  return p
}

function useOverview() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    api.adminOverview().then(setData).catch(e => setErr(e.message))
  }, [])
  return { data, err, reload: () => api.adminOverview().then(setData).catch(e => setErr(e.message)) }
}

/* ============================ VUE GLOBALE ============================ */
export function AdminHome() {
  const { user } = useAuth()
  const { data, err, reload } = useOverview()

  useEffect(() => { const t = setTimeout(reload, 0); return () => clearTimeout(t) }, [reload])

  if (err) return <PageHeader title="Superadministration" sub={err} />
  if (!data) return <PageHeader title="Superadministration" sub="Chargement des données globales…" />

  const clubs = data.clubs || []
  const users = data.users || []
  const counts = data.counts || []
  const actifs = users.filter(u => u.role !== 'SuperAdmin' && u.statut !== 'Suspendu').length
  const suspendus = users.filter(u => u.statut === 'Suspendu').length

  /* Agrégats consolidés depuis counts (lignes records par club/entité). */
  const totalMembres = counts.filter(c => c.entity === 'members').reduce((s, c) => s + Number(c.n), 0)
  const totalCotisations = counts.filter(c => c.entity === 'cotisations').reduce((s, c) => s + Number(c.n), 0)

  const parRole = ['President', 'Tresorier', 'Secretaire', 'Commissaire', 'Membre'].map(r => ({
    label: ROLE_LABEL[r], value: users.filter(u => u.role === r).length,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Superadministration"
        sub={`Bonjour ${user?.nom?.split(' ')[0] || 'Admin'} — vue consolidée de tous les clubs et comptes de la plateforme.`}
        actions={<Badge tone="gold" dot><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Accès total</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Clubs" value={fmtNum(clubs.length)} sub={`${clubs.filter(c => c.statut === 'Active').length} tontine(s) démarrée(s)`} icon={<Building2 className="h-5 w-5" />} tone="brand" />
        <Stat label="Comptes actifs" value={fmtNum(actifs)} sub={suspendus ? `${suspendus} compte(s) suspendu(s)` : 'Tous opérationnels'} icon={<Users className="h-5 w-5" />} tone="gold" />
        <Stat label="Membres (fiches)" value={fmtNum(totalMembres)} sub="Toutes associations" icon={<UserCog className="h-5 w-5" />} tone="brand" />
        <Stat label="Suspendus" value={fmtNum(clubs.filter(c => c.statut === 'Suspendu').length + suspendus)} sub="Clubs + comptes" icon={<Landmark className="h-5 w-5" />} tone={suspendus ? 'red' : 'brand'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Répartition des rôles" subtitle="Comptes par fonction" pad={false}>
          <Table empty="Aucun compte" rows={parRole} keyField="label" columns={[
            { key: 'label', label: 'Rôle' },
            { key: 'value', label: 'Comptes', render: r => <span className="font-bold">{r.value}</span> },
          ]} />
        </Card>
        <Card title="Clubs récents" subtitle="Dernières associations créées" pad={false}
          actions={<Button size="sm" variant="ghost" onClick={reload}>Actualiser</Button>}>
          <Table empty="Aucun club" rows={clubs.slice(0, 6)} columns={[
            { key: 'nom', label: 'Club', render: r => <span className="font-semibold">{r.nom}</span> },
            { key: 'code', label: 'Code', render: r => <span className="font-mono text-xs text-ink/50">{r.code}</span> },
            { key: 'statut', label: 'Statut', render: r => <Badge tone={r.statut === 'Active' ? 'green' : r.statut === 'Suspendu' ? 'red' : 'amber'}>{r.statut === 'Suspendu' ? 'Suspendue' : r.statut === 'Preparation' ? 'En préparation' : 'Active'}</Badge> },
            { key: 'created_at', label: 'Créé le', render: r => fmtDate(String(r.created_at).slice(0, 10)) },
          ]} />
        </Card>
      </div>

      <Card title="Activité de la plateforme" subtitle="Volume de données consolidé — cotisations enregistrées toutes associations" pad={false}>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Cotisations enregistrées</p>
            <p className="mt-1 font-display text-2xl font-semibold text-brand-800">{fmtNum(totalCotisations)}</p>
            <p className="mt-1 text-[11px] text-ink/50">Toutes périodes, tous clubs</p>
          </div>
          <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Fiches membres totales</p>
            <p className="mt-1 font-display text-2xl font-semibold text-gold-700">{fmtNum(totalMembres)}</p>
            <p className="mt-1 text-[11px] text-ink/50">Y compris comptes non liés</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Comptes sans club</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{fmtNum(users.filter(u => !u.is_superadmin && !u.club_id).length)}</p>
            <p className="mt-1 text-[11px] text-ink/50">Inscriptions en attente d'association</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ============================ CLUBS ============================ */
export function AdminClubs() {
  const { data, err, reload } = useOverview()
  const [ouvert, setOuvert] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')

  const ouvrir = async (club) => {
    setOuvert(club); setDetail(null); setLoading(true)
    try { setDetail(await api.clubData(club.id)) }
    catch (e) { setDetail({ error: e.message }) }
    finally { setLoading(false) }
  }

  const basculer = async (club) => {
    const suspendre = club.statut !== 'Suspendu'
    if (!window.confirm(suspendre
      ? `Suspendre l'association « ${club.nom} » ? Tous ses membres ne pourront plus se connecter.`
      : `Réactiver l'association « ${club.nom} » ?`)) return
    const statut = suspendre ? 'Suspendu' : 'Active'
    try {
      await api.adminClubStatut(club.id, statut)
      setMsg(`Association « ${club.nom} » ${statut === 'Suspendu' ? 'suspendue' : 'réactivée'}.`)
      reload()
    } catch (e) { setMsg('Erreur : ' + e.message) }
  }

  if (err) return <PageHeader title="Clubs" sub={err} />
  const clubs = data?.clubs || []
  const filtered = clubs.filter(c => !search || `${c.nom} ${c.ville} ${c.code}`.toLowerCase().includes(search.toLowerCase()))

  const rec = detail?.records || {}
  const membres = rec.members || []
  const cotis = rec.cotisations || []
  /* Payload : chaîne JSON (TEXT) ou objet (mysql2) — parse robuste. */
  const validées = cotis.filter(c => parsePayload(c.payload)?.statut === 'Validée')
  const totalCotisé = validées.reduce((s, c) => s + (Number(parsePayload(c.payload)?.montant) || 0), 0)
  const club = detail?.club
  const clubPayload = parsePayload(club?.payload)
  const caisse = clubPayload?.caisse?.XAF || {}
  const tresor = Object.values(caisse).reduce((s, v) => s + (Number(v) || 0), 0)
  const seances = rec.seances || []

  return (
    <div className="space-y-6">
      <PageHeader title="Associations" sub="Consultez, suspendez ou réactivez les associations de la plateforme."
        actions={<Button variant="ghost" onClick={reload}>Actualiser</Button>} />
      {msg && <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">{msg}</div>}
      <Card pad={false}>
        <div className="border-b border-black/5 px-4 py-3">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un club (nom, ville, code)…" className="pl-9" />
          </div>
        </div>
        <Table empty="Aucun club" rows={filtered} columns={[
          { key: 'nom', label: 'Club', render: r => <span className="font-semibold">{r.nom}</span> },
          { key: 'ville', label: 'Ville' },
          { key: 'code', label: 'Code', render: r => <span className="font-mono text-xs text-ink/50">{r.code}</span> },
          { key: 'statut', label: 'Statut', render: r => <Badge tone={r.statut === 'Active' ? 'green' : r.statut === 'Suspendu' ? 'red' : 'amber'}>{r.statut === 'Suspendu' ? 'Suspendue' : r.statut === 'Active' ? 'Active' : 'En préparation'}</Badge> },
          { key: 'act', label: '', render: r => (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => ouvrir(r)}>Ouvrir</Button>
              <Button size="sm" variant={r.statut === 'Suspendu' ? 'primary' : 'danger'}
                onClick={() => basculer(r)}>{r.statut === 'Suspendu' ? 'Réactiver' : 'Suspendre'}</Button>
            </div>
          ) },
        ]} />
      </Card>

      <Modal open={!!ouvert} onClose={() => setOuvert(null)} wide
        title={`Aperçu — ${ouvert?.nom || ''}`}
        subtitle={loading ? 'Chargement des données du club…' : `${ouvert?.ville || ''} · code ${ouvert?.code || ''}`}>
        {loading && <EmptyState title="Chargement…" />}
        {detail?.error && <EmptyState title="Erreur" sub={detail.error} />}
        {detail && !detail.error && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Membres" value={fmtNum(membres.length)} sub="Fiches du club" icon={<Users className="h-5 w-5" />} tone="brand" />
              <Stat label="Trésorerie XAF" value={fmtXAF(tresor)} sub="Toutes caisses du club" icon={<Wallet className="h-5 w-5" />} tone="gold" />
              <Stat label="Cotisations validées" value={fmtNum(validées.length)} sub={`${fmtXAF(totalCotisé)} encaissés`} icon={<Landmark className="h-5 w-5" />} tone="brand" />
              <Stat label="Séances" value={fmtNum(seances.length)} sub="Vie du club" icon={<CalendarDays className="h-5 w-5" />} tone="brand" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="Détails caisse" subtitle="Soldes par compte (XAF)">
                {Object.keys(caisse).length === 0 ? (
                  <p className="text-sm text-ink/45">Aucune caisse initialisée.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(caisse).map(([compte, solde]) => (
                      <li key={compte} className="flex justify-between border-b border-black/5 py-1.5">
                        <span className="text-ink/60">{compte}</span>
                        <b>{fmtXAF(Number(solde) || 0)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Paramètres de la tontine" subtitle="Configuration du club">
                <ul className="space-y-1.5 text-xs">
                  <li className="flex justify-between border-b border-black/5 py-1.5"><span className="text-ink/60">Cotisation officielle</span><b>{fmtXAF(clubPayload?.montantCotisation ?? club?.montant_cotisation ?? 0)}</b></li>
                  <li className="flex justify-between border-b border-black/5 py-1.5"><span className="text-ink/60">Fréquence</span><b>{clubPayload?.frequence || club?.frequence || '—'}</b></li>
                  <li className="flex justify-between border-b border-black/5 py-1.5"><span className="text-ink/60">Pénalité de retard</span><b>{fmtXAF(clubPayload?.penaliteRetard ?? club?.penalite_retard ?? 0)}</b></li>
                  <li className="flex justify-between py-1.5"><span className="text-ink/60">Statut</span><Badge tone={club?.statut === 'Active' ? 'green' : 'amber'}>{club?.statut}</Badge></li>
                </ul>
              </Card>
            </div>

            <Card title="Membres du club" subtitle={`${membres.length} fiche(s)`} pad={false}>
              <Table empty="Aucune fiche membre" rows={membres} keyField="id" columns={[
                { key: 'nom', label: 'Membre', render: m => {
                  const p = parsePayload(m.payload)
                  return <span className="flex items-center gap-2"><Avatar name={p.nom || '?'} size="sm" /><span className="font-semibold">{p.nom || '—'}</span></span>
                } },
                { key: 'role', label: 'Rôle', render: m => <Badge tone="gray">{parsePayload(m.payload)?.role || '—'}</Badge> },
                { key: 'statut', label: 'Statut', render: m => {
                  const st = parsePayload(m.payload)?.statut
                  return <Badge tone={st === 'Actif' ? 'green' : 'amber'}>{st || '—'}</Badge>
                } },
              ]} />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================ UTILISATEURS ============================ */
export function AdminUsers() {
  const { data, err, reload } = useOverview()
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { const t = setTimeout(reload, 0); return () => clearTimeout(t) }, [reload])

  const basculer = async (u) => {
    const suspendre = u.statut !== 'Suspendu'
    if (!window.confirm(suspendre
      ? `Suspendre le compte de ${u.nom || u.email} ? Il ne pourra plus se connecter.`
      : `Réactiver le compte de ${u.nom || u.email} ?`)) return
    const statut = suspendre ? 'Suspendu' : 'Actif'
    try {
      await api.adminUserStatut(u.id, statut)
      setMsg(`Compte de ${u.email} ${statut === 'Suspendu' ? 'suspendu' : 'réactivé'}.`)
      reload()
    } catch (e) { setMsg('Erreur : ' + e.message) }
  }

  if (err) return <PageHeader title="Utilisateurs" sub={err} />
  const users = data?.users || []
  const clubs = Object.fromEntries((data?.clubs || []).map(c => [c.id, c.nom]))
  const filtered = users.filter(u => !search || `${u.nom} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <PageHeader title="Utilisateurs" sub="Tous les comptes de la plateforme — suspendez ou réactivez un accès."
        actions={<Button variant="ghost" onClick={reload}>Actualiser</Button>} />
      {msg && <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">{msg}</div>}
      <Card pad={false}>
        <div className="border-b border-black/5 px-4 py-3">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un compte (nom, email, rôle)…" className="pl-9" />
          </div>
        </div>
        <Table empty="Aucun utilisateur" rows={filtered} columns={[
          { key: 'nom', label: 'Nom', render: r => <span className="font-semibold">{r.nom || '—'}</span> },
          { key: 'email', label: 'Email', render: r => <span className="font-mono text-xs text-ink/60">{r.email}</span> },
          { key: 'role', label: 'Rôle', render: r => <Badge tone={r.is_superadmin ? 'gold' : r.role === 'President' ? 'green' : 'gray'}>{ROLE_LABEL[r.role] || r.role}</Badge> },
          { key: 'club_id', label: 'Club', render: r => r.is_superadmin ? <span className="text-ink/40">Plateforme</span> : (clubs[r.club_id] || <span className="text-ink/40">Aucun</span>) },
          { key: 'created_at', label: 'Inscrit le', render: r => fmtDate(String(r.created_at).slice(0, 10)) },
          { key: 'statut', label: 'Statut', render: r => r.is_superadmin ? <Badge tone="gold">Permanent</Badge> : (r.statut === 'Suspendu' ? <Badge tone="red">Suspendu</Badge> : <Badge tone="green">Actif</Badge>) },
          { key: 'act', label: '', render: r => r.is_superadmin ? null : (
            <Button size="sm" variant={r.statut === 'Suspendu' ? 'primary' : 'danger'} onClick={() => basculer(r)}>
              {r.statut === 'Suspendu' ? 'Réactiver' : 'Suspendre'}
            </Button>
          ) },
        ]} />
      </Card>
    </div>
  )
}
