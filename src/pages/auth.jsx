import { useState } from 'react'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { Button, Input, Field } from '../components/ui'
import { cls } from '../lib/utils'

const DEMO = [
  { role: 'President', desc: 'Tous les droits — pilote la tontine', icon: '👑' },
  { role: 'Tresorier', desc: 'Caisse, cotisations, prêts, banque', icon: '💰' },
  { role: 'Secretaire', desc: 'Séances, PV, membres, courrier', icon: '📝' },
  { role: 'Commissaire', desc: 'Audit et contrôle — lecture seule', icon: '🔍' },
  { role: 'Membre', desc: 'Espace membre — payer, suivre, demander', icon: '🤝' },
]

export default function AuthPage() {
  const { db } = useStore()
  const { login } = useAuth()
  const [sel, setSel] = useState(null)
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [code, setCode] = useState('')
  const [needCode, setNeedCode] = useState(false)

  const t = db.tontine
  const submit = (e) => {
    e.preventDefault()
    const m = db.membres.find(x => x.role === sel?.role && sel?.id && x.id === sel.id)
    if (!m) return
    if (pwd !== m.motDePasse) { setErr('Mot de passe incorrect. Astuce démo : demo1234'); return }
    if (m.twoFA && !needCode) { setNeedCode(true); setErr(''); return }
    if (m.twoFA && code !== '123456') { setErr('Code SMS invalide. Astuce démo : 123456'); return }
    login(m.id)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#032018,#063626_45%,#0a573d_80%,#063626)] bg-[length:220%_220%] animate-gradient" />
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl animate-float" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute bottom-10 right-16 h-40 w-40 rounded-3xl bg-white/5 backdrop-blur rotate-12 animate-float" style={{ animationDelay: '-5s' }} />

        <div className="relative animate-fade-up"><Brand /></div>

        <div className="relative animate-fade-up" style={{ animationDelay: '.15s' }}>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold-300">🇨🇲 Tontine digitale · Cameroun</p>
          <h1 className="max-w-lg font-display text-4xl font-semibold leading-tight text-white xl:text-5xl">
            La tontine, <span className="gold-text">réinventée</span> pour le Club Solidarité.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-brand-100/70">
            Cotisations Orange Money & MTN MoMo, tours et enchères, prêts internes, épargne, séances, audit — toute la vie du club dans une seule application sécurisée.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: '.3s' }}>
          {[['12', 'Membres actifs'], ['300K', 'FCFA / tour'], ['100%', 'Traçabilité']].map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:border-gold-400/40 hover:bg-white/10">
              <p className="font-display text-2xl font-semibold text-gold-300">{v}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-100/60">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="relative flex items-center justify-center bg-cream px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden animate-fade-up"><Brand /></div>

          <div className="animate-fade-up" style={{ animationDelay: '.1s' }}>
            <h2 className="font-display text-3xl font-semibold">Bon retour 👋</h2>
            <p className="mt-1.5 text-sm text-ink/55">{t.nom} — {t.ville}. Choisissez votre profil de démonstration puis connectez-vous.</p>
          </div>

          <div className="mt-6 space-y-2 stagger">
            {DEMO.map(d => {
              const m = db.membres.find(x => x.role === d.role)
              const active = sel?.role === d.role
              return (
                <button key={d.role} type="button" onClick={() => { setSel({ role: d.role, id: m?.id }); setErr(''); setNeedCode(false); setCode('') }}
                  className={cls('flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5',
                    active ? 'border-gold-400 bg-white shadow-lg shadow-gold-500/10 ring-2 ring-gold-400/40' : 'border-black/5 bg-white/70 hover:border-brand-300 hover:bg-white')}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-lg">{d.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{BUREAU_LABELS[d.role]}</span>
                    <span className="block truncate text-xs text-ink/50">{m ? m.nom : '—'} · {d.desc}</span>
                  </span>
                  <span className={cls('h-4 w-4 rounded-full border-2 transition', active ? 'border-gold-500 bg-gold-500 shadow-inner' : 'border-black/15')} />
                </button>
              )
            })}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4 animate-fade-up" style={{ animationDelay: '.25s' }}>
            <Field label="Mot de passe" hint="Comptes de démonstration : demo1234">
              <Input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setErr('') }} placeholder="••••••••" />
            </Field>
            {needCode && (
              <Field label="Code 2FA (SMS)" hint="Envoyé au +237 6 99… — code démo : 123456">
                <Input value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} placeholder="—— —— ——" className="tracking-[.5em] text-center font-bold" />
              </Field>
            )}
            {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">⚠ {err}</p>}
            <Button variant="gold" size="lg" className="w-full" disabled={!sel}>
              {needCode ? 'Vérifier le code et se connecter' : 'Se connecter'} →
            </Button>
            <p className="text-center text-[11px] text-ink/40">Connexion sécurisée · 2FA par SMS disponible pour le Président</p>
          </form>
        </div>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 font-display text-2xl font-bold text-brand-950 shadow-xl shadow-gold-500/40">T</span>
      <div className="leading-tight">
        <p className="font-display text-xl font-bold text-white">Tonti<span className="gold-text">Gest</span></p>
        <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-brand-200/70">Club Solidarité</p>
      </div>
    </div>
  )
}
