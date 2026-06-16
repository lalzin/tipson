'use client'
import { useEffect, useState } from 'react'
import { X, Loader2, Ban, RotateCcw, ShieldCheck } from 'lucide-react'

interface BanRow { id: string; label: string | null; reason: string | null; block_ip: boolean; created_at: string }

export default function BansModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [bans, setBans] = useState<BanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/sessions/${sessionId}/ban`, { cache: 'no-store' })
    if (res.ok) setBans((await res.json()).bans || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [sessionId])

  async function unban(id: string) {
    setRemoving(id)
    const res = await fetch(`/api/sessions/${sessionId}/ban`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ban_id: id }),
    })
    if (res.ok) setBans(b => b.filter(x => x.id !== id))
    setRemoving(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-4 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><Ban className="w-5 h-5 text-red-400" /> Participants bannis</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-red-400" /></div>
        ) : bans.length === 0 ? (
          <div className="py-12 text-center space-y-2 opacity-60">
            <ShieldCheck className="w-9 h-9 mx-auto text-gray-600" />
            <p className="text-gray-500 text-sm">Aucun participant banni.</p>
            <p className="text-gray-600 text-xs">Utilisez « Bannir ce participant » sur une demande.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto -mr-2 pr-2">
            {bans.map(b => (
              <div key={b.id} className="flex items-center gap-3 glass rounded-2xl p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.label || 'Participant'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(b.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {b.block_ip ? ' · IP bloquée' : ''}
                  </p>
                </div>
                <button onClick={() => unban(b.id)} disabled={removing === b.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition disabled:opacity-50">
                  {removing === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Réintégrer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
