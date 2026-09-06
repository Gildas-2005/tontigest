export const cls = (...a) => a.filter(Boolean).join(' ')

export const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
export const fmtXAF = (n, dev = 'FCFA') => `${fmtNum(n)} ${dev}`
export const fmtDate = (iso) => iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const today = () => new Date().toISOString().slice(0, 10)
export const now = () => new Date().toISOString()
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
export const monthKey = (iso = today()) => iso.slice(0, 7)
export const monthLabel = (key) => new Date(key + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
export const sum = (arr, f = x => x) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0)
export const byId = (arr, id) => arr.find(x => x.id === id)
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)
