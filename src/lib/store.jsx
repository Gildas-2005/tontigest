/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { api, setToken, clearToken } from './api'
import { uid } from './utils'

/* ----------------------- Table mapping (clé db -> entité MySQL) ----------------------- */

const TABLES = {
  membres: 'members',
  cotisations: 'cotisations',
  mouvements: 'mouvements',
  penalites: 'penalites',
  epargneIndividuelle: 'epargne',
  groupesEpargne: 'groupes_epargne',
  prets: 'prets',
  interetsRedistribues: 'redistributions',
  aides: 'aides',
  seances: 'seances',
  parrainages: 'parrainages',
  reclamations: 'reclamations',
  sanctions: 'sanctions',
  rapports: 'rapports',
  alertes: 'alertes',
  notifsMasse: 'annonces',
  audits: 'audits',
  notifications: 'notifications',
  convocations: 'convocations',
}

/* Caisses par défaut d'une tontine : la caisse des cotisations et la caisse
   d'épargne existent toujours. Monnaie unique : le franc CFA (XAF).
   Les caisses complémentaires (annuelle, scolaire…) sont ajoutées par le trésorier. */
const CAISSE_VIDE = { XAF: { Cotisation: 0, 'Épargne': 0 } }

const emptyDb = () => {
  const db = { tontine: null, ordrePassage: [], caisse: CAISSE_VIDE }
  for (const k of Object.keys(TABLES)) db[k] = []
  return db
}

/* ----------------------- Clubs <-> rows ----------------------- */

function clubFromRow(row) {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload || '{}') : (row.payload || {})
  return {
    id: row.id,
    code: row.code,
    nom: row.nom || 'Ma tontine',
    ville: row.ville || '',
    type: row.type || 'Rotative',
    devise: row.devise || 'XAF',
    montantCotisation: Number(row.montant_cotisation) || 0,
    statut: row.statut || 'Preparation',
    ...payload,
  }
}

function clubToRow(t) {
  const payload = { ...t }
  const row = {
    nom: payload.nom || 'Ma tontine',
    ville: payload.ville || '',
    type: payload.type || 'Rotative',
    devise: payload.devise || 'XAF',
    montant_cotisation: Number(payload.montantCotisation) || 0,
    statut: payload.statut || 'Preparation',
  }
  for (const k of ['nom', 'ville', 'type', 'devise', 'montantCotisation', 'statut', 'id', 'code']) delete payload[k]
  row.payload = payload
  return row
}

const sanitize = (obj) => {
  const rest = { ...obj }
  delete rest._user_id
  return rest
}

function diffRows(prev = [], next = []) {
  const prevMap = new Map(prev.map(r => [r.id, r]))
  const nextMap = new Map(next.map(r => [r.id, r]))
  const upserts = []
  const deletes = []
  for (const [id, row] of nextMap) {
    if (!prevMap.has(id) || JSON.stringify(sanitize(prevMap.get(id))) !== JSON.stringify(sanitize(row))) upserts.push(row)
  }
  for (const id of prevMap.keys()) if (!nextMap.has(id)) deletes.push(id)
  return { upserts, deletes }
}

const traduire = (e) => e?.message || 'Une erreur est survenue.'

/* ----------------------------- Contexts ----------------------------- */

const StoreCtx = createContext(null)
const AuthCtx = createContext(null)
const ToastCtx = createContext(null)

