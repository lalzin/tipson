'use client'
import { useRef, useState } from 'react'
import { Zap, Music2, Heart } from 'lucide-react'

// Scène 3D du héros : platine vinyle qui tourne + cartes de demande flottantes,
// le tout avec une parallaxe douce qui suit le curseur.
export default function HeroScene() {
  const ref = useRef<HTMLDivElement>(null)
  const [p, setP] = useState({ x: 0, y: 0 })

  function onMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setP({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 })
  }

  const layer = (depth: number) => ({
    transform: `translate3d(${p.x * depth}px, ${p.y * depth}px, 0)`,
    transition: 'transform 0.25s ease-out',
  })

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setP({ x: 0, y: 0 })}
      className="relative mx-auto aspect-square w-full max-w-[460px]"
      style={{ perspective: '1200px' }}
    >
      {/* halo */}
      <div className="absolute inset-0 rounded-full bg-fuchsia-600/20 blur-[90px]" style={layer(18)} />
      <div className="absolute inset-8 rounded-full bg-cyan-500/15 blur-[80px]" style={layer(28)} />

      {/* platine inclinée */}
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ transform: `rotateX(${52 + p.y * 8}deg) rotateZ(${p.x * 8}deg)`, transformStyle: 'preserve-3d', transition: 'transform 0.25s ease-out' }}
      >
        <div className="lp-spin relative h-[78%] w-[78%] rounded-full"
          style={{
            background: 'repeating-radial-gradient(circle at center, #0b0b12 0 2px, #15131d 2px 4px)',
            boxShadow: '0 0 0 10px #07060c, 0 30px 70px -10px rgba(217,70,239,0.5), inset 0 0 60px rgba(0,0,0,0.9)',
          }}>
          {/* reflet néon sur le sillon */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.5) 28deg, transparent 70deg, transparent 180deg, rgba(217,70,239,0.5) 210deg, transparent 250deg)', mixBlendMode: 'screen' }} />
          {/* étiquette centrale */}
          <div className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center"
            style={{ background: 'linear-gradient(135deg, #d946ef, #22d3ee)' }}>
            <span className="font-display text-2xl font-black text-gray-950">T</span>
            <span className="absolute h-3 w-3 rounded-full bg-gray-950" />
          </div>
        </div>
      </div>

      {/* cartes de demande flottantes */}
      <div className="lp-float absolute -left-3 top-10 w-[58%]" style={{ ...layer(46), ['--rot' as any]: '-7deg' }}>
        <FloatCard icon={<Zap className="h-3.5 w-3.5 text-yellow-300" />} tag="EXPRESS" tagCls="text-yellow-300 bg-yellow-400/15"
          title="Strobe · Deadmau5" sub="passe maintenant" />
      </div>
      <div className="lp-float-rev absolute -right-2 top-1/3 w-[56%]" style={{ ...layer(60), ['--rot' as any]: '6deg' }}>
        <FloatCard icon={<Music2 className="h-3.5 w-3.5 text-cyan-300" />} tag="PLAYLIST" tagCls="text-cyan-300 bg-cyan-400/15"
          title="One More Time" sub="Daft Punk" />
      </div>
      <div className="lp-float absolute bottom-6 left-1/4 w-[50%]" style={{ ...layer(38), ['--rot' as any]: '3deg', animationDelay: '1.2s' }}>
        <FloatCard icon={<Heart className="h-3.5 w-3.5 text-fuchsia-300" />} tag="+12 ❤️" tagCls="text-fuchsia-300 bg-fuchsia-400/15"
          title="La foule adore" sub="en direct" />
      </div>
    </div>
  )
}

function FloatCard({ icon, tag, tagCls, title, sub }: { icon: React.ReactNode; tag: string; tagCls: string; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/70 p-3 backdrop-blur-md shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${tagCls}`}>{icon}{tag}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-white">{title}</p>
      <p className="truncate text-xs text-gray-400">{sub}</p>
    </div>
  )
}
