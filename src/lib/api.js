/* Client API TontiGest — REST local (Express + MySQL). Remplace l'ancien client Supabase. */

const TOKEN_KEY = 'tg_token'
const BASE = '/api'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Serveur local injoignable — vérifiez que TontiGest tourne (npm start).')
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    if (res.status === 401) {
      // Session expirée : on déconnecte proprement — l'app ramène à la connexion.
      clearToken()
      const err = new Error(data.error || 'Session expirée — reconnectez-vous.')
      err.status = 401
      throw err
    }
    if (res.status === 403 && data.error?.includes('suspendu')) {
      // Compte ou association suspendu par le superadministrateur.
      clearToken()
      const err = new Error(data.error)
      err.status = 403
      err.suspended = true
      throw err
    }
    const err = new Error(data.error || `Erreur ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  // Auth
  me: () => request('GET', '/auth/me'),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  confirm2fa: (email, password, code) => request('POST', '/auth/confirm2fa', { email, password, code }),
  signup: (payload) => request('POST', '/auth/signup', payload),
  changePassword: (oldPassword, newPassword) => request('POST', '/auth/change-password', { oldPassword, newPassword }),
  forgot: (email) => request('POST', '/auth/forgot', { email }),
  reset: (email, code, newPassword) => request('POST', '/auth/reset', { email, code, newPassword }),

  // Utilisateur courant
  updateMe: (patch) => request('PATCH', '/users/me', patch),
  completeOnboarding: () => request('POST', '/users/me/onboarding'),
  request2fa: () => request('POST', '/users/me/2fa/request'),
  confirm2faActivation: (code) => request('POST', '/users/me/2fa/confirm', { code }),

  // Clubs
  createClub: (payload) => request('POST', '/clubs', payload),
  joinClub: (code) => request('POST', '/clubs/join', { code }),
  clubData: (id) => request('GET', `/clubs/${id}/data`),
  updateClub: (id, row) => request('PATCH', `/clubs/${id}`, row),
  upsertRecords: (id, entity, rows) => request('POST', `/clubs/${id}/records/${entity}`, { rows }),
  deleteRecords: (id, entity, ids) => request('POST', `/clubs/${id}/records/${entity}/delete`, { ids }),

  // Admin
  adminOverview: () => request('GET', '/admin/overview'),
  adminUserStatut: (userId, statut) => request('POST', `/admin/users/${userId}/statut`, { statut }),
  adminClubStatut: (clubId, statut) => request('POST', `/admin/clubs/${clubId}/statut`, { statut }),
  adminDbStats: () => request('GET', '/admin/db-stats'),

  // Intégrations & paiements
  integrations: () => request('GET', '/integrations'),
  initiatePayment: (payload) => request('POST', '/payments/initiate', payload),
  paymentStatus: (ref) => request('GET', `/payments/${ref}/status`),
  simulatePayment: (ref) => request('POST', `/payments/${ref}/simulate`),
  notifyExternal: (payload) => request('POST', '/notify/external', payload),

  // Messagerie interne
  conversations: () => request('GET', '/messages/conversations'),
  contacts: () => request('GET', '/messages/contacts'),
  openConversation: (contactId) => request('POST', '/messages/conversations', { contactId }),
  createGroup: (sujet, memberIds) => request('POST', '/messages/conversations/group', { sujet, memberIds }),
  conversationMessages: (id) => request('GET', `/messages/conversations/${id}`),
  sendMessage: (id, body) => request('POST', `/messages/conversations/${id}/messages`, { body }),
  unreadCount: () => request('GET', '/messages/unread-count'),
}
