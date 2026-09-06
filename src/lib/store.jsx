/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { uid, today } from './utils'

/* ----------------------- Table mapping ----------------------- */

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
  encheres: 'encheres',
  seances: 'seances',
  parrainages: 'parrainages',
  reclamations: 'reclamations',
  sanctions: 'sanctions',
  rapports: 'rapports',
  alertes: 'alertes',
  notifsMasse: 'annonces',
  audits: 'audits',
  notifications: 'notifications',
}

const emptyDb = () => {
  const db = { tontine: null }
  for (const k of Object.keys(TABLES)) db[k] = []
  return db
}

/* ----------------------- Clubs <-> rows ----------------------- */

function clubFromRow(row) {
  return {
    id: row.id,
    code: row.code,
    nom: row.nom || 'Ma tontine',
    ville: row.ville || '',
    type: row.type || 'Rotative',
    devise: row.devise || 'XAF',
    montantCotisation: Number(row.montant_cotisation) || 0,
    statut: row.statut || 'Active',
    ...(row.payload || {}),
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
    statut: payload.statut || 'Active',
  }
  delete payload.nom
  delete payload.ville
  delete payload.type
  delete payload.devise
  delete payload.montantCotisation
  delete payload.statut
  delete payload.id
  delete payload.code
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

const AUTH_ERRORS = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Email non confirmé — vérifiez votre boîte de réception.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
}
const traduire = (e) => AUTH_ERRORS[e?.message] || e?.message || 'Une erreur est survenue.'

/* ----------------------------- Contexts ----------------------------- */

const StoreCtx = createContext(null)
const AuthCtx = createContext(null)
const ToastCtx = createContext(null)

