import { fmtNum } from '../lib/utils'

/* Donut chart (SVG) */
export function Donut({ data, size = 160, thickness = 22, center }) {
  const total = data.reduce((t, d) => t + d.value, 0) || 1
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  const arcs = data
    .filter(d => d.value > 0)
    .map((d, i, arr) => {
      const before = arr.slice(0, i).reduce((t, x) => t + (x.value / total) * C, 0)
      const len = (d.value / total) * C
      return { ...d, dash: { dasharray: `${len} ${C - len}`, dashoffset: -before } }
    })
  return (
    <div className="relative inline-grid place-items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={thickness} />
        {arcs.map((d, i) => (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={d.dash.dasharray} strokeDashoffset={d.dash.dashoffset} strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray .8s cubic-bezier(.22,1,.36,1)' }} />
        ))}
      </svg>
      <div className="absolute text-center">{center}</div>
    </div>
  )
}

/* Bars chart */
export function Bars({ data, height = 160, format = fmtNum }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-bold text-ink/50 opacity-0 transition group-hover:opacity-100">{format(d.value)}</span>
          <div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-brand-700 to-brand-400 transition-all duration-700 ease-out group-hover:from-gold-500 group-hover:to-gold-300"
            style={{ height: `${(d.value / max) * 82}%`, animation: `fade-up .6s ${i * 0.06}s cubic-bezier(.22,1,.36,1) both` }} />
          <span className="text-[10px] font-semibold text-ink/45">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* Sparkline */
export function Spark({ points, color = '#17855a', w = 120, h = 36 }) {
  const max = Math.max(...points), min = Math.min(...points)
  const rng = max - min || 1
  const step = w / (points.length - 1 || 1)
  const coords = points.map((p, i) => `${i * step},${h - ((p - min) / rng) * (h - 6) - 3}`)
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 400, animation: 'dash 1.2s ease forwards' }} />
      <defs><style>{`@keyframes dash { from { stroke-dashoffset: 400 } to { stroke-dashoffset: 0 } }`}</style></defs>
    </svg>
  )
}

/* Legend for donuts */
export function Legend({ data, total }) {
  return (
    <ul className="space-y-2 text-sm">
      {data.map((d, i) => (
        <li key={i} className="flex items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: d.color }} />
          <span className="flex-1 text-ink/60">{d.label}</span>
          <span className="font-bold">{fmtNum(d.value)}{total != null && <span className="ml-1 text-xs font-medium text-ink/40">{Math.round((d.value / total) * 100)}%</span>}</span>
        </li>
      ))}
    </ul>
  )
}
