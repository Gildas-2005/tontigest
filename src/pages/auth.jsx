import { useState } from 'react'
import { useAuth, BUREAU_LABELS } from '../lib/store'
import { Button, Input, Field } from '../components/ui'
import { cls } from '../lib/utils'

export function Brand({ big }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.svg" alt="TontiGest" className={cls('drop-shadow-xl', big ? 'h-14 w-14' : 'h-12 w-12')} />
      <div className="leading-tight">
        <p className={`font-display font-bold text-white ${big ? 'text-2xl' : 'text-xl'}`}>Tonti<span className="gold-text">Gest</span></p>
        <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-brand-200/70">Club Solidarité</p>
      </div>
    </div>
  )
}

const ROLE_SLIDES = {
  President: { icon: '👑', title: 'Vous pilotez la tontine', items: ['Créer et paramétrer la tontine', 'Nommer le bureau exécutif', 'Valider calendrier, rapports et décisions', 'Gérer sanctions, exclusions et notifications'] },
  Tresorier: { icon: '💰', title: 'Vous gérez la caisse', items: ['Encaisser cotisations OM, MoMo et espèces', 'Décaisser les tours, gérer la banque', 'Prêts internes, épargne et aides sociales', 'Rapports financiers et clôtures'] },
  Secretaire: { icon: '📝', title: 'Vous animez la vie du club', items: ['Planifier les séances et pointer les présences', 'Générer PV et listes automatiquement', 'Envoyer convocations et gérer les membres', 'Traiter les réclamations'] },
  Commissaire: { icon: '🔍', title: 'Vous auditez la gestion', items: ['Consulter tous les chiffres clés', 'Vérifier transactions et pièces justificatives', 'Valider ou rejeter les rapports financiers', 'Signaler anomalies et fraudes au Président'] },
  Membre: { icon: '🤝', title: 'Vous participez à la tontine', items: ['Payer votre cotisation OM / MoMo / carte', 'Suivre votre tour, votre épargne, vos prêts', 'Participer aux enchères du tour', 'Recevoir rappels et notifications'] },
}

/* ============================ Splash ============================ */
export function Splash() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-950">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#032018,#063626_45%,#0a573d_80%,#063626)] bg-[length:220%_220%] animate-gradient" />
      <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl animate-float" />
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      <div className="relative flex flex-col items-center animate-fade-up">
        <img src="/logo.svg" alt="TontiGest" className="h-24 w-24 drop-shadow-2xl animate-float" />
        <p className="mt-5 font-display text-4xl font-bold text-white">Tonti<span className="gold-text">Gest</span></p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[.3em] text-brand-200/70">Club Solidarité · Cameroun</p>
        <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[loadingbar_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-gold-300 to-gold-500" />
        </div>
      </div>
    </div>
  )
}

