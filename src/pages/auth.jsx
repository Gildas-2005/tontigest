import { useState } from 'react'
import { useAuth, BUREAU_LABELS } from '../lib/store'
import { Button, Input, Field } from '../components/ui'
import { cls, runValidators, vRequired, vEmail, vTel, vMinLen } from '../lib/utils'
import {
  Crown, Wallet, FileText, ShieldAlert, Handshake, ArrowRight, Check,
  ShieldCheck, Server, Users, Sparkles, Mail, Lock, Eye, EyeOff, UserCheck,
} from '../components/icons'

export function Brand({ big }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.jpeg" alt="TontiGest" className={cls('rounded-2xl object-cover shadow-md ring-1 ring-black/5', big ? 'h-14 w-14' : 'h-12 w-12')} />
      <div className="leading-tight">
        <p className={`font-display font-bold text-ink ${big ? 'text-2xl' : 'text-xl'}`}>Tonti<span className="gold-text">Gest</span></p>
        <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-ink/40">Gestion de tontine</p>
      </div>
    </div>
  )
}

const ROLE_SLIDES = {
  President: { Icon: Crown, title: 'Vous pilotez la tontine', items: ['Paramétrer le club et son cycle de vie', 'Nommer le bureau exécutif', 'Valider calendrier, rapports et décisions', 'Gérer sanctions, exclusions et notifications'] },
  Tresorier: { Icon: Wallet, title: 'Vous gérez la caisse', items: ['Encaisser les cotisations (mobile money, espèces)', 'Décaisser les tours et tenir la banque', 'Prêts internes, épargne et aides sociales', 'Rapports financiers et clôtures'] },
  Secretaire: { Icon: FileText, title: 'Vous animez la vie du club', items: ['Planifier les séances et pointer les présences', 'Générer PV et listes automatiquement', 'Envoyer les convocations et gérer les membres', 'Traiter les réclamations'] },
  Commissaire: { Icon: ShieldAlert, title: 'Vous auditez la gestion', items: ['Consulter tous les chiffres clés', 'Vérifier transactions et pièces justificatives', 'Valider ou rejeter les rapports financiers', 'Signaler anomalies et fraudes au Président'] },
  Membre: { Icon: Handshake, title: 'Vous participez à la tontine', items: ['Payer votre cotisation (mobile money, carte)', 'Suivre votre tour, votre épargne, vos prêts', 'Recevoir rappels et notifications'] },
}

/* ============================ Splash ============================ */
export function Splash() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-900">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#07331a,#12632a_45%,#187830_80%,#12632a)] bg-[length:220%_220%] animate-gradient" />
      <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-gold-400/15 blur-3xl animate-float" />
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      <div className="absolute bottom-10 right-16 h-40 w-40 rounded-3xl bg-gold-400/10 backdrop-blur rotate-12 animate-float" style={{ animationDelay: '-5s' }} />
      <div className="relative flex flex-col items-center animate-fade-up">
        <div className="relative">
          <img src="/logo.jpeg" alt="TontiGest" className="h-24 w-24 rounded-3xl object-cover drop-shadow-2xl animate-float" />
          <span className="absolute inset-0 -z-10 rounded-3xl bg-gold-400/30 blur-2xl" />
        </div>
        <p className="mt-6 font-display text-4xl font-bold text-white">Tonti<span className="gold-text">Gest</span></p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[.3em] text-brand-100/70">Gestion de tontine</p>
        <div className="mt-9 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[loadingbar_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-gold-300 to-gold-500" />
        </div>
        <p className="mt-4 text-xs font-semibold text-brand-100/50">Chargement de votre espace…</p>
      </div>
    </div>
  )
}

