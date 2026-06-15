'use client'
import { useState } from 'react'
import { X, Loader2, ListMusic, Zap, Mic2, Music2, Disc3 } from 'lucide-react'
import type { Session, SessionType } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onCreate: (session: Session) => void
}

export default function NewSessionModal({ onClose, onCreate }: Props) {
  const [sessionType, setSessionType] = useState<SessionType>('dj')
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('')
  const [priceNormal, setPriceNormal] = useState('1')
  const [pricePriority, setPricePriority] = useState('5')
  const [priceKaraoke, setPriceKaraoke] = useState('0')
  const [priceKaraokePriority, setPriceKaraokePriority] = useState('0')
  const [expressEnabled, setExpressEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    let body: Record<string, unknown> = {
      name: name.trim(),
      venue: venue.trim() || null,
      session_type: sessionType,
    }

    if (sessionType === 'dj') {
      const pNormal = Math.round(parseFloat(priceNormal || '0') * 100)
      const pPriority = Math.round(parseFloat(pricePriority || '0') * 100)
      if (pNormal < 0 || pPriority < 0) { setError('Le prix ne peut pas être négatif'); setLoading(false); return }
      // 0€ = soirée gratuite (pas de paiement). Si un prix prioritaire est défini, il doit être supérieur au prix normal.
      if (pPriority > 0 && pPriority <= pNormal) { setError('Le prix "Maintenant" doit être supérieur au prix "Playlist"'); setLoading(false); return }
      body = { ...body, price_normal: pNormal, price_priority: pPriority, express_enabled: expressEnabled }
    } else if (sessionType === 'karaoke') {
      const pKaraoke = Math.round(parseFloat(priceKaraoke || '0') * 100)
      const pKaraokePriority = Math.round(parseFloat(priceKaraokePriority || '0') * 100)
      if (pKaraoke < 0 || pKaraokePriority < 0) { setError('Le prix ne peut pas être négatif'); setLoading(false); return }
      if (pKaraokePriority > 0 && pKaraokePriority <= pKaraoke) { setError('Le prix "Passer devant" doit être supérieur au prix normal'); setLoading(false); return }
      body = { ...body, price_karaoke: pKaraoke, price_karaoke_priority: pKaraokePriority, express_enabled: expressEnabled }
    }
    // jukebox : aucun tarif, ajout libre à la file

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur'); setLoading(false); return }
    onCreate(data)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Nouvelle soirée</h2>
            <p className="text-gray-500 text-xs mt-0.5">Configurez et démarrez en direct</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">

          {/* Type de soirée */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Type de soirée</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSessionType('dj')}
                className={cn(
                  'rounded-2xl p-3 text-left border transition',
                  sessionType === 'dj'
                    ? 'bg-purple-600/20 border-purple-500/50'
                    : 'bg-white/3 border-white/10 hover:bg-white/5'
                )}
              >
                <Music2 className={cn('w-5 h-5 mb-2', sessionType === 'dj' ? 'text-purple-400' : 'text-gray-500')} />
                <p className={cn('font-bold text-sm', sessionType === 'dj' ? 'text-white' : 'text-gray-400')}>DJ Tips</p>
                <p className="text-gray-500 text-xs mt-0.5">Sons + pourboires</p>
              </button>
              <button
                type="button"
                onClick={() => setSessionType('karaoke')}
                className={cn(
                  'rounded-2xl p-3 text-left border transition',
                  sessionType === 'karaoke'
                    ? 'bg-pink-600/20 border-pink-500/50'
                    : 'bg-white/3 border-white/10 hover:bg-white/5'
                )}
              >
                <Mic2 className={cn('w-5 h-5 mb-2', sessionType === 'karaoke' ? 'text-pink-400' : 'text-gray-500')} />
                <p className={cn('font-bold text-sm', sessionType === 'karaoke' ? 'text-white' : 'text-gray-400')}>Karaoké</p>
                <p className="text-gray-500 text-xs mt-0.5">File pour chanter</p>
              </button>
              <button
                type="button"
                onClick={() => setSessionType('jukebox')}
                className={cn(
                  'rounded-2xl p-3 text-left border transition',
                  sessionType === 'jukebox'
                    ? 'bg-emerald-600/20 border-emerald-500/50'
                    : 'bg-white/3 border-white/10 hover:bg-white/5'
                )}
              >
                <Disc3 className={cn('w-5 h-5 mb-2', sessionType === 'jukebox' ? 'text-emerald-400' : 'text-gray-500')} />
                <p className={cn('font-bold text-sm', sessionType === 'jukebox' ? 'text-white' : 'text-gray-400')}>Jukebox</p>
                <p className="text-gray-500 text-xs mt-0.5">File Apple Music</p>
              </button>
            </div>
            {sessionType === 'jukebox' && (
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-200/90 text-xs px-3 py-2.5 leading-relaxed">
                Les clients ajoutent des morceaux à la file qui passe sur <strong>Apple Music</strong>.
                Gardez le tableau de bord de la session ouvert et connecté à Apple Music pendant la soirée.
              </div>
            )}
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Nom de la soirée *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={sessionType === 'karaoke' ? 'Ex : Karaoké du Vendredi Soir' : 'Ex : Soirée Rooftop — Samedi 14 Juin'}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Lieu <span className="text-gray-600 font-normal">(optionnel)</span></label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="Ex : Le Rex Club, Paris"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Tarifs DJ */}
          {sessionType === 'dj' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tarifs</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ListMusic className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-300 text-xs font-semibold">Dans la playlist</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number" value={priceNormal} onChange={e => setPriceNormal(e.target.value)}
                      min="0" step="0.50"
                      className="w-full pl-4 pr-7 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm font-bold">€</span>
                  </div>
                </div>
                <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-purple-300 text-xs font-semibold">La chanson maint.</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number" value={pricePriority} onChange={e => setPricePriority(e.target.value)}
                      min="0" step="0.50"
                      className="w-full pl-4 pr-7 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-bold">€</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-xs pl-1">0€ = soirée gratuite, sans paiement</p>
            </div>
          )}

          {/* Tarifs Karaoké */}
          {sessionType === 'karaoke' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tarifs de la file</label>
              <div className="grid grid-cols-2 gap-3">
                {/* File normale */}
                <div className="bg-pink-500/8 border border-pink-500/20 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Mic2 className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-pink-300 text-xs font-semibold">File normale</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number" value={priceKaraoke} onChange={e => setPriceKaraoke(e.target.value)}
                      min="0" step="0.50"
                      className="w-full pl-4 pr-7 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 text-sm font-bold">€</span>
                  </div>
                </div>
                {/* Passer devant */}
                <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-yellow-300 text-xs font-semibold">Passer devant</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number" value={priceKaraokePriority} onChange={e => setPriceKaraokePriority(e.target.value)}
                      min="0" step="0.50"
                      className="w-full pl-4 pr-7 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 text-sm font-bold">€</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-xs pl-1">0€ = gratuit · &quot;Passer devant&quot; place le candidat en tête de file</p>
            </div>
          )}

          {/* Mode express (option prioritaire payante) — pas pour le jukebox */}
          {sessionType !== 'jukebox' && (
          <button
            type="button"
            onClick={() => setExpressEnabled(v => !v)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white/3 border border-white/10 p-3.5 text-left hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2.5">
              <Zap className={cn('w-4 h-4', expressEnabled ? 'text-yellow-400' : 'text-gray-600')} />
              <div>
                <p className="text-sm font-medium">Option express (passer devant)</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {sessionType === 'karaoke' ? 'Payer pour passer en tête de file' : 'Payer pour être joué en priorité'}
                </p>
              </div>
            </div>
            <div className={cn('w-11 h-6 rounded-full p-0.5 transition flex-shrink-0', expressEnabled ? 'bg-yellow-500' : 'bg-white/10')}>
              <div className={cn('w-5 h-5 rounded-full bg-white transition-transform', expressEnabled ? 'translate-x-5' : 'translate-x-0')} />
            </div>
          </button>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className={cn(
              'w-full py-4 rounded-2xl disabled:opacity-40 font-bold text-lg flex items-center justify-center gap-2 transition active:scale-[0.98]',
              sessionType === 'karaoke'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500'
                : sessionType === 'jukebox'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600'
            )}
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {sessionType === 'karaoke' ? 'Démarrer le karaoké 🎤' : sessionType === 'jukebox' ? 'Démarrer le jukebox 🎶' : 'Démarrer la soirée 🎧'}
          </button>
        </form>
      </div>
    </div>
  )
}
