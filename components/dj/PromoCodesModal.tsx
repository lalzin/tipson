'use client'
import { useEffect, useState, useCallback } from 'react'
import { X, Loader2, Copy, Check, Trash2, Ticket } from 'lucide-react'
import type { PromoCode } from '@/types'

export default function PromoCodesModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState('20')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/promo-codes`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.codes) setCodes(d.codes) })
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => { load() }, [load])

  async function generate() {
    setGenerating(true)
    await fetch(`/api/sessions/${sessionId}/promo-codes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: Number(count) || 20 }),
    })
    load()
    setGenerating(false)
  }

  async function remove(id: string) {
    await fetch(`/api/sessions/${sessionId}/promo-codes?codeId=${id}`, { method: 'DELETE' })
    setCodes(c => c.filter(x => x.id !== id))
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  const available = codes.filter(c => !c.used)
  const copyAll = () => copy(available.map(c => c.code).join('\n'), 'all')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto my-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2"><Ticket className="w-5 h-5 text-purple-400" /> Codes promo</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-gray-500 text-xs">Codes à usage unique : le client passe en express <strong>gratuit</strong> (0€). Idéal pour un cocktail « request ».</p>

        {/* Génération */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-gray-500 text-xs">Nombre à générer</label>
            <input type="number" min="1" max="100" value={count} onChange={e => setCount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition mt-1" />
          </div>
          <button onClick={generate} disabled={generating}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-sm font-semibold flex items-center gap-2 transition">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Générer
          </button>
        </div>

        {/* Stats + copier tout */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">{available.length} dispo · {codes.length - available.length} utilisés</span>
          {available.length > 0 && (
            <button onClick={copyAll} className="text-purple-300 hover:text-purple-200 flex items-center gap-1 transition">
              {copied === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copier les dispos
            </button>
          )}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
        ) : codes.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-6">Aucun code. Générez-en un lot.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {codes.map(c => (
              <div key={c.id} className={`flex items-center gap-2 rounded-xl p-2.5 border ${c.used ? 'bg-white/3 border-white/5 opacity-50' : 'bg-white/5 border-white/10'}`}>
                <span className="font-mono font-bold tracking-wider flex-1">{c.code}</span>
                {c.used ? (
                  <span className="text-[11px] text-gray-500">utilisé</span>
                ) : (
                  <>
                    <button onClick={() => copy(c.code, c.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
                      {copied === c.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
