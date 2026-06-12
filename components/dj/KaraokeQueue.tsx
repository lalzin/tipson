'use client'
import { Mic2, Play, X, CheckCircle2, Music2, Clock, Users, Loader2, ArrowUp } from 'lucide-react'
import type { Request } from '@/types'
import { cn, formatPrice } from '@/lib/utils'

interface Props {
  requests: Request[]
  onCall: (id: string) => void
  onDone: (id: string) => void
  onSkip: (id: string) => void
  onPrioritize?: (id: string) => void
}

export default function KaraokeQueue({ requests, onCall, onDone, onSkip, onPrioritize }: Props) {
  const waiting = requests.filter(r => r.status === 'paid').sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))
  const singing = requests.filter(r => r.status === 'approved')
  const done = requests.filter(r => r.status === 'played')
  const skipped = requests.filter(r => r.status === 'rejected')

  return (
    <div className="space-y-6">
      {/* En train de chanter */}
      {singing.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-widest font-bold text-pink-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse inline-block" />
            Sur scène
          </h3>
          {singing.map(req => (
            <div key={req.id} className="rounded-2xl p-4 border border-pink-500/40 bg-gradient-to-br from-pink-900/30 to-purple-900/10 space-y-3">
              <div className="flex gap-3 items-center">
                {req.album_image
                  ? <img src={req.album_image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-14 h-14 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0"><Mic2 className="w-7 h-7 text-pink-400" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-pink-200 font-black text-xl truncate">🎤 {req.customer_name}</p>
                  <p className="font-semibold truncate text-sm mt-0.5">{req.song_name}</p>
                  <p className="text-gray-400 text-xs truncate">{req.artist}</p>
                </div>
                <span className="text-green-300 font-bold text-sm flex-shrink-0">{formatPrice(req.amount)}</span>
              </div>
              {req.message && (
                <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                  <p className="text-gray-300 text-sm italic">&ldquo;{req.message}&rdquo;</p>
                </div>
              )}
              <button onClick={() => onDone(req.id)}
                className="w-full py-3 rounded-xl bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/35 font-semibold text-sm flex items-center justify-center gap-2 transition">
                <CheckCircle2 className="w-4 h-4" /> Performance terminée
              </button>
            </div>
          ))}
        </section>
      )}

      {/* File d'attente */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> File d&apos;attente
          </h3>
          <span className="text-gray-600 text-xs">{waiting.length} personne{waiting.length > 1 ? 's' : ''}</span>
        </div>

        {waiting.length === 0 && singing.length === 0 && (
          <div className="text-center py-16 text-gray-600 space-y-2">
            <Mic2 className="w-10 h-10 mx-auto opacity-20" />
            <p className="text-sm">Aucun candidat pour l&apos;instant</p>
            <p className="text-xs">Les participants rejoignent la file via le QR code</p>
          </div>
        )}

        {waiting.map((req, index) => (
          <div key={req.id} className={cn(
            'rounded-2xl p-4 border space-y-3 transition-all',
            index === 0 ? 'bg-white/5 border-white/15' : 'glass border-transparent'
          )}>
            <div className="flex gap-3 items-center">
              {/* Position */}
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0',
                index === 0 ? 'bg-pink-500/25 text-pink-300 border border-pink-500/30' : 'bg-white/5 text-gray-500'
              )}>
                #{index + 1}
              </div>
              {req.album_image
                ? <img src={req.album_image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0"><Music2 className="w-5 h-5 text-gray-600" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className={cn('font-black truncate', index === 0 ? 'text-lg text-white' : 'text-base text-gray-200')}>{req.customer_name}</p>
                <p className="font-medium truncate text-sm text-gray-300 mt-0.5">{req.song_name}</p>
                <p className="text-gray-500 text-xs truncate">{req.artist}</p>
              </div>
              <span className="text-green-300 font-bold text-sm flex-shrink-0">{formatPrice(req.amount)}</span>
            </div>
            {req.message && (
              <div className="bg-white/5 rounded-xl px-3 py-2">
                <p className="text-gray-400 text-xs italic">&ldquo;{req.message}&rdquo;</p>
              </div>
            )}
            {index === 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onCall(req.id)}
                  className="py-2.5 rounded-xl bg-pink-600/25 border border-pink-500/40 text-pink-300 hover:bg-pink-600/40 font-semibold text-sm flex items-center justify-center gap-1.5 transition">
                  <Mic2 className="w-4 h-4" /> Appeler
                </button>
                <button onClick={() => onSkip(req.id)}
                  className="py-2.5 rounded-xl glass text-gray-500 hover:text-red-400 hover:bg-red-500/10 font-semibold text-sm flex items-center justify-center gap-1.5 transition">
                  <X className="w-4 h-4" /> Passer
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-gray-600 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Position #{index + 1} · En attente</span>
                </div>
                {onPrioritize && (
                  <button onClick={() => onPrioritize(req.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-yellow-400/80 hover:text-yellow-300 hover:bg-yellow-500/10 text-xs font-medium transition">
                    <ArrowUp className="w-3.5 h-3.5" /> Prioriser
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Historique */}
      {(done.length > 0 || skipped.length > 0) && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Passés ({done.length + skipped.length})</h3>
          {[...done, ...skipped].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(req => (
            <div key={req.id} className="glass rounded-2xl p-3 flex items-center gap-3 opacity-50">
              {req.album_image && <img src={req.album_image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate font-medium">{req.song_name}</p>
                <p className="text-gray-500 text-xs">{req.customer_name}</p>
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', req.status === 'played' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/10 text-red-400')}>
                {req.status === 'played' ? '✓ Chanté' : '✗ Passé'}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
