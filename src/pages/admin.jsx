import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { PageHeader, Card, Button, Badge, Stat, Table, EmptyState } from '../components/ui'
import { Building2, Users, Wallet, ShieldCheck, Eye, Landmark } from '../components/icons'
import { fmtXAF, fmtDate, fmtNum } from '../lib/utils'

const ROLE_LABEL = {
  President: 'Président(e)', Tresorier: 'Trésorier(ère)', Secretaire: 'Secrétaire',
  Commissaire: 'Commissaire aux comptes', Membre: 'Membre', SuperAdmin: 'Superadministrateur',
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
  const { data, err } = useOverview()
  const [dbStats, setDbStats] = useState(null)
  const [integr, setIntegr] = useState(null)
  useEffect(() => { api.adminDbStats().then(d => setDbStats(d.detail || null)).catch(() => setDbStats(null)) }, [])
  useEffect(() => { api.integrations().then(setIntegr).catch(() => setIntegr(null)) }, [])
  if (err) return <PageHeader title="Superadministration" sub={err} />
  if (!data) return <PageHeader title="Superadministration" sub="Chargement des données globales…" />

  const clubs = data.clubs || []
  const users = data.users || []
  const actifs = users.filter(u => u.role !== 'SuperAdmin' && u.statut !== 'Suspendu').length
  const suspendus = users.filter(u => u.statut === 'Suspendu').length
  const parRole = ['President', 'Tresorier', 'Secretaire', 'Commissaire', 'Membre'].map(r => ({
    label: ROLE_LABEL[r], value: users.filter(u => u.role === r).length,
  }))
  const tablesRemplies = dbStats ? dbStats.filter(t => t.rows > 0).length : 0
  const totalLignes = dbStats ? dbStats.reduce((s, t) => s + t.rows, 0) : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Superadministration"
        sub={`Bonjour ${user?.nom?.split(' ')[0] || 'Admin'} — vue consolidée de tous les clubs et comptes de la plateforme.`}
        actions={<Badge tone="gold" dot><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Accès total</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <Stat label="Clubs" value={fmtNum(clubs.length)} sub="Associations enregistrées" icon={<Building2 className="h-5 w-5" />} tone="brand" />
        <Stat label="Comptes actifs" value={fmtNum(actifs)} sub={suspendus ? `${suspendus} compte(s) suspendu(s)` : 'Tous opérationnels'} icon={<Users className="h-5 w-5" />} tone="gold" />
        <Stat label="Clubs actifs" value={fmtNum(clubs.filter(c => c.statut === 'Active').length)} sub="Tontines démarrées" icon={<Wallet className="h-5 w-5" />} tone="brand" />
        <Stat label="Suspendus" value={fmtNum(clubs.filter(c => c.statut === 'Suspendu').length + suspendus)} sub="Clubs + comptes" icon={<Landmark className="h-5 w-5" />} tone={suspendus ? 'red' : 'brand'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Répartition des rôles" subtitle="Comptes par fonction" pad={false}>
          <Table empty="Aucun compte" rows={parRole} keyField="label" columns={[
            { key: 'label', label: 'Rôle' },
            { key: 'value', label: 'Comptes', render: r => <span className="font-bold">{r.value}</span> },
          ]} />
        </Card>
        <Card title="Clubs récents" subtitle="Dernières associations créées" pad={false}>
          <Table empty="Aucun club" rows={clubs.slice(0, 6)} columns={[
            { key: 'nom', label: 'Club', render: r => <span className="font-semibold">{r.nom}</span> },
            { key: 'code', label: 'Code', render: r => <span className="font-mono text-xs text-ink/50">{r.code}</span> },
            { key: 'statut', label: 'Statut', render: r => <Badge tone={r.statut === 'Active' ? 'green' : r.statut === 'Suspendu' ? 'red' : 'amber'}>{r.statut === 'Suspendu' ? 'Suspendue' : r.statut === 'Preparation' ? 'En préparation' : 'Active'}</Badge> },
            { key: 'created_at', label: 'Créé le', render: r => fmtDate(String(r.created_at).slice(0, 10)) },
          ]} />
        </Card>
      </div>

      {integr && (
        <Card title="Intégrations externes" subtitle="État des passerelles — configurez les clés dans le fichier .env du serveur" pad={false}>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: 'payment', label: 'Paiement (GeniusPay)', desc: 'Orange Money, MoMo, cartes' },
              { key: 'email', label: 'Email (Mailjet)', desc: 'Notifications et 2FA par email' },
              { key: 'sms', label: 'SMS (Twilio)', desc: 'Notifications et 2FA par SMS' },
              { key: 'push', label: 'Push web (VAPID)', desc: 'Notifications navigateur' },
            ].map(it => {
              const live = integr[it.key]?.configured
              const badge = !live ? 'Non configuré' : (it.key === 'payment' && integr[it.key].sandbox ? 'Sandbox' : 'Actif')
              return (
                <div key={it.key} className={`rounded-2xl border p-4 ${live ? 'border-brand-200 bg-brand-50/60' : 'border-amber-200 bg-amber-50/50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">{it.label}</p>
                    <Badge tone={live ? 'green' : 'amber'} dot>{badge}</Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink/55">{it.desc}</p>
                </div>
              )
            })}
          </div>
          <p className="border-t border-black/5 px-5 py-3 text-[11px] leading-relaxed text-ink/45">
            Renseignez les clés dans <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px]">.env</code> (voir
            <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px]">.env.example</code>) puis redémarrez le serveur.
            Sans clé, la fonctionnalité reste en mode simulation — clairement affichée aux utilisateurs.
          </p>
        </Card>
      )}

      {dbStats && (
        <Card title="Base de données MySQL" subtitle={`Schéma relationnel complet — ${dbStats.length} tables, ${tablesRemplies} actives, ${fmtNum(totalLignes)} lignes au total`} pad={false}>
          <Table empty="Aucune table" rows={dbStats} keyField="table" columns={[
            { key: 'table', label: 'Table', render: r => <span className="font-mono text-xs font-semibold">{r.table}</span> },
            { key: 'rows', label: 'Lignes', render: r => <span className={r.rows > 0 ? 'font-bold text-brand-700' : 'text-ink/40'}>{fmtNum(r.rows)}</span> },
            { key: 'etat', label: 'État', render: r => <Badge tone={r.rows > 0 ? 'green' : 'gray'}>{r.rows > 0 ? 'Peuplée' : 'Vide'}</Badge> },
          ]} />
        </Card>
      )}
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

  const rec = detail?.records || {}
  const membres = rec.members || []
  const cotis = rec.cotisations || []
  const validées = cotis.filter(c => (c.payload?.statut) === 'Validée')
  const totalCotisé = validées.reduce((s, c) => s + (Number(c.payload?.montant) || 0), 0)
  const club = detail?.club
  const caisse = club?.payload?.caisse?.XAF || {}
  const tresor = Object.values(caisse).reduce((s, v) => s + (Number(v) || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Associations" sub="Consultez, suspendez ou réactivez les associations de la plateforme." />
      {msg && <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">{msg}</div>}
      <Card pad={false}>
        <Table empty="Aucun club" rows={clubs} columns={[
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

      {ouvert && (
        <Card title={`Aperçu — ${ouvert.nom}`} subtitle={loading ? 'Chargement des données du club…' : `${ouvert.ville} · code ${ouvert.code}`}>
          {loading && <EmptyState title="Chargement…" />}
          {detail?.error && <EmptyState title="Erreur" sub={detail.error} />}
          {detail && !detail.error && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Membres" value={fmtNum(membres.length)} sub="Comptes du club" icon={<Users className="h-5 w-5" />} tone="brand" />
              <Stat label="Trésorerie XAF" value={fmtXAF(tresor)} sub="Toutes caisses du club" icon={<Wallet className="h-5 w-5" />} tone="gold" />
              <Stat label="Cotisations validées" value={fmtNum(validées.length)} sub={`${fmtXAF(totalCotisé)} encaissés`} icon={<Landmark className="h-5 w-5" />} tone="brand" />
              <Stat label="Statut" value={club?.statut === 'Suspendu' ? 'Suspendue' : (club?.statut || '—')} sub={club?.ville || '—'} icon={<Building2 className="h-5 w-5" />} tone="brand" />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

/* ============================ UTILISATEURS ============================ */
export function AdminUsers() {
  const { data, err, reload } = useOverview()
  const [msg, setMsg] = useState('')

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

  return (
    <div className="space-y-6">
      <PageHeader title="Utilisateurs" sub="Tous les comptes de la plateforme — suspendez ou réactivez un accès." />
      {msg && <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">{msg}</div>}
      <Card pad={false}>
        <Table empty="Aucun utilisateur" rows={users} columns={[
          { key: 'nom', label: 'Nom', render: r => <span className="font-semibold">{r.nom || '—'}</span> },
          { key: 'email', label: 'Email', render: r => <span className="font-mono text-xs text-ink/60">{r.email}</span> },
          { key: 'role', label: 'Rôle', render: r => <Badge tone={r.is_superadmin ? 'gold' : r.role === 'President' ? 'green' : 'gray'}>{ROLE_LABEL[r.role] || r.role}</Badge> },
          { key: 'club_id', label: 'Club', render: r => r.is_superadmin ? <span className="text-ink/40">Plateforme</span> : (clubs[r.club_id] || <span className="text-ink/40">Aucun</span>) },
          { key: 'statut', label: 'Statut', render: r => r.is_superadmin ? <Badge tone="gold">Permanent</Badge> : (r.statut === 'Suspendu' ? <Badge tone="red">Suspendu</Badge> : <Badge tone="green">Actif</Badge>) },
          { key: 'act', label: '', render: r => r.is_superadmin ? null : (
            <Button size="sm" variant={r.statut === 'Suspendu' ? 'primary' : 'danger'} onClick={() => basculer(r)}>
              {r.statut === 'Suspendu' ? 'Réactiver' : 'Suspendre'}
            </Button>
          ) },
        ]} />
      </Card>
      <div><Button variant="ghost" onClick={reload}>Actualiser la liste</Button></div>
    </div>
  )
}
