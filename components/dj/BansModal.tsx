'use client'
import { useEffect, useState, useCallback } from 'react'
import { X, Loader2, Ban, RotateCcw, ShieldCheck, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BanRow { id: string; label: string | null; reason: string | null; block_ip: boolean; created_at: string }
interface MsgRow { id: string; text: string; author_name: string | null; is_super: boolean; ip: string | null; client_id: string | null; user_id: string | null; created_at: string; banned: boolean }

export default function BansModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [tab, setTab] = useState<'messages' | 'bans'>('messages')
  const [bans, setBans] = useState<BanRow[]>([])
  const [msgs, setMsgs] = useState<MsgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [blockIp, setBlockIp] = useState(false)

  const load = useCallback(async () => {
    const [b, m] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/ban`, { cache: 'no-store' }),
      fetch(`/api/sessions/${sessionId}/message-log`, { cache: 'no-store' }),
    ])
    if (b.ok) setBans((await b.json()).bans || [])
    if (m.ok) setMsgs((await m.json()).messages || [])
    setLoading(false)
  }, [sessionId])
  useEffect(() => { load() }, [load])

  async function banFromMessage(m: MsgRow) {
    if (!confirm(`Bannir ${m.author_name || 'ce participant'} ?${blockIp ? '\nL\'IP sera aussi bloquée (déconseillé en lieu : WiFi partagé).' : ''}`)) return
    setBusy(m.id)
    const res = await fetch(`/api/sessions/${sessionId}/ban`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: m.id, block_ip: blockIp }),
    })
    if (res.ok) await load()
    else { const d = await res.json().catch(() => ({})); alert(d.error || 'Bannissement impossible') }
    setBusy(null)
  }

  async function unban(id: string) {
    setBusy(id)
    const res = await fetch(`/api/sessions/${sessionId}/ban`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ban_id: id }),
    })
    if (res.ok) { setBans(b => b.filter(x => x.id !== id)); load() }
    setBusy(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-4 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><Ban className="w-5 h-5 text-red-400" /> Modération</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {(['messages', 'bans'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-1.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5',
                tab === t ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white')}>
              {t === 'messages' ? <><MessageSquare className="w-3.5 h-3.5" /> Messages</> : <><Ban className="w-3.5 h-3.5" /> Bannis ({bans.length})</>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-red-400" /></div>
        ) : tab === 'messages' ? (
          <>
            <label className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
              <input type="checkbox" checked={blockIp} onChange={e => setBlockIp(e.target.checked)} className="accent-red-500 w-4 h-4" />
              Bloquer aussi l&apos;IP <span className="text-gray-600">(déconseillé : WiFi partagé en lieu)</span>
            </label>
            {msgs.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">Aucun message récent.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto -mr-2 pr-2">
                {msgs.map(m => (
                  <div key={m.id} className={cn('rounded-2xl p-3 border', m.banned ? 'bg-red-500/5 border-red-500/20' : 'glass border-white/5')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{m.author_name || 'Anonyme'}</span>
                          {m.is_super && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">SUPER</span>}
                        </p>
                        <p className="text-sm text-gray-300 break-words mt-0.5">{m.text}</p>
                        <p className="text-[11px] text-gray-600 mt-1 font-mono flex flex-wrap gap-x-2">
                          <span>{m.ip ? `IP ${m.ip}` : 'IP inconnue'}</span>
                          {m.client_id && <span className="text-gray-500">· appareil {m.client_id.slice(0, 6)}</span>}
                          {m.user_id && <span className="text-purple-400/70">· compte</span>}
                          <span>· {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                      {m.banned ? (
                        <span className="text-[11px] text-red-400 flex items-center gap-1 flex-shrink-0"><Ban className="w-3.5 h-3.5" /> banni</span>
                      ) : (m.client_id || m.ip || m.user_id) ? (
                        <button onClick={() => banFromMessage(m)} disabled={busy === m.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/15 border border-red-500/25 text-red-300 hover:bg-red-600/25 text-xs font-medium transition flex-shrink-0 disabled:opacity-50">
                          {busy === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Bannir
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-600 flex-shrink-0">non identifiable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : bans.length === 0 ? (
          <div className="py-12 text-center space-y-2 opacity-60">
            <ShieldCheck className="w-9 h-9 mx-auto text-gray-600" />
            <p className="text-gray-500 text-sm">Aucun participant banni.</p>
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
                <button onClick={() => unban(b.id)} disabled={busy === b.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition disabled:opacity-50">
                  {busy === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Réintégrer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
