'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

// Révèle son contenu quand il entre dans le viewport (une seule fois).
export default function Reveal({
  children, className = '', delay = 0,
}: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSeen(true); io.disconnect() } },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`lp-reveal ${seen ? 'in-view' : ''} ${className}`}>
      {children}
    </div>
  )
}