export function StoreProvider({ children }) {
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState(null)
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

  /* -------- persistence: diff & push to Supabase -------- */
  const flush = useCallback(async () => {
    const prev = lastSyncedRef.current
    const next = dbRef.current
    const cid = clubIdRef.current
    if (!cid || !next.tontine) return
    lastSyncedRef.current = next
    try {
      const merged = (t) => t ? ({ ...t, ordrePassage: next.ordrePassage, caisse: next.caisse }) : t
      if (JSON.stringify(merged(prev.tontine)) !== JSON.stringify(merged(next.tontine))) {
        const { error } = await supabase.from('clubs').update(clubToRow(merged(next.tontine))).eq('id', cid)
        if (error) throw error
      }
      // bureau : propager le rôle vers le profil du compte lié
      const membreDiff = diffRows(prev.membres, next.membres)
      for (const m of membreDiff.upserts) {
        const before = (prev.membres || []).find(x => x.id === m.id)
        if (m._user_id && before && before.role !== m.role) {
          await supabase.from('profiles').update({ role: m.role }).eq('id', m._user_id)
        }
      }
      for (const [key, table] of Object.entries(TABLES)) {
        const { upserts, deletes } = diffRows(prev[key], next[key])
        if (upserts.length) {
          const rows = upserts.map(r => {
            const row = { id: r.id, club_id: cid, payload: sanitize(r) }
            if (key === 'membres' && r._user_id) row.user_id = r._user_id
            return row
          })
          const { error } = await supabase.from(table).upsert(rows)
          if (error) { lastSyncedRef.current = prev; throw error }
        }
        if (deletes.length) {
          const { error } = await supabase.from(table).delete().in('id', deletes)
          if (error) { lastSyncedRef.current = prev; throw error }
        }
      }
    } catch (e) {
      toast(`Erreur de synchronisation : ${e.message || e}`, 'error')
    }
  }, [toast])

  /* -------- local state mutation (single source: dbRef) -------- */
  const setDb = useCallback((mut) => {
    const next = mut(dbRef.current)
    if (next === dbRef.current) return
    dbRef.current = next
    setDbState(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { flush() }, 350)
  }, [flush])

  /* -------- loading -------- */
  const applyProfile = useCallback(async (profile, authUser) => {
    setUser({
      authId: profile.id,
      id: profile.id,
      email: authUser?.email || '',
      nom: profile.nom || '',
      role: profile.role || 'Membre',
      tel: profile.telephone || '',
      photo: profile.photo || null,
      twoFA: !!profile.two_fa,
      onboardingDone: !!profile.onboarding_done,
      clubId: profile.club_id,
    })
    if (profile.club_id) {
      const cid = profile.club_id
      clubIdRef.current = cid
      const queries = [
        supabase.from('clubs').select('*').eq('id', cid).maybeSingle(),
        ...Object.entries(TABLES).map(([k, t]) =>
          k === 'membres'
            ? supabase.from(t).select('id, payload, user_id').eq('club_id', cid)
            : supabase.from(t).select('id, payload').eq('club_id', cid)),
      ]
      const results = await Promise.all(queries)
      const firstErr = results.find(r => r.error)
      if (firstErr) { toast(`Erreur de chargement : ${firstErr.error.message}`, 'error'); return }
      const data = emptyDb()
      data.tontine = results[0].data ? clubFromRow(results[0].data) : null
      Object.keys(TABLES).forEach((k, i) => {
        data[k] = (results[i + 1].data || []).map(r => {
          const obj = { ...(r.payload || {}), id: r.id }
          if (k === 'membres' && r.user_id) obj._user_id = r.user_id
          return obj
        })
      })
      data.ordrePassage = data.tontine?.ordrePassage || []
      data.caisse = data.tontine?.caisse || { XAF: { Caisse: 0, Banque: 0, OM: 0, MoMo: 0 }, EUR: { Caisse: 0, Banque: 0 } }
      const me = data.membres.find(m => m._user_id === profile.id)
      dbRef.current = data
      lastSyncedRef.current = data
      setDbState(data)
      setUser(u => u ? { ...u, id: me?.id || profile.id } : u)
    }
  }, [toast])

  const resetState = useCallback(() => {
    clubIdRef.current = null
    pending2faRef.current = false
    dbRef.current = emptyDb()
    lastSyncedRef.current = emptyDb()
    setDbState(emptyDb())
    setUser(null)
  }, [])

  /* -------- session bootstrap -------- */
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      if (data?.session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle()
        if (profile && !profile.two_fa) await applyProfile(profile, data.session.user)
        else if (profile) { pending2faRef.current = true; await supabase.auth.signOut() }
      }
      if (active) setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') resetState()
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [applyProfile, resetState])

  /* -------- auth actions -------- */
  const fetchProfile = async (authId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', authId).maybeSingle()
    return data
  }

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: traduire(error) }
    const profile = await fetchProfile(data.user.id)
    if (!profile) return { error: 'Profil introuvable — contactez le bureau du club.' }
    if (profile.two_fa) {
      const code = String(Math.floor(100000 + Math.random() * 900000))
      await supabase.from('profiles').update({ two_fa_code: code }).eq('id', profile.id)
      pending2faRef.current = { email, password }
      await supabase.auth.signOut()
      return { need2fa: true, code }
    }
    await applyProfile(profile, data.user)
    return {}
  }, [applyProfile])

  const confirm2fa = useCallback(async (code) => {
    const pending = pending2faRef.current
    if (!pending) return { error: 'Session expirée — reconnectez-vous.' }
    const { data, error } = await supabase.auth.signInWithPassword({ email: pending.email, password: pending.password })
    if (error) return { error: traduire(error) }
    const profile = await fetchProfile(data.user.id)
    if (!profile || profile.two_fa_code !== code) {
      await supabase.auth.signOut()
      return { error: 'Code de vérification incorrect.' }
    }
    await supabase.from('profiles').update({ two_fa_code: null }).eq('id', profile.id)
    pending2faRef.current = false
    await applyProfile(profile, data.user)
    return {}
  }, [applyProfile])

  const signUp = useCallback(async ({ nom, telephone, email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nom, telephone } } })
    if (error) return { error: traduire(error) }
    if (!data.session) return { needConfirm: true }
    let profile = await fetchProfile(data.user.id)
    if (!profile) {
      await supabase.from('profiles').insert({ id: data.user.id, nom, telephone })
      profile = await fetchProfile(data.user.id)
    }
    await applyProfile(profile || { id: data.user.id, nom, telephone, role: 'Membre' }, data.user)
    return {}
  }, [applyProfile])

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { error: traduire(error) }
    return {}
  }, [])

  const changePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: traduire(error) }
    return {}
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    resetState()
  }, [resetState])

  /* -------- club actions -------- */
  const createClub = useCallback(async (form) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Session expirée.' }
    const { data: club, error } = await supabase.from('clubs').insert({
      nom: form.nom,
      ville: form.ville || '',
      type: form.type || 'Rotative',
      montant_cotisation: Number(form.montantCotisation) || 0,
      statut: 'Active',
      created_by: user.id,
      payload: {
        frequence: form.frequence || 'Mensuelle',
        penaliteRetard: Number(form.penaliteRetard) || 0,
        tauxPret: Number(form.tauxPret) || 10,
        dateDebut: today(),
        banque: form.banque || '',
        ordrePassage: [],
        caisse: { XAF: { Caisse: 0, Banque: 0, OM: 0, MoMo: 0 }, EUR: { Caisse: 0, Banque: 0 } },
      },
    }).select('*').single()
    if (error) return { error: traduire(error) }
    await supabase.from('profiles').update({ club_id: club.id, role: 'President' }).eq('id', user.id)
    const memberId = uid('m')
    await supabase.from('members').insert({
      id: memberId, club_id: club.id, user_id: user.id,
      payload: { id: memberId, nom: form.nomPresident || form.nom || 'Président', role: 'President', tel: form.telephone || '', email: user.email || '', statut: 'Actif', dateAdhesion: today(), photo: null },
    })
    await applyProfile({ ...(await fetchProfile(user.id)), club_id: club.id, role: 'President' }, user)
    return { club }
  }, [applyProfile])

  const joinClub = useCallback(async (code) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Session expirée.' }
    const { data: club } = await supabase.from('clubs').select('*').eq('code', String(code || '').trim().toUpperCase()).maybeSingle()
    if (!club) return { error: 'Aucun club trouvé avec ce code.' }
    const profile = await fetchProfile(user.id)
    const memberId = uid('m')
    const { error } = await supabase.from('members').insert({
      id: memberId, club_id: club.id, user_id: user.id,
      payload: { id: memberId, nom: profile?.nom || user.email, role: 'Membre', tel: profile?.telephone || '', email: user.email || '', statut: 'Actif', dateAdhesion: today(), photo: null },
    })
    if (error) return { error: 'Impossible de rejoindre ce club : ' + traduire(error) }
    await supabase.from('profiles').update({ club_id: club.id, role: 'Membre' }).eq('id', user.id)
    await applyProfile({ ...(profile || {}), club_id: club.id, role: 'Membre' }, user)
    return { club }
  }, [applyProfile])

  const completeOnboarding = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    setUser(u => u ? { ...u, onboardingDone: true } : u)
  }, [])

  const updateMe = useCallback(async (patch) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const profPatch = {}
      if ('nom' in patch) profPatch.nom = patch.nom
      if ('tel' in patch) profPatch.telephone = patch.tel
      if ('photo' in patch) profPatch.photo = patch.photo
      if ('twoFA' in patch) profPatch.two_fa = !!patch.twoFA
      if (Object.keys(profPatch).length) await supabase.from('profiles').update(profPatch).eq('id', user.id)
    }
    const me = (dbRef.current.membres || []).find(m => m._user_id === user?.id || m.id === user?.id)
    if (me) {
      const next = { ...me, ...patch }
      const rowPatch = { payload: sanitize(next) }
      if ('_user_id' in me) rowPatch.user_id = me._user_id
      const { error } = await supabase.from('members').update(rowPatch).eq('id', me.id)
      if (!error) {
        const nextDb = { ...dbRef.current, membres: dbRef.current.membres.map(m => m.id === me.id ? next : m) }
        dbRef.current = nextDb
        lastSyncedRef.current = nextDb
        setDbState(nextDb)
      }
    }
    setUser(u => u ? { ...u, ...patch } : u)
    return {}
  }, [])

  const store = useMemo(() => ({ db, setDb, toast, toasts }), [db, setDb, toast, toasts])
  const auth = useMemo(() => ({
    user, authReady, signIn, confirm2fa, signUp, resetPassword, changePassword,
    signOut, createClub, joinClub, completeOnboarding, updateMe,
  }), [user, authReady, signIn, confirm2fa, signUp, resetPassword, changePassword, signOut, createClub, joinClub, completeOnboarding, updateMe])

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
                <span className="mt-0.5">{t.tone === 'error' ? '⚠' : t.tone === 'info' ? 'ℹ' : '✓'}</span>
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
  President: 'Président(e)', Tresorier: 'Trésorier(ère)', Secretaire: 'Secrétaire', Commissaire: 'Commissaire aux comptes', Membre: 'Membre',
}
