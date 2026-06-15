'use client'
import { useEffect, useState } from 'react'
import { X, Loader2, TrendingUp, Music2, Clock, Download, Heart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Request } from '@/types'

interface Stats {
  session: { name: string; created_at: string }
  totals: { revenue: number; tipsTotal: number; tipsCount: number; requests: number; played: number; rejected: number }
  topTracks: { song: string; artist: string; count: number; revenue: number; votes: number }[]
  byHour: number[]
  peakHour: number
}

export default function StatsModal({ sessionId, requests, onClose }: {
  sessionId: string
  requests: Request[]
  onClose: () => void
}) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats(d))
      .finally(() => setLoading(false))
  }, [sessionId])

  function exportCsv() {
    const head = ['titre', 'artiste', 'type', 'statut', 'montant_eur', 'votes', 'demandeur', 'date']
    const rows = requests.map(r => [
      r.song_name, r.artist, r.request_type, r.status,
      (r.amount / 100).toFixed(2), String(r.votes ?? 0),
      (r.customer_name || '').replace(/[\n;,"]/g, ' '),
      new Date(r.created_at).toISOString(),
    ])
    const csv = [head, ...rows]
      .map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tipson-soiree-${sessionId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maxHour = stats ? Math.max(1, ...stats.byHour) : 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> Statistiques</h2>
            <p className="text-gray-500 text-xs mt-0.5">Bilan de la soirée</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-purple-400" /></div>
        ) : !stats ? (
          <p className="text-gray-500 text-sm py-8 text-center">Statistiques indisponibles.</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Revenus" value={formatPrice(stats.totals.revenue)} accent="text-green-300" />
              <Kpi label="Sons joués" value={String(stats.totals.played)} accent="text-purple-300" />
              <Kpi label="Demandes" value={String(stats.totals.requests)} accent="text-blue-300" />
              <Kpi label="Pourboires" value={`${formatPrice(stats.totals.tipsTotal)} · ${stats.totals.tipsCount}`} accent="text-yellow-300" icon={<Heart className="w-3.5 h-3.5" />} />
            </div>

            {/* Heure de pic */}
            <div className="glass rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4 text-pink-400" /> Activité par heure</p>
                <span className="text-xs text-gray-400">Pic : <span className="text-pink-300 font-bold">{String(stats.peakHour).padStart(2, '0')}h</span></span>
              </div>
              <div className="flex items-end gap-0.5 h-20">
                {stats.byHour.map((c, h) => (
                  <div key={h} className="flex-1 group relative">
                    <div className={`w-full rounded-t ${h === stats.peakHour ? 'bg-pink-500' : 'bg-purple-600/50'}`}
                      style={{ height: `${Math.max(2, (c / maxHour) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-gray-600"><span>00h</span><span>12h</span><span>23h</span></div>
            </div>

            {/* Top sons */}
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5"><Music2 className="w-4 h-4 text-blue-400" /> Sons les plus demandés</p>
              {stats.topTracks.length === 0 ? (
                <p className="text-gray-600 text-xs">Aucune donnée.</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.topTracks.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 glass rounded-xl px-3 py-2">
                      <span className="text-gray-500 font-bold text-sm w-5 text-center flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.song}</p>
                        <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">×{t.count}{t.votes > 0 ? ` · 🔥${t.votes}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={exportCsv}
              className="w-full py-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-semibold text-sm flex items-center justify-center gap-2 transition">
              <Download className="w-4 h-4" /> Exporter en CSV
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, accent, icon }: { label: string; value: string; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <p className="text-gray-500 text-[11px] uppercase tracking-wider flex items-center gap-1">{icon}{label}</p>
      <p className={`text-lg font-black mt-1 ${accent}`}>{value}</p>
    </div>
  )
}
