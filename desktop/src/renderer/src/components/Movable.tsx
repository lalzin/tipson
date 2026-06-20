import { useCallback, useEffect, useRef, useState } from 'react'

export interface Pos { x: number; y: number }

// Élément librement déplaçable à la souris, dont la position est mémorisée
// (localStorage) par soirée + identifiant. Utilisé pour l'en-tête, le QR, le
// feed des demandes, etc. — le DJ compose son écran.
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
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number; moved: boolean } | null>(null)

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(pos)) } catch {} }, [pos, storageKey])

  const onMove = useCallback((e: MouseEvent) => {
    const d = drag.current; if (!d) return
    d.moved = true
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
    drag.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY, moved: false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={onDown}
      title="Glisser pour déplacer"
      style={{ position: 'absolute', left: pos.x, top: pos.y, pointerEvents: 'auto', cursor: 'grab', userSelect: 'none' }}
    >
      {children}
    </div>
  )
}
