'use client'
import { useRef, useState, type ReactNode } from 'react'

// Carte avec inclinaison 3D qui suit le curseur + lueur qui suit la souris.
export default function TiltCard({
  children, className = '', glow = 'rgba(217,70,239,0.35)', max = 9,
}: { children: ReactNode; className?: string; glow?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false })

  function onMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setT({ rx: (0.5 - py) * max * 2, ry: (px - 0.5) * max * 2, mx: px * 100, my: py * 100, active: true })
  }
  function onLeave() { setT(s => ({ ...s, rx: 0, ry: 0, active: false })) }

  return (
    <div style={{ perspective: '1100px' }} className={className}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="lp-tilt relative h-full rounded-[1.6rem]"
        style={{ transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.active ? 1.02 : 1})` }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.6rem] transition-opacity duration-300"
          style={{
            opacity: t.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${t.mx}% ${t.my}%, ${glow}, transparent 60%)`,
          }}
        />
        {children}
      </div>
    </div>
  )
}