/* ============================ Auth ============================ */
export default function AuthPage({ initialMode = 'login' }) {
  const { signIn, signUp, resetPassword, resetConfirm, confirm2fa } = useAuth()
  const [mode, setMode] = useState(initialMode) // login | signup | forgot | reset | twofa
  const [form, setForm] = useState({ nom: '', association: '', telephone: '', email: '', password: '' })
  const [code, setCode] = useState('')
  const [resetInfo, setResetInfo] = useState({ code: '', np: '', confirm: '' })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErr('') }
  const go = (m) => { setMode(m); setErr(''); setInfo('') }

  const submitLogin = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const res = await signIn(form.email.trim(), form.password)
    setBusy(false)
    if (res.error) setErr(res.error)
    else if (res.need2fa) {
      setMode('twofa')
      setInfo(res.channel === 'sms'
        ? 'Un code de vérification vient de vous être envoyé par SMS.'
        : res.channel === 'email'
          ? 'Un code de vérification vient de vous être envoyé par email.'
          : `Mode simulation — code de vérification : ${res.code} (aucune passerelle SMS/email connectée).`)
    }
  }

  const submitSignup = async (e) => {
    e.preventDefault()
    const errs = runValidators(form, {
      nom: [vRequired('Le nom complet est obligatoire.'), vMinLen(4, 'Le nom doit faire au moins 4 caractères.')],
      association: [vRequired('Le nom de l\'association est obligatoire.'), vMinLen(3, 'Le nom de l\'association doit faire au moins 3 caractères.')],
      telephone: [vTel()],
      email: [vRequired('L\'adresse email est obligatoire.'), vEmail()],
      password: [vRequired('Le mot de passe est obligatoire.'), vMinLen(6, '6 caractères minimum pour le mot de passe.')],
    })
    setFieldErrors(errs)
    if (Object.values(errs).some(Boolean)) { setErr('Corrigez les champs signalés avant de continuer.'); return }
    setBusy(true); setErr('')
    // Le nom de l'association est mémorisé puis proposé automatiquement à l'étape suivante.
    try { localStorage.setItem('tontigest.association', form.association.trim()) } catch { /* stockage indisponible */ }
    const res = await signUp({ nom: form.nom.trim(), telephone: form.telephone.trim(), email: form.email.trim(), password: form.password })
    setBusy(false)
    if (res.error) setErr(res.error)
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
    else {
      setResetInfo(r => ({ ...r, code: res.code }))
      setMode('reset')
      if (res.code && res.channel === 'simulation') setInfo(`Mode simulation — code de réinitialisation : ${res.code} (aucune passerelle SMS/email connectée).`)
      else if (res.channel === 'sms') setInfo('Un code de réinitialisation vient de vous être envoyé par SMS.')
      else if (res.channel === 'email') setInfo('Un code de réinitialisation vient de vous être envoyé par email.')
    }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    if (resetInfo.np.length < 8) { setErr('Le nouveau mot de passe doit faire 8 caractères minimum.'); return }
    if (resetInfo.np !== resetInfo.confirm) { setErr('Les mots de passe ne correspondent pas.'); return }
    setBusy(true); setErr('')
    const res = await resetConfirm(form.email.trim(), resetInfo.code, resetInfo.np)
    setBusy(false)
    if (res.error) setErr(res.error)
    else { setResetInfo({ code: '', np: '', confirm: '' }); setForm(f => ({ ...f, password: '' })); go('login'); setInfo('Mot de passe réinitialisé — vous pouvez vous connecter.') }
  }

  const [showPwd, setShowPwd] = useState(false)

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Panneau de marque — clair, or et vert en accents */}
      <div className="relative hidden overflow-hidden bg-cream lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -left-24 top-16 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-80 w-80 rounded-full bg-gold-200/50 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-brand-50 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-brand-600 via-gold-400 to-brand-600" />

        <div className="relative animate-fade-up"><Brand /></div>

        <div className="relative animate-fade-up" style={{ animationDelay: '.15s' }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-gold-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gold-700 shadow-sm">
            <Sparkles size={13} /> Plateforme de gestion de tontine
          </span>
          <h1 className="mt-5 max-w-lg font-display text-4xl font-semibold leading-[1.15] text-ink xl:text-5xl">
            Toute la vie de votre tontine, <span className="gold-text">au même endroit</span>.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/60">
            Cotisations, tours de rôle, prêts internes, épargne, séances et audit — chaque rôle du bureau dispose de son espace dédié, et chaque opération est enregistrée.
          </p>

          {/* Panneau chiffres du produit */}
          <div className="mt-8 max-w-md rounded-2xl border border-black/5 bg-white p-5 shadow-[0_2px_4px_rgba(4,34,15,.04),0_24px_48px_-24px_rgba(4,34,15,.18)]">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['5', 'espaces dédiés'], ['12', 'modules métier'], ['9', 'documents PDF']].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-2xl font-bold gold-text">{n}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink/45">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-black/5 pt-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-ink/75">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-100 text-brand-700"><Check size={12} /></span> Cotisations, tours, prêts, épargne et audit
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-ink/75">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gold-100 text-gold-600"><Check size={12} /></span> Reçus, PV, rapports et bordereaux en PDF
              </p>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: '.3s' }}>
          {[[ShieldCheck, 'Sécurisé', 'Comptes & rôles'], [Server, 'Données fiables', 'Sauvegarde permanente'], [Users, 'Multi-rôles', '5 espaces']].map(([Icon, v, l]) => (
            <div key={l} className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-md">
              <Icon size={20} className="text-gold-500" />
              <p className="mt-2 font-display text-lg font-semibold text-ink">{v}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink/45">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <div className="relative flex items-center justify-center border-l border-black/5 bg-white px-5 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-gold-300 to-gold-500 lg:hidden" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(216,168,0,.05),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gold-100/60 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/4 h-64 w-64 rounded-full bg-brand-50 blur-3xl" />
        <div className="relative w-full max-w-md">
          <div className="mb-8 flex items-center justify-center lg:hidden animate-fade-up"><Brand /></div>

          {mode === 'login' && (
            <div className="animate-fade-up rounded-3xl border border-black/5 bg-white p-6 shadow-[0_2px_4px_rgba(4,34,15,.04),0_24px_48px_-24px_rgba(4,34,15,.18)] sm:p-8">
              <div className="flex items-center gap-3 border-b border-black/5 pb-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md"><Lock size={20} /></span>
                <div>
                  <h2 className="font-display text-2xl font-semibold leading-tight">Connexion</h2>
                  <p className="text-xs font-semibold text-ink/45">Accédez à votre espace TontiGest</p>
                </div>
              </div>
              <form onSubmit={submitLogin} className="mt-6 space-y-4">
                <Field label="Adresse email" required>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
                    <Input type="email" required value={form.email} onChange={set('email')} placeholder="vous@exemple.cm" className="pl-10" />
                  </div>
                </Field>
                <Field label="Mot de passe" required>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
                    <Input type={showPwd ? 'text' : 'password'} required value={form.password} onChange={set('password')} placeholder="••••••••" className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 transition hover:text-brand-700 cursor-pointer" aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{err}</p>}
                {info && <p className="animate-fade-in rounded-xl bg-brand-50 px-4 py-2.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">{info}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Connexion…' : 'Se connecter'} <ArrowRight size={18} />
                </Button>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <button type="button" onClick={() => go('forgot')} className="text-brand-600 hover:underline cursor-pointer">Mot de passe oublié ?</button>
                  <button type="button" onClick={() => go('signup')} className="text-gold-700 hover:underline cursor-pointer">Créer un compte</button>
                </div>
              </form>
            </div>
          )}

          {mode === 'signup' && (
            <div className="animate-fade-up rounded-3xl border border-black/5 bg-white p-6 shadow-[0_2px_4px_rgba(4,34,15,.04),0_24px_48px_-24px_rgba(4,34,15,.18)] sm:p-8">
              <div className="flex items-center gap-3 border-b border-black/5 pb-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-brand-950 shadow-md"><UserCheck size={20} /></span>
                <div>
                  <h2 className="font-display text-2xl font-semibold leading-tight">Créer un compte</h2>
                  <p className="text-xs font-semibold text-ink/45">Votre association en quelques instants</p>
                </div>
              </div>
              <form onSubmit={submitSignup} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom complet" required error={fieldErrors.nom}>
                    <Input required value={form.nom} error={fieldErrors.nom} onChange={set('nom')} placeholder="Émile Ndongo" />
                  </Field>
                  <Field label="Nom de l'association" required error={fieldErrors.association} hint="Votre tontine ou club">
                    <Input required value={form.association} error={fieldErrors.association} onChange={set('association')} placeholder="Ex : Awae Amie" />
                  </Field>
                </div>
                <Field label="Téléphone" required error={fieldErrors.telephone} hint="Format camerounais : +237 6 XX XX XX XX">
                  <Input value={form.telephone} error={fieldErrors.telephone} onChange={set('telephone')} placeholder="+237 6 55 00 11 22" />
                </Field>
                <Field label="Adresse email" required error={fieldErrors.email}>
                  <Input type="email" required value={form.email} error={fieldErrors.email} onChange={set('email')} placeholder="vous@exemple.cm" />
                </Field>
                <Field label="Mot de passe" required hint="6 caractères minimum" error={fieldErrors.password}>
                  <Input type="password" required value={form.password} error={fieldErrors.password} onChange={set('password')} placeholder="••••••••" />
                </Field>
                <p className="rounded-xl bg-brand-50 px-4 py-3 text-[11px] leading-relaxed text-brand-800">
                  Le nom de l&apos;association <b>{form.association || '…'}</b> sera repris automatiquement à l&apos;étape suivante — vous confirmerez la création en un clic et en deviendrez le Président.
                </p>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{err}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Création…' : 'Créer mon compte'} <ArrowRight size={18} /></Button>
                <p className="text-center text-xs font-semibold">
                  <button type="button" onClick={() => go('login')} className="text-brand-600 hover:underline cursor-pointer">J&apos;ai déjà un compte</button>
                </p>
              </form>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="animate-fade-up rounded-3xl border border-black/5 bg-white p-6 shadow-[0_2px_4px_rgba(4,34,15,.04),0_24px_48px_-24px_rgba(4,34,15,.18)] sm:p-8">
              <h2 className="font-display text-3xl font-semibold">Mot de passe oublié</h2>
              <p className="mt-1.5 text-sm text-ink/55">Saisissez votre email pour recevoir un code de réinitialisation.</p>
              <form onSubmit={submitForgot} className="mt-6 space-y-4">
                <Field label="Adresse email">
                  <Input type="email" required value={form.email} onChange={set('email')} placeholder="vous@exemple.cm" />
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{err}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir le code'}</Button>
                <p className="text-center text-xs font-semibold">
                  <button type="button" onClick={() => go('login')} className="text-brand-600 hover:underline cursor-pointer">Retour à la connexion</button>
                </p>
              </form>
            </div>
          )}

          {mode === 'reset' && (
            <div className="animate-fade-up rounded-3xl border border-black/5 bg-white p-6 shadow-[0_2px_4px_rgba(4,34,15,.04),0_24px_48px_-24px_rgba(4,34,15,.18)] sm:p-8">
              <h2 className="font-display text-3xl font-semibold">Réinitialiser</h2>
              <p className="mt-1.5 text-sm text-ink/55">Compte : <b>{form.email}</b>. Saisissez le code reçu puis votre nouveau mot de passe.</p>
              <p className="mt-3 rounded-xl bg-gold-50 px-4 py-2.5 text-xs font-semibold text-gold-800 ring-1 ring-inset ring-gold-200">Code de réinitialisation : <b className="tracking-widest">{resetInfo.code}</b></p>
              <form onSubmit={submitReset} className="mt-4 space-y-4">
                <Field label="Code de réinitialisation">
                  <Input required value={resetInfo.code} onChange={e => setResetInfo(r => ({ ...r, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))} className="text-center font-bold tracking-[.4em]" />
                </Field>
                <Field label="Nouveau mot de passe" hint="8 caractères minimum">
                  <Input type="password" required value={resetInfo.np} onChange={e => setResetInfo(r => ({ ...r, np: e.target.value }))} placeholder="••••••••" />
                </Field>
                <Field label="Confirmer le nouveau mot de passe">
                  <Input type="password" required value={resetInfo.confirm} onChange={e => setResetInfo(r => ({ ...r, confirm: e.target.value }))} placeholder="••••••••" />
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{err}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'} <ArrowRight size={18} /></Button>
              </form>
            </div>
          )}

          {mode === 'twofa' && (
            <div className="animate-fade-up rounded-3xl border border-black/5 bg-white p-6 shadow-[0_2px_4px_rgba(4,34,15,.04),0_24px_48px_-24px_rgba(4,34,15,.18)] sm:p-8">
              <h2 className="font-display text-3xl font-semibold">Vérification en deux étapes</h2>
              <p className="mt-1.5 text-sm text-ink/55">Saisissez le code à 6 chiffres envoyé par SMS.</p>
              {info && <p className="mt-3 animate-fade-in rounded-xl bg-gold-50 px-4 py-2.5 text-xs font-semibold text-gold-800 ring-1 ring-inset ring-gold-200">{info}</p>}
              <form onSubmit={submit2fa} className="mt-6 space-y-4">
                <Field label="Code SMS">
                  <Input value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} placeholder="—— —— ——" className="tracking-[.5em] text-center font-bold" />
                </Field>
                {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{err}</p>}
                <Button variant="gold" size="lg" className="w-full" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Vérifier et se connecter'} <ArrowRight size={18} /></Button>
                <p className="text-center text-xs font-semibold">
                  <button type="button" onClick={() => go('login')} className="text-brand-600 hover:underline cursor-pointer">Retour à la connexion</button>
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
  const [nom, setNom] = useState(() => {
    try { return localStorage.getItem('tontigest.association') || '' } catch { return '' }
  })
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const prenom = nom // nom pré-rempli depuis l'inscription

  const submitCreate = async (e) => {
    e.preventDefault()
    if (!nom.trim()) { setErr('Donnez un nom à votre association.'); return }
    setBusy(true); setErr('')
    const res = await createClub({ nom: nom.trim() })
    setBusy(false)
    if (res.error) setErr(res.error)
    else { try { localStorage.removeItem('tontigest.association') } catch { /* ignoré */ } }
  }
  const submitJoin = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const res = await joinClub(code)
    setBusy(false)
    if (res.error) setErr(res.error)
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-cream px-5 py-10">
      <div className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-brand-100/70 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-gold-200/50 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-brand-600 via-gold-400 to-brand-600" />
      <div className="relative w-full max-w-lg animate-fade-up">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <button onClick={signOut} className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/60 shadow-sm transition hover:bg-black/5 cursor-pointer">Déconnexion</button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Bienvenue {user?.nom || ''}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Dernière étape : votre club</h2>
          <p className="mt-1.5 text-sm text-ink/55">{prenom
            ? <>Créez l&apos;association <b className="text-brand-800">{prenom}</b> — le nom saisi à l&apos;inscription est repris ici.</>
            : <>Créez votre association — vous la paramétrerez ensuite tranquillement.</>}</p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1.5">
            <button onClick={() => { setTab('create'); setErr('') }} className={cls('rounded-xl py-2.5 text-sm font-bold transition cursor-pointer', tab === 'create' ? 'bg-white shadow text-brand-800' : 'text-ink/50 hover:text-ink/80')}>Créer une association</button>
            <button onClick={() => { setTab('join'); setErr('') }} className={cls('rounded-xl py-2.5 text-sm font-bold transition cursor-pointer', tab === 'join' ? 'bg-white shadow text-brand-800' : 'text-ink/50 hover:text-ink/80')}>Rejoindre un club</button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={submitCreate} className="mt-5 space-y-4">
              <Field label="Nom de l'association" hint="Le reste (cotisation, fréquence, bureau…) se règle après la création.">
                <Input required value={nom} onChange={e => { setNom(e.target.value); setErr('') }} placeholder="Ex : Awae Amie" autoFocus />
              </Field>
              {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{err}</p>}
              <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Création…' : 'Créer l\'association'} <ArrowRight size={18} /></Button>
              <p className="text-center text-[11px] text-ink/40">Vous en serez le Président et pourrez nommer le bureau.</p>
            </form>
          ) : (
            <form onSubmit={submitJoin} className="mt-5 space-y-4">
              <Field label="Code du club" hint="Demandez-le au Président de votre tontine">
                <Input required value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr('') }} placeholder="Ex : AB3XY7" className="tracking-[.3em] text-center font-bold uppercase" />
              </Field>
              {err && <p className="animate-fade-in rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{err}</p>}
              <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? 'Connexion au club…' : 'Rejoindre le club'} <ArrowRight size={18} /></Button>
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
      visual: <img src="/logo.jpeg" alt="" className="h-24 w-24 rounded-3xl object-cover animate-float drop-shadow-2xl" />,
      title: 'Bienvenue dans TontiGest',
      text: `Bonjour ${user?.nom || ''} ! Votre espace ${BUREAU_LABELS[role]} est prêt. Découvrez en quelques secondes ce que vous pouvez faire.`,
    },
    {
      visual: <slide.Icon size={64} className="text-gold-300" />,
      title: slide.title,
      text: null,
      items: slide.items,
    },
    {
      visual: <Sparkles size={64} className="text-gold-300" />,
      title: 'Tout est prêt',
      text: 'Vos données sont enregistrées dans la base du club. Vous pouvez commencer dès maintenant.',
    },
  ]
  const s = steps[step]

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-900 px-5">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#07331a,#12632a_45%,#187830_80%,#12632a)] bg-[length:220%_220%] animate-gradient" />
      <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-gold-400/15 blur-3xl animate-float" />
      <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/[.07] blur-3xl animate-float" style={{ animationDelay: '-4s' }} />

      <div className="relative w-full max-w-md animate-fade-up" key={step}>
        {/* Carte centrale du tutoriel */}
        <div className="rounded-3xl border border-white/10 bg-white/[.06] p-8 text-center backdrop-blur-xl">
          <div className="grid place-items-center">{s.visual}</div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[.25em] text-gold-300">
            Étape {step + 1} sur {steps.length}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">{s.title}</h2>
          {s.text && <p className="mt-3 text-sm leading-relaxed text-brand-100/70">{s.text}</p>}
          {s.items && (
            <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left">
              {s.items.map((it, i) => (
                <li key={it} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[.07] px-4 py-2.5 text-sm font-semibold text-brand-50 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <Check size={16} className="mt-0.5 shrink-0 text-gold-300" /> {it}
                </li>
              ))}
            </ul>
          )}

          {/* Progression */}
          <div className="mt-7 flex items-center justify-center gap-2">
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} className={cls('h-2 rounded-full transition-all duration-300 cursor-pointer', i === step ? 'w-8 bg-gold-400' : 'w-2 bg-white/20 hover:bg-white/40')} aria-label={`Étape ${i + 1}`} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          {step < steps.length - 1 ? (
            <>
              <button onClick={() => setStep(steps.length - 1)} className="px-4 py-2.5 text-sm font-semibold text-brand-100/60 transition hover:text-white cursor-pointer">Passer</button>
              <Button variant="gold" size="lg" onClick={() => setStep(s => s + 1)}>Suivant <ArrowRight size={18} /></Button>
            </>
          ) : (
            <Button variant="gold" size="lg" onClick={completeOnboarding}>Découvrir mon espace <ArrowRight size={18} /></Button>
          )}
        </div>
      </div>
    </div>
  )
}
