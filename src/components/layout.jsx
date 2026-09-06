import { useState } from 'react'
import { cls, fmtDateTime } from '../lib/utils'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { Avatar, Badge } from './ui'

function Brand({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="TontiGest" className="h-10 w-10 shrink-0 drop-shadow-lg" />
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-white">Tonti<span className="gold-text">Gest</span></p>
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand-200/70">Club Solidarité</p>
        </div>
      )}
    </div>
  )
}

function NotifBell() {
  const { db, setDb } = useStore()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const mine = db.notifications.filter(n => n.pour === user.id)
  const unread = mine.filter(n => !n.lu).length
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/5 bg-white text-lg shadow-sm transition hover:-translate-y-0.5 cursor-pointer" aria-label="Notifications">
        🔔
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 animate-scale-in overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <p className="text-sm font-bold">Notifications</p>
              <button className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                onClick={() => setDb(d => ({ ...d, notifications: d.notifications.map(n => n.pour === user.id ? { ...n, lu: true } : n) }))}>Tout marquer lu</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {mine.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink/40">Aucune notification</p>}
              {mine.map(n => (
                <button key={n.id} onClick={() => { setDb(d => ({ ...d, notifications: d.notifications.map(x => x.id === n.id ? { ...x, lu: true } : x) })) }}
                  className={cls('block w-full border-b border-black/[.04] px-4 py-3 text-left transition hover:bg-brand-50/60 cursor-pointer', !n.lu && 'bg-gold-50/60')}>
                  <p className="flex items-center gap-2 text-sm font-semibold">{!n.lu && <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />}{n.titre}</p>
                  <p className="mt-0.5 text-xs text-ink/55">{n.message}</p>
                  <p className="mt-1 text-[10px] text-ink/35">{fmtDateTime(n.date)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Shell({ nav, page, setPage, children }) {
  const { db } = useStore()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const current = nav.find(n => n.id === page)
  const go = (id) => { setPage(id); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-950 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(215,155,28,.14),transparent_55%)]">
      <div className="px-5 py-5"><Brand /></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((n, i) => (
          <button key={n.id} onClick={() => go(n.id)} style={{ animationDelay: `${i * 0.04}s` }}
            className={cls('group flex w-full animate-slide-left items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all cursor-pointer',
              page === n.id ? 'bg-gradient-to-r from-gold-400/20 to-transparent text-white shadow-inner ring-1 ring-inset ring-gold-400/30' : 'text-brand-100/70 hover:bg-white/5 hover:text-white')}>
            <span className={cls('grid h-8 w-8 place-items-center rounded-lg text-base transition-transform group-hover:scale-110',
              page === n.id ? 'bg-gold-400 text-brand-950' : 'bg-white/5')}>{n.icon}</span>
            <span className="flex-1 truncate">{n.label}</span>
            {page === n.id && <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />}
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-100/70 transition hover:bg-red-500/15 hover:text-red-200 cursor-pointer">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5">⏻</span> Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block no-print">{sidebar}</aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 animate-slide-left shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 glass border-b border-black/5 no-print">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-black/5 bg-white text-lg shadow-sm lg:hidden cursor-pointer" aria-label="Menu">☰</button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-ink/40">{current?.group || 'Tableau de bord'}</p>
              <h2 className="truncate font-display text-lg font-semibold leading-tight">{current?.label || 'Accueil'}</h2>
            </div>
            <Badge tone={db.tontine?.statut === 'Active' ? 'green' : 'amber'} dot>{db.tontine?.statut === 'Active' ? 'Tontine active' : db.tontine?.statut || 'Tontine'}</Badge>
            <NotifBell />
            <div className="relative">
              <button onClick={() => setUserOpen(o => !o)} className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:-translate-y-0.5 cursor-pointer">
                <Avatar name={user.nom} size="sm" ring={user.role === 'President'} />
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold leading-tight">{user.nom}</p>
                  <p className="text-[10px] font-semibold text-gold-600">{BUREAU_LABELS[user.role]}</p>
                </div>
              </button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 animate-scale-in overflow-hidden rounded-2xl border border-black/5 bg-white py-1.5 shadow-2xl">
                    <button onClick={() => { setUserOpen(false); go('profil') }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition hover:bg-brand-50 cursor-pointer">👤 Mon profil</button>
                    <button onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer">⏻ Déconnexion</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8" key={page}>
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        <footer className="px-6 py-4 text-center text-[11px] text-ink/35 no-print">
          TontiGest · Club Solidarité © 2026 — Yaoundé, Cameroun 🇨🇲
        </footer>
      </div>
    </div>
  )
}
