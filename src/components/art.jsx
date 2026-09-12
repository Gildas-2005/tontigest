/* Illustrations vectorielles animées pour la landing TontiGest.
   Aucune dépendance externe — SVG inline + animations CSS Tailwind. */

/* ===== IcôneBadge : pastille flottante avec logo ===== */
export function FloatBadge({ className = '', delay = '0s', children }) {
  return (
    <span className={`absolute animate-float rounded-2xl border border-white/15 bg-white/10 p-2.5 shadow-xl backdrop-blur ${className}`} style={{ animationDelay: delay }}>
      {children}
    </span>
  )
}

/* ===== CarteCotisation : mock d'un paiement mobile money ===== */
export function MockPaiement({ montant = '25 000', devise = 'FCFA' }) {
  return (
    <div className="w-64 rounded-3xl border border-white/12 bg-white/[.07] p-5 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-[10px] font-black text-white">OM</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Orange Money</p>
            <p className="text-xs font-semibold text-white">Cotisation du mois</p>
          </div>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
      </div>
      <div className="mt-4 rounded-2xl bg-white/[.06] p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Montant</p>
        <p className="mt-0.5 font-display text-2xl font-semibold text-white">{montant} <span className="text-sm text-white/50">{devise}</span></p>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
        <span>Réf. TG-24A7-91C2</span>
        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 font-bold text-emerald-300">Confirmé</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-full origin-left animate-[loadingbar_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-gold-300 to-gold-500" />
      </div>
    </div>
  )
}

/* ===== MockTresorerie : aperçu caisse multi-comptes ===== */
export function MockTresorerie() {
  const comptes = [
    { nom: 'Banque', val: '2 750 000', pct: 62, tone: 'from-brand-400 to-brand-700' },
    { nom: 'Caisse espèces', val: '480 000', pct: 22, tone: 'from-gold-300 to-gold-600' },
    { nom: 'Mobile money', val: '530 000', pct: 16, tone: 'from-emerald-400 to-emerald-700' },
  ]
  return (
    <div className="w-72 rounded-3xl border border-white/12 bg-white/[.07] p-5 shadow-2xl backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Trésorerie du club</p>
      <p className="mt-1 font-display text-3xl font-semibold text-white">3 760 000 <span className="text-sm text-white/50">FCFA</span></p>
      <div className="mt-4 space-y-3.5">
        {comptes.map((c, i) => (
          <div key={c.nom}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-white/70">{c.nom}</span>
              <span className="font-bold text-white/90">{c.val}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full bg-gradient-to-r ${c.tone}`}
                style={{ width: `${c.pct}%`, animation: `fade-in .8s ${0.2 + i * 0.15}s ease both` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===== MockTour : calendrier du tour de rôle ===== */
export function MockTour() {
  return (
    <div className="w-72 rounded-3xl border border-white/12 bg-white/[.07] p-5 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Tour de rôle</p>
        <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-[10px] font-bold text-gold-300">Sept. 2026</span>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[.06] p-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-display text-sm font-bold text-brand-950">AB</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">Aïcha B.</p>
          <p className="text-[11px] text-white/50">4ᵉ tour · 250 000 FCFA</p>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {['Mai', 'Juin', 'Juil.'].map((m, i) => (
          <div key={m} className="rounded-xl bg-white/[.05] p-2.5 text-center opacity-90">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{m}</p>
            <p className="mt-0.5 text-xs font-semibold text-white/80">Tour {i + 1} ✓</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===== Anneau tournant décoratif ===== */
export function OrbitRing({ size = 420, className = '' }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} style={{ width: size, height: size }}>
      <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-gold-400/25" />
      <div className="absolute inset-[14%] animate-spin-slow rounded-full border border-white/10" style={{ animationDirection: 'reverse', animationDuration: '22s' }} />
      <div className="absolute inset-[28%] rounded-full border border-gold-300/15" />
    </div>
  )
}

/* ===== Vague décorative en bas de hero ===== */
export function WaveDivider() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-none">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="h-[60px] w-full sm:h-[90px]">
        <path d="M0,48 C240,88 480,8 720,38 C960,68 1200,18 1440,44 L1440,90 L0,90 Z" fill="var(--color-cream)" opacity=".96" />
      </svg>
    </div>
  )
}
