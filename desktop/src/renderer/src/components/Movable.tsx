import { useCallback, useEffect, useRef, useState } from 'react'

export interface Pos { x: number; y: number }

// Élément librement déplaçable ET redimensionnable à la souris, dont la position
// et l'échelle sont mémorisées (localStorage) par soirée + identifiant.
// Le DJ compose son écran : glisser le bloc, tirer la poignée du coin pour agrandir.
export default function Movable({
  storageKey, defaultPos, children, onActive,
}: {
  storageKey: string
  defaultPos: Pos | (() => Pos)
  children: React.ReactNode
  onActive?: () => void
}) {
  const [pos, setPos] = useState<Pos>(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) return JSON.parse(raw) } catch {}
    return typeof defaultPos === 'function' ? (defaultPos as () => Pos)() : defaultPos
  })
  const scaleKey = `${storageKey}-scale`
  const [scale, setScale] = useState<number>(() => {
    try { const raw = localStorage.getItem(scaleKey); if (raw) return Number(raw) || 1 } catch {}
    return 1
  })
  const [hover, setHover] = useState(false)
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null)
  const rez = useRef<{ s0: number; sx: number; sy: number } | null>(null)

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(pos)) } catch {} }, [pos, storageKey])
  useEffect(() => { try { localStorage.setItem(scaleKey, String(scale)) } catch {} }, [scale, scaleKey])

  // ── Déplacement ──
  const onMove = useCallback((e: MouseEvent) => {
    const d = drag.current; if (!d) return
    const x = Math.max(0, Math.min(window.innerWidth - 60, d.ox + e.clientX - d.sx))
    const y = Math.max(0, Math.min(window.innerHeight - 40, d.oy + e.clientY - d.sy))
    setPos({ x, y })
  }, [])
  const onUp = useCallback(() => {
    drag.current = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }, [onMove])
  function onDown(e: React.MouseEvent) {
    e.preventDefault()
    onActive?.()
    drag.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Redimensionnement (poignée du coin) ──
  const onRez = useCallback((e: MouseEvent) => {
    const r = rez.current; if (!r) return
    const delta = (e.clientX - r.sx) + (e.clientY - r.sy) // diagonale
    setScale(Math.max(0.5, Math.min(4, r.s0 * (1 + delta / 240))))
  }, [])
  const onRezUp = useCallback(() => {
    rez.current = null
    window.removeEventListener('mousemove', onRez)
    window.removeEventListener('mouseup', onRezUp)
  }, [onRez])
  function onRezDown(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    onActive?.()
    rez.current = { s0: scale, sx: e.clientX, sy: e.clientY }
    window.addEventListener('mousemove', onRez)
    window.addEventListener('mouseup', onRezUp)
  }

  return (
    <div
      onMouseDown={onDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDoubleClick={() => setScale(1)}
      title="Glisser pour déplacer · tirer le coin pour agrandir · double-clic pour réinitialiser"
      style={{
        position: 'absolute', left: pos.x, top: pos.y, pointerEvents: 'auto', cursor: 'grab',
        userSelect: 'none', transform: `scale(${scale})`, transformOrigin: 'top left',
      }}
    >
      {children}
      {/* Poignée de redimensionnement — taille constante (contre-échelle) */}
      <div
        onMouseDown={onRezDown}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 22, height: 22,
          transform: `scale(${1 / scale})`, transformOrigin: 'bottom right',
          cursor: 'nwse-resize', borderRadius: '6px 0 6px 0',
          background: hover ? 'rgba(168,85,247,.9)' : 'rgba(168,85,247,.35)',
          border: '1px solid rgba(255,255,255,.5)',
          display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, lineHeight: 1,
          transition: 'background .15s', boxShadow: '0 2px 8px rgba(0,0,0,.4)',
        }}
      >⤡</div>
    </div>
  )
}
