import { useRef, useState, useEffect } from 'react'
import { cls, fmtDateTime } from '../lib/utils'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { useInstallPrompt } from '../lib/pwa'
import { useTheme, useLang } from '../lib/prefs'
import { t } from '../lib/i18n'
import { api } from '../lib/api'
import { Avatar, Badge } from './ui'
import { Bell, Menu, LogOut, User, ChevronDown, Check, Repeat, Download, Globe, Sun, Moon } from './icons'

function Brand({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.jpeg" alt="TontiGest" className="h-10 w-10 shrink-0 drop-shadow-lg" />
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-white">Tonti<span className="gold-text">Gest</span></p>
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand-200/70">Gestion de tontine</p>
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
      <button onClick={() => setOpen(o => !o)} className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/5 bg-white text-ink/70 shadow-sm transition hover:-translate-y-0.5 cursor-pointer" aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 animate-scale-in overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <p className="text-sm font-bold">{t('app.notifications')}</p>
              <button className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                onClick={() => setDb(d => ({ ...d, notifications: d.notifications.map(n => n.pour === user.id ? { ...n, lu: true } : n) }))}>{t('app.markAllRead')}</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {mine.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink/40">{t('app.noNotifications')}</p>}
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

/* Bascule bureau <-> espace membre (membres du bureau uniquement) */
function RoleSwitcher({ onSwitch }) {
  const { user, viewRole, setViewRole } = useAuth()
  const [open, setOpen] = useState(false)
  const isBureau = ['President', 'Tresorier', 'Secretaire', 'Commissaire'].includes(user.role)
  if (!isBureau) return null
  const options = [
    { role: user.role, label: `Espace ${BUREAU_LABELS[user.role]}` },
    { role: 'Membre', label: 'Espace Membre' },
  ]
  const pick = (role) => { setViewRole(role); setOpen(false); onSwitch?.() }
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs font-bold text-brand-800 shadow-sm transition hover:-translate-y-0.5 cursor-pointer">
        <Repeat size={15} />
        <span className="hidden sm:inline">{viewRole === 'Membre' ? 'Espace Membre' : 'Espace Bureau'}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-60 animate-scale-in overflow-hidden rounded-2xl border border-black/5 bg-white py-1.5 shadow-2xl">
            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink/40">Basculer d&apos;espace</p>
            {options.map(o => (
              <button key={o.role} onClick={() => pick(o.role)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition hover:bg-brand-50 cursor-pointer">
                <span className={cls('grid h-5 w-5 place-items-center rounded-full', viewRole === o.role ? 'bg-brand-600 text-white' : 'bg-black/5 text-transparent')}>
                  <Check size={13} />
                </span>
                {o.label}
              </button>
            ))}
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
  const [langOpen, setLangOpen] = useState(false)
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  const langRef = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang } = useLang()
  const installApp = useInstallPrompt()
  const current = nav.find(n => n.id === page)
  const go = (id) => { setPage(id); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  /* Badge de messages non lus sur l'entrée Messagerie (poll léger 30 s). */
  useEffect(() => {
    if (!user || user.isSuperAdmin === true) return undefined
    let alive = true
    const pull = () => { api.unreadCount().then(r => { if (alive) setUnreadMsgs(r.count || 0) }).catch(() => {}) }
    pull()
    const iv = setInterval(pull, 30000)
    return () => { alive = false; clearInterval(iv) }
  }, [user, page])

  /* Regroupe les pages par section — le volet affiche des titres de groupe. */
  const groups = []
  for (const n of nav) {
    const g = groups[groups.length - 1]
    if (g && g.title === (n.group || '')) g.items.push(n)
    else groups.push({ title: n.group || '', items: [n] })
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      {/* En-tête du volet : marque sur bandeau vert */}
      <div className="relative overflow-hidden bg-brand-900 px-5 py-5">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#07331a,#12632a_85%)]" />
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gold-400/20 blur-2xl" />
        <div className="relative"><Brand /></div>
      </div>

      {/* Navigation groupée */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map(gr => (
          <div key={gr.title || 'general'}>
            {gr.title && <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-ink/35">{gr.title}</p>}
            <div className="space-y-0.5">
              {gr.items.map(n => {
                const active = page === n.id
                return (
                  <button key={n.id} onClick={() => go(n.id)}
                    className={cls('group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all cursor-pointer',
                      active ? 'bg-brand-50 text-brand-900' : 'text-ink/60 hover:bg-black/[.04] hover:text-ink')}>
                {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold-400" />}
                <span className={cls('grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110',
                  active ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md' : 'bg-black/[.05] text-ink/50 group-hover:text-brand-700')}>{n.icon}</span>
                <span className="flex-1 truncate">{n.label}</span>
                {n.id === 'messagerie' && unreadMsgs > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />}
              </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pied du volet : club + déconnexion */}
      <div className="border-t border-black/5 p-3">
        {db.tontine?.nom ? (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-brand-50/70 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">{(db.tontine.nom || 'T')[0]}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-bold text-brand-900">{db.tontine.nom}</p>
              <p className="text-[10px] font-semibold text-brand-700/70">{db.tontine.statut === 'Active' ? 'Tontine active' : db.tontine.statut === 'Pause' ? 'En pause' : db.tontine.statut === 'Clôturée' ? 'Clôturée' : 'En préparation'}</p>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-brand-50/70 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-bold text-white">TG</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-bold text-brand-900">TontiGest</p>
              <p className="text-[10px] font-semibold text-brand-700/70">{user?.isSuper ? 'Supervision globale' : 'Aucun club'}</p>
            </div>
          </div>
        )}
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/55 transition hover:bg-red-50 hover:text-red-600 cursor-pointer">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/[.05]"><LogOut size={16} /></span> {t('app.logout')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-black/5 lg:block no-print">{sidebar}</aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 animate-slide-left border-r border-black/5 bg-white shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 glass border-b border-black/5 no-print">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-black/5 bg-white text-ink/70 shadow-sm lg:hidden cursor-pointer" aria-label="Menu"><Menu size={18} /></button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-ink/40">{current?.group || t('app.workspace')}</p>
              <h2 className="truncate font-display text-lg font-semibold leading-tight">{current?.label || 'Accueil'}</h2>
            </div>
            <Badge tone={db.tontine?.statut === 'Active' ? 'green' : 'amber'} dot>{db.tontine?.statut === 'Active' ? 'Tontine active' : db.tontine?.statut === 'Preparation' ? t('common.preparation') : db.tontine?.statut || 'Tontine'}</Badge>
            {installApp && (
              <button onClick={installApp} title="Installer TontiGest sur votre appareil"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 px-3 py-2 text-xs font-bold text-brand-950 shadow-md transition hover:-translate-y-0.5 cursor-pointer">
                <Download size={15} />
                <span className="hidden sm:inline">Installer l&apos;app</span>
              </button>
            )}

            {/* Langue FR/EN */}
            <div className="relative" ref={langRef}>
              <button onClick={() => setLangOpen(o => !o)} title="Langue / Language"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-black/5 bg-white px-3 text-xs font-bold text-ink/70 shadow-sm transition hover:-translate-y-0.5 cursor-pointer">
                <Globe size={15} className="text-gold-500" />
                <span>{lang.toUpperCase()}</span>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-40 animate-scale-in overflow-hidden rounded-2xl border border-black/5 bg-white py-1.5 shadow-2xl">
                    <button onClick={() => { setLang('fr'); setLangOpen(false) }} className={cls('flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition hover:bg-brand-50 cursor-pointer', lang === 'fr' && 'text-brand-700')}>🇫🇷 Français</button>
                    <button onClick={() => { setLang('en'); setLangOpen(false) }} className={cls('flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition hover:bg-brand-50 cursor-pointer', lang === 'en' && 'text-brand-700')}>🇬🇧 English</button>
                  </div>
                </>
              )}
            </div>

            {/* Thème clair / sombre */}
            <button onClick={toggleTheme} title={theme === 'dark' ? t('app.lightMode') : t('app.darkMode')}
              className="grid h-10 w-10 place-items-center rounded-xl border border-black/5 bg-white text-ink/70 shadow-sm transition hover:-translate-y-0.5 cursor-pointer">
              {theme === 'dark' ? <Sun size={16} className="text-gold-500" /> : <Moon size={16} className="text-ink/60" />}
            </button>

            <RoleSwitcher onSwitch={() => go('accueil')} />
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
                    <button onClick={() => { setUserOpen(false); go('profil') }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition hover:bg-brand-50 cursor-pointer"><User size={16} /> {t('app.profile')}</button>
                    <button onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"><LogOut size={16} /> {t('app.logout')}</button>
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
          TontiGest © 2026 — Gestion de tontine.
        </footer>
      </div>
    </div>
  )
}