/* ============================ Auth ============================ */
export default function AuthPage() {
  const { signIn, signUp, resetPassword, confirm2fa } = useAuth()
  const [mode, setMode] = useState('login') // login | signup | forgot | twofa
  const [form, setForm] = useState({ nom: '', telephone: '', email: '', password: '' })
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErr('') }

  const submitLogin = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const res = await signIn(form.email.trim(), form.password)
    setBusy(false)
    if (res.error) setErr(res.error)
    else if (res.need2fa) { setMode('twofa'); setInfo(`Code de vérification envoyé par SMS au numéro du compte. (Passerelle SMS non connectée — code de test : ${res.code})`) }
  }

  const submitSignup = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) { setErr('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setBusy(true); setErr('')
    const res = await signUp({ nom: form.nom.trim(), telephone: form.telephone.trim(), email: form.email.trim(), password: form.password })
    setBusy(false)
    if (res.error) setErr(res.error)
    else if (res.needConfirm) setMode('confirm')
  }

  const submit2fa = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const res = await confirm2fa(code)
    setBusy(false)
    if (res.error) setErr(res.error)
  }

  const submitForgot = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(''); setInfo('')
    const res = await resetPassword(form.email.trim())
    setBusy(false)
    if (res.error) setErr(res.error)
    else setInfo('Email de réinitialisation envoyé — suivez le lien reçu pour choisir un nouveau mot de passe.')
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
            Cotisations Orange Money & MTN MoMo, tours et enchères, prêts internes, épargne, séances, audit — toute la vie du club dans une seule application sécurisée, connectée à une vraie base de données.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: '.3s' }}>
          {[['Sécurisé', 'Auth & rôles RLS'], ['Persistant', 'Base Supabase'], ['Multi-rôles', '5 espaces dédiés']].map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:border-gold-400/40 hover:bg-white/10">
              <p className="font-display text-xl font-semibold text-gold-300">{v}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-100/60">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="relative flex items-center justify-center bg-cream px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden animate-fade-up"><Brand /></div>

          {mode === 'login' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-3xl font-semibold">Bon retour 👋</h2>
              <p className="mt-1.5 text-sm text-ink/55">Connectez-vous avec votre compte TontiGest.</p>
              <form onSubmit={submitLogin} className="mt-6 space-y-4">
                <Field label="Adresse email">
                  <Input type="email" required value={form.email} onChange={set('email')} placeholder="vous@exemple.cm" />
                </Field>
                <Field label="Mot de passe">
                  <Input type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" />
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">⚠ {err}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Connexion…' : 'Se connecter'} →
                </Button>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <button type="button" onClick={() => { setMode('forgot'); setErr(''); setInfo('') }} className="text-brand-600 hover:underline cursor-pointer">Mot de passe oublié ?</button>
                  <button type="button" onClick={() => { setMode('signup'); setErr(''); setInfo('') }} className="text-gold-700 hover:underline cursor-pointer">Créer un compte</button>
                </div>
                <p className="text-center text-[11px] text-ink/40">Connexion sécurisée · 2FA par SMS disponible</p>
              </form>
            </div>
          )}

          {mode === 'signup' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-3xl font-semibold">Créer un compte</h2>
              <p className="mt-1.5 text-sm text-ink/55">Créez votre tontine ou rejoignez un club existant après inscription.</p>
              <form onSubmit={submitSignup} className="mt-6 space-y-4">
                <Field label="Nom complet">
                  <Input required value={form.nom} onChange={set('nom')} placeholder="Émile Ndongo" />
                </Field>
                <Field label="Téléphone">
                  <Input value={form.telephone} onChange={set('telephone')} placeholder="+237 6 XX XX XX XX" />
                </Field>
                <Field label="Adresse email">
                  <Input type="email" required value={form.email} onChange={set('email')} placeholder="vous@exemple.cm" />
                </Field>
                <Field label="Mot de passe" hint="6 caractères minimum">
                  <Input type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" />
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">⚠ {err}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Création…' : 'Créer mon compte'} →</Button>
                <p className="text-center text-xs font-semibold">
                  <button type="button" onClick={() => { setMode('login'); setErr('') }} className="text-brand-600 hover:underline cursor-pointer">← J&apos;ai déjà un compte</button>
                </p>
              </form>
            </div>
          )}

          {mode === 'confirm' && (
            <div className="animate-fade-up rounded-3xl border border-black/5 bg-white p-8 text-center shadow-xl">
              <p className="text-4xl">📬</p>
              <h2 className="mt-3 font-display text-2xl font-semibold">Confirmez votre email</h2>
              <p className="mt-2 text-sm text-ink/55">Un lien de confirmation vient d&apos;être envoyé à <b>{form.email}</b>. Ouvrez-le puis connectez-vous.</p>
              <Button variant="gold" className="mt-6 w-full" onClick={() => setMode('login')}>Aller à la connexion</Button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-3xl font-semibold">Mot de passe oublié</h2>
              <p className="mt-1.5 text-sm text-ink/55">Saisissez votre email pour recevoir un lien de réinitialisation.</p>
              <form onSubmit={submitForgot} className="mt-6 space-y-4">
                <Field label="Adresse email">
                  <Input type="email" required value={form.email} onChange={set('email')} placeholder="vous@exemple.cm" />
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">⚠ {err}</p>}
                {info && <p className="animate-fade-in rounded-xl bg-brand-50 px-4 py-2.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">✓ {info}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer le lien'}</Button>
                <p className="text-center text-xs font-semibold">
                  <button type="button" onClick={() => { setMode('login'); setErr(''); setInfo('') }} className="text-brand-600 hover:underline cursor-pointer">← Retour à la connexion</button>
                </p>
              </form>
            </div>
          )}

          {mode === 'twofa' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-3xl font-semibold">Vérification 2FA 📱</h2>
              <p className="mt-1.5 text-sm text-ink/55">Saisissez le code à 6 chiffres envoyé par SMS.</p>
              {info && <p className="mt-3 animate-fade-in rounded-xl bg-gold-50 px-4 py-2.5 text-xs font-semibold text-gold-800 ring-1 ring-inset ring-gold-200">ℹ {info}</p>}
              <form onSubmit={submit2fa} className="mt-6 space-y-4">
                <Field label="Code SMS">
                  <Input value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} placeholder="—— —— ——" className="tracking-[.5em] text-center font-bold" />
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">⚠ {err}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Vérifier et se connecter'} →</Button>
                <p className="text-center text-xs font-semibold">
                  <button type="button" onClick={() => { setMode('login'); setErr(''); setInfo('') }} className="text-brand-600 hover:underline cursor-pointer">← Retour à la connexion</button>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================ Club setup ============================ */
export function ClubSetup() {
  const { user, createClub, joinClub, signOut } = useAuth()
  const [tab, setTab] = useState('create')
  const [form, setForm] = useState({ nom: '', ville: 'Yaoundé', type: 'Rotative', montantCotisation: 25000, frequence: 'Mensuelle', penaliteRetard: 2500, tauxPret: 10 })
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErr('') }

  const submitCreate = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const res = await createClub(form)
    setBusy(false)
    if (res.error) setErr(res.error)
  }
  const submitJoin = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const res = await joinClub(code)
    setBusy(false)
    if (res.error) setErr(res.error)
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-950 px-5 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#032018,#063626_45%,#0a573d_80%,#063626)] bg-[length:220%_220%] animate-gradient" />
      <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl animate-float" />
      <div className="relative w-full max-w-lg animate-fade-up">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <button onClick={signOut} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-brand-100/80 transition hover:bg-white/10 cursor-pointer">Déconnexion</button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Bienvenue {user?.nom || ''} 👋</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Dernière étape : votre club</h2>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1.5">
            <button onClick={() => { setTab('create'); setErr('') }} className={cls('rounded-xl py-2.5 text-sm font-bold transition cursor-pointer', tab === 'create' ? 'bg-white shadow text-brand-800' : 'text-ink/50 hover:text-ink/80')}>👑 Créer une tontine</button>
            <button onClick={() => { setTab('join'); setErr('') }} className={cls('rounded-xl py-2.5 text-sm font-bold transition cursor-pointer', tab === 'join' ? 'bg-white shadow text-brand-800' : 'text-ink/50 hover:text-ink/80')}>🤝 Rejoindre un club</button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={submitCreate} className="mt-5 space-y-4">
              <Field label="Nom de la tontine">
                <Input required value={form.nom} onChange={set('nom')} placeholder="Club Solidarité" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ville">
                  <Input value={form.ville} onChange={set('ville')} placeholder="Yaoundé" />
                </Field>
                <Field label="Type de tontine">
                  <select value={form.type} onChange={set('type')} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                    <option>Classique</option>
                    <option>Rotative</option>
                    <option>Enchère</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cotisation (FCFA)">
                  <Input type="number" min="0" value={form.montantCotisation} onChange={set('montantCotisation')} />
                </Field>
                <Field label="Fréquence">
                  <select value={form.frequence} onChange={set('frequence')} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                    <option>Hebdomadaire</option>
                    <option>Bimensuelle</option>
                    <option>Mensuelle</option>
                    <option>Trimestrielle</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pénalité retard (FCFA)">
                  <Input type="number" min="0" value={form.penaliteRetard} onChange={set('penaliteRetard')} />
                </Field>
                <Field label="Taux prêt (%)">
                  <Input type="number" min="0" max="100" value={form.tauxPret} onChange={set('tauxPret')} />
                </Field>
              </div>
              {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">⚠ {err}</p>}
              <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Création…' : 'Créer ma tontine'} →</Button>
              <p className="text-center text-[11px] text-ink/40">Vous serez Président(e) de cette tontine.</p>
            </form>
          ) : (
            <form onSubmit={submitJoin} className="mt-5 space-y-4">
              <Field label="Code du club" hint="Demandez-le au Président de votre tontine">
                <Input required value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr('') }} placeholder="Ex : A1B2C3" className="tracking-[.3em] text-center font-bold uppercase" />
              </Field>
              {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">⚠ {err}</p>}
              <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Connexion au club…' : 'Rejoindre le club'} →</Button>
              <p className="text-center text-[11px] text-ink/40">Vous rejoindrez en tant que Membre. Le bureau pourra ensuite vous attribuer un rôle.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================ Onboarding ============================ */
export function Onboarding() {
  const { user, completeOnboarding } = useAuth()
  const [step, setStep] = useState(0)
  const role = user?.role || 'Membre'
  const slide = ROLE_SLIDES[role] || ROLE_SLIDES.Membre

  const steps = [
    {
      visual: <img src="/logo.svg" alt="" className="h-24 w-24 animate-float drop-shadow-2xl" />,
      title: 'Bienvenue dans TontiGest',
      text: `Bonjour ${user?.nom || ''} ! Votre espace ${BUREAU_LABELS[role]} est prêt. Découvrez en 30 secondes ce que vous pouvez faire.`,
    },
    {
      visual: <p className="text-6xl">{slide.icon}</p>,
      title: slide.title,
      text: null,
      items: slide.items,
    },
    {
      visual: <p className="text-6xl">🚀</p>,
      title: 'Tout est prêt !',
      text: 'Vos données sont enregistrées en toute sécurité dans la base du club. Vous pouvez commencer dès maintenant.',
    },
  ]
  const s = steps[step]

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-950 px-5">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#032018,#063626_45%,#0a573d_80%,#063626)] bg-[length:220%_220%] animate-gradient" />
      <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl animate-float" />
      <div className="relative w-full max-w-md text-center animate-fade-up" key={step}>
        <div className="grid place-items-center">{s.visual}</div>
        <h2 className="mt-6 font-display text-3xl font-semibold text-white">{s.title}</h2>
        {s.text && <p className="mt-3 text-sm leading-relaxed text-brand-100/70">{s.text}</p>}
        {s.items && (
          <ul className="mx-auto mt-5 max-w-xs space-y-2.5 text-left">
            {s.items.map((it, i) => (
              <li key={it} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-brand-50 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="mt-0.5 text-gold-300">✓</span> {it}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <span key={i} className={cls('h-2 rounded-full transition-all duration-300', i === step ? 'w-8 bg-gold-400' : 'w-2 bg-white/20')} />
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          {step < steps.length - 1 ? (
            <>
              <button onClick={() => setStep(steps.length - 1)} className="px-4 py-2.5 text-sm font-semibold text-brand-100/60 transition hover:text-white cursor-pointer">Passer</button>
              <Button variant="gold" size="lg" onClick={() => setStep(s => s + 1)}>Suivant →</Button>
            </>
          ) : (
            <Button variant="gold" size="lg" onClick={completeOnboarding}>Découvrir mon espace →</Button>
          )}
        </div>
      </div>
    </div>
  )
}
