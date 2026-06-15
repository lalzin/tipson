'use client'
import { useState } from 'react'
import { Loader2, X, ChevronDown, ChevronUp, Music2 } from 'lucide-react'
import type { Request } from '@/types'
import { cn } from '@/lib/utils'

// Panneau flottant (en haut) listant les demandes en cours du participant.
// Reste visible pendant qu'il continue à réagir ou à faire d'autres demandes.
const META: Record<string, { label: string; dot: string; chip: string }> = {
  paid:     { label: '⏳ En attente', dot: 'bg-yellow-400', chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25' },
  approved: { label: '✓ Validée',     dot: 'bg-green-400',  chip: 'bg-green-500/15 text-green-300 border-green-500/25' },
  played:   { label: '🎵 Jouée',      dot: 'bg-purple-400', chip: 'bg-purple-500/15 text-purple-300 border-purple-500/25' },
  rejected: { label: '✗ Refusée',     dot: 'bg-red-400',    chip: 'bg-red-500/15 text-red-300 border-red-500/25' },
  pending_payment: { label: '…', dot: 'bg-gray-400', chip: 'bg-gray-500/15 text-gray-300 border-gray-500/25' },
}

export default function ActiveRequests({
  items, cancelingId, onCancel, onDismiss,
}: {
  items: Request[]
  cancelingId: string | null
  onCancel: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  const active = items.filter(r => r.status === 'paid' || r.status === 'approved')
  const summary = active.length || items.length

  return (
    <div className="fixed top-16 inset-x-2 z-40 mx-auto max-w-2xl">
      <div className="glass-strong rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Barre repliée */}
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left">
          <Music2 className="w-4 h-4 text-purple-300 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-sm font-semibold">{summary} demande{summary > 1 ? 's' : ''} en cours</span>
            <span className="flex items-center gap-1">
              {items.slice(0, 4).map(r => (
                <span key={r.id} className={cn('w-1.5 h-1.5 rounded-full', (META[r.status] ?? META.paid).dot,
                  r.status === 'paid' && 'animate-pulse')} />
              ))}
            </span>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {/* Détail */}
        {open && (
          <div className="border-t border-white/10 max-h-[46vh] overflow-y-auto divide-y divide-white/5">
            {items.map(r => {
              const m = META[r.status] ?? META.paid
              const terminal = r.status === 'played' || r.status === 'rejected'
              return (
                <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  {r.album_image
                    ? <img src={r.album_image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><Music2 className="w-4 h-4 text-gray-500" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.song_name}</p>
                    <p className="text-xs text-gray-500 truncate">{r.artist}</p>
                  </div>
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full border flex-shrink-0', m.chip)}>{m.label}</span>
                  {r.status === 'paid' && (
                    <button onClick={() => onCancel(r.id)} disabled={cancelingId === r.id}
                      title="Annuler" className="text-gray-600 hover:text-red-400 transition flex-shrink-0 disabled:opacity-50">
                      {cancelingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </button>
                  )}
                  {terminal && (
                    <button onClick={() => onDismiss(r.id)} title="Retirer" className="text-gray-600 hover:text-gray-300 transition flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
