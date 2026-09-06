/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react'
import { cls, initials } from '../lib/utils'

/* Buttons */
const BTN = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/25',
  gold: 'bg-gradient-to-r from-gold-400 to-gold-500 text-brand-950 hover:from-gold-300 hover:to-gold-400 shadow-lg shadow-gold-500/30',
  outline: 'border border-brand-200 bg-white text-brand-800 hover:border-brand-400 hover:bg-brand-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25',
  dark: 'bg-brand-950 text-white hover:bg-brand-900',
}
export function Button({ variant = 'primary', size = 'md', icon, children, className, ...p }) {
  return (
    <button {...p} className={cls('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-4 py-2.5 text-sm',
      BTN[variant], className)}>
      {icon && <span aria-hidden>{icon}</span>}{children}
    </button>
  )
}

/* Card */
export function Card({ title, subtitle, actions, children, className, pad = true }) {
  return (
    <section className={cls('rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,32,25,.05),0_8px_24px_-12px_rgba(16,32,25,.12)]', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
          <div>
            {title && <h3 className="font-bold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink/50">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

/* Stat */
export function Stat({ label, value, sub, icon, tone = 'brand', delay }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700', gold: 'from-gold-400 to-gold-600',
    red: 'from-red-500 to-red-700', blue: 'from-sky-500 to-sky-700', violet: 'from-violet-500 to-violet-700',
  }
  return (
    <div style={delay ? { animationDelay: delay } : undefined} className="group animate-fade-up relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,32,25,.05),0_8px_24px_-12px_rgba(16,32,25,.12)] transition-transform duration-300 hover:-translate-y-1">
      <div className={cls('absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[.07] transition-transform duration-500 group-hover:scale-[1.8]', tones[tone])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
          <p className="mt-1.5 truncate font-display text-2xl font-semibold text-ink">{value}</p>
          {sub && <p className="mt-1 text-xs text-ink/50">{sub}</p>}
        </div>
        {icon && <div className={cls('grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-lg text-white shadow-md', tones[tone])}>{icon}</div>}
      </div>
    </div>
  )
}

/* Badge */
const TONES = {
  green: 'bg-brand-50 text-brand-700 ring-brand-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  gray: 'bg-black/5 text-ink/60 ring-black/10',
  gold: 'bg-gold-50 text-gold-700 ring-gold-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
}
export function Badge({ tone = 'gray', children, dot, className }) {
  return (
    <span className={cls('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />}{children}
    </span>
  )
}
export const statusTone = (s) => ({
  'Validée': 'green', 'Payée': 'green', 'Actif': 'green', 'Conforme': 'green', 'Validé': 'green', 'Résolue': 'green', 'Approuvé': 'green', 'Remboursé': 'green', 'Terminée': 'green',
  'En attente': 'amber', 'Soumis': 'amber', 'Suspendu': 'amber', 'Planifiée': 'blue', 'En cours': 'blue', 'Ouverte': 'blue',
  'Rejetée': 'red', 'Rejeté': 'red', 'Exclu': 'red', 'Anomalie': 'red', 'Fraude': 'red', 'Exclusion': 'red',
}[s] || 'gray')

/* Modal */
export function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 no-print" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cls('relative w-full animate-scale-in rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[92vh] flex flex-col', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <header className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink/50">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-ink/60 transition hover:bg-black/10 cursor-pointer" aria-label="Fermer">✕</button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-black/5 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}

/* Form fields */
const FIELD = 'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
export const Input = (p) => <input {...p} className={cls(FIELD, p.className)} />
export const Textarea = (p) => <textarea {...p} className={cls(FIELD, 'min-h-24', p.className)} />
export function Select({ options = [], children, ...p }) {
  return <select {...p} className={cls(FIELD, 'appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23122019%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[position:right_0.9rem_center] bg-no-repeat pr-9', p.className)}>{children || options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select>
}
export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/55">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/45">{hint}</span>}
    </label>
  )
}

/* Table */
export function Table({ columns, rows, empty = 'Aucune donnée', keyField = 'id' }) {
  if (!rows.length) return <EmptyState title={empty} />
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-black/5">
            {columns.map(c => <th key={c.key} className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink/45">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[keyField] ?? i} className="border-b border-black/[.04] transition-colors last:border-0 hover:bg-brand-50/50">
              {columns.map(c => <td key={c.key} className="px-3 py-3 align-middle">{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* Tabs */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-black/[.05] p-1">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cls('whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
            active === t.id ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* Progress */
export function Progress({ value, max = 100, tone = 'bg-brand-500', className }) {
  const p = Math.min(100, Math.round((value / (max || 1)) * 100))
  return (
    <div className={cls('h-2 overflow-hidden rounded-full bg-black/[.07]', className)}>
      <div className={cls('h-full rounded-full transition-all duration-700', tone)} style={{ width: `${p}%` }} />
    </div>
  )
}

/* Page header */
export function PageHeader({ title, sub, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-ink/55">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* Avatar */
export function Avatar({ name, size = 'md', ring }) {
  const s = { sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-base', xl: 'h-20 w-20 text-xl' }[size]
  return (
    <span className={cls('relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-800 font-bold text-white shadow-inner', s,
      ring && 'ring-2 ring-gold-400 ring-offset-2')}>
      {initials(name)}
    </span>
  )
}

/* Empty state */
export function EmptyState({ icon = '🗂️', title, sub, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-black/10 bg-white/50 px-6 py-10 text-center">
      <span className="text-3xl opacity-70">{icon}</span>
      <p className="font-semibold">{title}</p>
      {sub && <p className="max-w-xs text-xs text-ink/50">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* Section listing rows with left icon */
export function RowItem({ icon, title, sub, right, onClick }) {
  return (
    <div onClick={onClick} className={cls('flex items-center gap-3 rounded-xl px-3 py-3 transition-colors', onClick && 'cursor-pointer hover:bg-brand-50/70')}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-base">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {sub && <p className="truncate text-xs text-ink/50">{sub}</p>}
      </div>
      {right}
    </div>
  )
}
