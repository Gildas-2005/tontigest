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

/* ---------- Validation de formulaires (partagée par toutes les pages) ---------- */

export const vRequired = (v, msg = 'Ce champ est obligatoire.') =>
  (v === null || v === undefined || String(v).trim() === '') ? msg : ''
export const vEmail = (v, msg = 'Adresse email invalide.') => {
  const s = String(v || '').trim()
  if (!s) return 'L\'email est obligatoire.'
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? '' : msg
}
export const vTel = (v, msg = 'Numéro invalide (format : +237 6XX XX XX XX ou 6XX XX XX XX).') => {
  const s = String(v || '').replace(/[\s.-]/g, '')
  if (!s) return msg
  return /^(\+?\d{8,15})$/.test(s) ? '' : msg
}
export const vMontant = (v, { min = 1, max = 1e9 } = {}) => {
  const n = Number(v)
  if (v === '' || v === null || v === undefined || Number.isNaN(n)) return 'Saisissez un montant valide.'
  if (n < min) return `Le montant doit être au moins ${min.toLocaleString('fr-FR')}.`
  if (n > max) return `Le montant ne peut pas dépasser ${max.toLocaleString('fr-FR')}.`
  return ''
}
export const vDate = (v, { notPast = false } = {}) => {
  if (!v) return 'La date est obligatoire.'
  if (notPast && String(v) < new Date().toISOString().slice(0, 10)) return 'La date ne peut pas être dans le passé.'
  return ''
}
export const vMinLen = (n, msg) => (v) => String(v || '').trim().length < n ? (msg || `Au moins ${n} caractères.`) : ''

/* Exécute un objet {champ: erreur} et renvoie le premier message, '' si tout est bon. */
export const firstError = (errors) => Object.values(errors).find(Boolean) || ''
/* Marque un champ en erreur seulement après soumission (pattern contrôlé par la page). */
export const runValidators = (values, validators) => {
  const errors = {}
  for (const [k, fns] of Object.entries(validators)) {
    for (const fn of (Array.isArray(fns) ? fns : [fns])) {
      const e = fn(values[k], values)
      if (e) { errors[k] = e; break }
    }
  }
  return errors
}