export function StoreProvider({ children }) {
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState(null)
  const [viewRole, setViewRoleState] = useState(null)
  const [db, setDbState] = useState(emptyDb)
  const [toasts, setToasts] = useState([])

  const dbRef = useRef(emptyDb())
  const lastSyncedRef = useRef(emptyDb())
  const clubIdRef = useRef(null)
  const timerRef = useRef(null)
  const pending2faRef = useRef(false)

  const toast = useCallback((message, tone = 'success') => {
    const id = uid('t')
    setToasts(t => [...t, { id, message, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200)
  }, [])

  const resetState = useCallback(() => {
    clubIdRef.current = null
    pending2faRef.current = false
    dbRef.current = emptyDb()
    lastSyncedRef.current = emptyDb()
    setDbState(emptyDb())
    setUser(null)
    setViewRoleState(null)
  }, [])

  /* -------- persistance : diff & push vers l'API MySQL -------- */
  const flush = useCallback(async () => {
    const prev = lastSyncedRef.current
    const next = dbRef.current
    const cid = clubIdRef.current
    if (!cid || !next.tontine) return
    lastSyncedRef.current = next
    try {
      const merged = (t) => t ? ({ ...t, ordrePassage: next.ordrePassage, caisse: next.caisse }) : t
      if (JSON.stringify(merged(prev.tontine)) !== JSON.stringify(merged(next.tontine))) {
        await api.updateClub(cid, clubToRow(merged(next.tontine)))
      }
      for (const [key, entity] of Object.entries(TABLES)) {
        const { upserts, deletes } = diffRows(prev[key], next[key])
        if (upserts.length) {
          const rows = upserts.map(r => {
            const row = { id: r.id, payload: sanitize(r) }
            if (key === 'membres' && r._user_id) row.user_id = r._user_id
            return row
          })
          await api.upsertRecords(cid, entity, rows)
        }
        if (deletes.length) await api.deleteRecords(cid, entity, deletes)
      }
    } catch (e) {
      lastSyncedRef.current = prev
      if (e.status === 401) { resetState(); return }
      toast(`Erreur de synchronisation : ${traduire(e)}`, 'error')
    }
  }, [toast, resetState])

  /* -------- mutation locale (source unique : dbRef) -------- */
  const setDb = useCallback((mut) => {
    const next = mut(dbRef.current)
    if (next === dbRef.current) return
    dbRef.current = next
    setDbState(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { flush() }, 350)
  }, [flush])

  /* -------- rechargement distant (ex : après confirmation de paiement serveur) -------- */
  const reloadClub = useCallback(async () => {
    const cid = clubIdRef.current
    if (!cid) return
    try {
      const { club, records } = await api.clubData(cid)
      const data = emptyDb()
      data.tontine = club ? clubFromRow(club) : null
      for (const [key, entity] of Object.entries(TABLES)) {
        data[key] = (records[entity] || []).map(r => {
          const payload = typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : (r.payload || {})
          const obj = { ...payload, id: r.id }
          if (key === 'membres' && r.user_id) obj._user_id = r.user_id
          return obj
        })
      }
      data.ordrePassage = data.tontine?.ordrePassage || []
      data.caisse = data.tontine?.caisse || CAISSE_VIDE
      // Préserver les modifications locales non encore synchronisées.
      dbRef.current = data
      lastSyncedRef.current = data
      setDbState(data)
    } catch {
      toast('Impossible de rafraîchir les données du club', 'error')
    }
  }, [toast])

  /* -------- chargement -------- */
  const applyProfile = useCallback(async (profile) => {
    const base = {
      authId: profile.id,
      id: profile.id,
      email: profile.email || '',
      nom: profile.nom || '',
      role: profile.role || 'Membre',
      tel: profile.telephone || '',
      photo: profile.photo || null,
      twoFA: !!profile.two_fa,
      onboardingDone: !!profile.onboarding_done,
      clubId: profile.club_id || null,
      isSuperAdmin: !!profile.is_superadmin,
    }
    setUser(base)
    setViewRoleState(null)

    if (profile.club_id) {
      const cid = profile.club_id
      clubIdRef.current = cid
      try {
        const { club, records } = await api.clubData(cid)
        const data = emptyDb()
        data.tontine = club ? clubFromRow(club) : null
        for (const [key, entity] of Object.entries(TABLES)) {
          data[key] = (records[entity] || []).map(r => {
            const payload = typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : (r.payload || {})
            const obj = { ...payload, id: r.id }
            if (key === 'membres' && r.user_id) obj._user_id = r.user_id
            return obj
          })
        }
        data.ordrePassage = data.tontine?.ordrePassage || []
        data.caisse = data.tontine?.caisse || CAISSE_VIDE
        const me = data.membres.find(m => m._user_id === profile.id)
        dbRef.current = data
        lastSyncedRef.current = data
        setDbState(data)
        if (me) setUser(u => u ? { ...u, id: me.id } : u)
      } catch (e) {
        toast(`Erreur de chargement : ${traduire(e)}`, 'error')
      }
    } else {
      clubIdRef.current = null
      dbRef.current = emptyDb()
      lastSyncedRef.current = emptyDb()
      setDbState(emptyDb())
    }
  }, [toast])

  /* -------- bootstrap de session -------- */
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { user: me } = await api.me()
        if (active && me) await applyProfile(me)
      } catch {
        clearToken()
      } finally {
        if (active) setAuthReady(true)
      }
    })()
    return () => { active = false }
  }, [applyProfile])

  /* -------- actions d'authentification -------- */
  const signIn = useCallback(async (email, password) => {
    try {
      const res = await api.login(email, password)
      if (res.need2fa) {
        pending2faRef.current = { email, password }
        return { need2fa: true, code: res.code, channel: res.channel || 'simulation' }
      }
      setToken(res.token)
      await applyProfile(res.user)
      return {}
    } catch (e) { return { error: traduire(e) } }
  }, [applyProfile])

  const confirm2fa = useCallback(async (code) => {
    const pending = pending2faRef.current
    if (!pending) return { error: 'Session expirée — reconnectez-vous.' }
    try {
      const res = await api.confirm2fa(pending.email, pending.password, code)
      setToken(res.token)
      pending2faRef.current = false
      await applyProfile(res.user)
      return {}
    } catch (e) { return { error: traduire(e) } }
  }, [applyProfile])

  const signUp = useCallback(async ({ nom, telephone, email, password }) => {
    try {
      const res = await api.signup({ nom, telephone, email, password })
      setToken(res.token)
      await applyProfile(res.user)
      return {}
    } catch (e) { return { error: traduire(e) } }
  }, [applyProfile])

  const resetPassword = useCallback(async (email) => {
    try {
      const res = await api.forgot(email)
      return { code: res.code, channel: res.channel || 'simulation' }
    } catch (e) { return { error: traduire(e) } }
  }, [])

  const resetConfirm = useCallback(async (email, code, newPassword) => {
    try {
      await api.reset(email, code, newPassword)
      return {}
    } catch (e) { return { error: traduire(e) } }
  }, [])

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    try {
      await api.changePassword(oldPassword, newPassword)
      return {}
    } catch (e) { return { error: traduire(e) } }
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    resetState()
  }, [resetState])

  /* -------- actions club -------- */
  const createClub = useCallback(async (form) => {
    try {
      const res = await api.createClub({ nom: form.nom, ville: form.ville })
      const { user: me } = await api.me()
      await applyProfile(me)
      return { club: { id: res.clubId, code: res.code } }
    } catch (e) { return { error: traduire(e) } }
  }, [applyProfile])

  const joinClub = useCallback(async (code) => {
    try {
      const res = await api.joinClub(code)
      const { user: me } = await api.me()
      await applyProfile(me)
      return { club: { id: res.clubId, code: res.code } }
    } catch (e) { return { error: traduire(e) } }
  }, [applyProfile])

  const completeOnboarding = useCallback(async () => {
    try { await api.completeOnboarding() } catch { /* ignoré */ }
    setUser(u => u ? { ...u, onboardingDone: true } : u)
  }, [])

  const updateMe = useCallback(async (patch) => {
    // Colonnes du compte utilisateur — l'erreur serveur remonte à l'appelant
    // (plus de succès silencieux en cas d'échec API).
    const userPatch = {}
    if ('nom' in patch) userPatch.nom = patch.nom
    if ('tel' in patch) userPatch.telephone = patch.tel
    if ('photo' in patch) userPatch.photo = patch.photo
    if ('twoFA' in patch) userPatch.two_fa = !!patch.twoFA
    if (Object.keys(userPatch).length) {
      try { await api.updateMe(userPatch) } catch (e) { return { error: traduire(e) } }
    }
    // Enregistrement membre correspondant (dans le club courant)
    const cid = clubIdRef.current
    const me = (dbRef.current.membres || []).find(m => m._user_id === user?.authId || m.id === user?.id)
    if (cid && me) {
      const next = { ...me, ...patch }
      const row = { id: me.id, payload: sanitize(next) }
      if (me._user_id) row.user_id = me._user_id
      try {
        await api.upsertRecords(cid, 'members', [row])
        const nextDb = { ...dbRef.current, membres: dbRef.current.membres.map(m => m.id === me.id ? next : m) }
        dbRef.current = nextDb
        lastSyncedRef.current = nextDb
        setDbState(nextDb)
      } catch (e) { return { error: traduire(e) } }
    }
    setUser(u => u ? { ...u, ...patch } : u)
    return {}
  }, [user])

  const setViewRole = useCallback((role) => setViewRoleState(role), [])

  const effectiveViewRole = user
    ? (user.isSuperAdmin ? 'SuperAdmin' : (viewRole || user.role || 'Membre'))
    : 'Membre'

  const store = useMemo(() => ({ db, setDb, reloadClub, toast, toasts }), [db, setDb, reloadClub, toast, toasts])
  const auth = useMemo(() => ({
    user, authReady, viewRole: effectiveViewRole, setViewRole,
    signIn, confirm2fa, signUp, resetPassword, resetConfirm, changePassword,
    signOut, createClub, joinClub, completeOnboarding, updateMe,
  }), [user, authReady, effectiveViewRole, setViewRole, signIn, confirm2fa, signUp, resetPassword, resetConfirm, changePassword, signOut, createClub, joinClub, completeOnboarding, updateMe])

  const toastIcon = (tone) => tone === 'error'
    ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
    : tone === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0" />
      : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

  return (
    <StoreCtx.Provider value={store}>
      <AuthCtx.Provider value={auth}>
        <ToastCtx.Provider value={toast}>
          {children}
          <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 no-print">
            {toasts.map(t => (
              <div key={t.id} className={`animate-scale-in rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl border max-w-xs flex items-start gap-2 ${
                t.tone === 'error' ? 'bg-red-600 text-white border-red-500'
                : t.tone === 'info' ? 'bg-brand-800 text-white border-brand-700'
                : 'bg-brand-600 text-white border-brand-500'}`}>
                {toastIcon(t.tone)}
                <span>{t.message}</span>
              </div>
            ))}
          </div>
        </ToastCtx.Provider>
      </AuthCtx.Provider>
    </StoreCtx.Provider>
  )
}

export const useStore = () => useContext(StoreCtx)
export const useAuth = () => useContext(AuthCtx)
export const useToast = () => useContext(ToastCtx)

export const BUREAU_LABELS = {
  President: 'Président(e)', Tresorier: 'Trésorier(ère)', Secretaire: 'Secrétaire',
  Commissaire: 'Commissaire aux comptes', Membre: 'Membre', SuperAdmin: 'Superadministrateur',
}
