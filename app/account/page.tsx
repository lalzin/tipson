'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import {
  Loader2, LogOut, Music2, Mic2, Wallet, ListMusic, CheckCircle2,
  CalendarDays, Lock, Eye, EyeOff, ArrowLeft, Sparkles,
} from 'lucide-react'

interface AccountData {
  kpi: { sessions: number; requests: number; played: number; totalSpent: number }
  sessions: { session_id: string; name: string; session_type: string; dj_name: string | null; requests: number; spent: number; lastAt: string | null }[]
  recent: { id: string; song_name: string; artist: string; album_image: string | null; status: string; amount: number; request_type: string; refunded: boolean; created_at: string; session_name: string | null }[]
}

const STATUS_LABEL: Record<string, { txt: string; cls: string }> = {
  played: { txt: 'Joué', cls: 'bg-purple-500/15 text-purple-300' },
  approved: { txt: 'Validé', cls: 'bg-green-500/15 text-green-300' },
  paid: { txt: 'En attente', cls: 'bg-yellow-500/15 text-yellow-300' },
  rejected: { txt: 'Refusé', cls: 'bg-red-500/10 text-red-400' },
  pending_payment: { txt: 'Non payé', cls: 'bg-gray-500/15 text-gray-400' },
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [data, setData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)

  // Password change
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; txt: string } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/join'); return }
      setUser(user)
      const res = await fetch('/api/account/stats', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  }, [router])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdMsg(null)
    if (pwd.length < 6) { setPwdMsg({ ok: false, txt: 'Minimum 6 caractères' }); return }
    if (pwd !== pwd2) { setPwdMsg({ ok: false, txt: 'Les mots de passe ne correspondent pas' }); return }
    setPwdLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) {
      setPwdMsg({ ok: false, txt: error.message })
    } else {
      setPwdMsg({ ok: true, txt: 'Mot de passe mis à jour ✓' })
      setPwd(''); setPwd2('')
    }
    setPwdLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  // Détecte le mode de connexion : Google (pas de changement de mdp) vs email
  const provider = user?.app_metadata?.provider
  const isEmailUser = provider === 'email'
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Vous'

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-16">
      <header className="border-b border-white/5 sticky top-0 bg-gray-950/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Accueil
          </button>
          <button onClick={logout} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition" title="Déconnexion">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
        {/* Profil */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-black flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black truncate">{displayName}</h1>
            <p className="text-gray-500 text-sm truncate">{user?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-600">
              <Sparkles className="w-3 h-3" /> {provider === 'google' ? 'Connecté via Google' : 'Compte email'}
            </span>
          </div>
        </div>

        {/* KPIs */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={CalendarDays} label="Soirées" value={String(data.kpi.sessions)} color="text-purple-400" />
            <Kpi icon={ListMusic} label="Demandes" value={String(data.kpi.requests)} color="text-blue-400" />
            <Kpi icon={CheckCircle2} label="Jouées" value={String(data.kpi.played)} color="text-green-400" />
            <Kpi icon={Wallet} label="Total dépensé" value={formatPrice(data.kpi.totalSpent)} color="text-pink-400" />
          </div>
        )}

        {/* Soirées participées */}
        {data && data.sessions.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-gray-400" /> Vos soirées
            </h2>
            <div className="space-y-2">
              {data.sessions.map(s => (
                <div key={s.session_id} className="glass rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    s.session_type === 'karaoke' ? 'bg-pink-500/15' : 'bg-purple-500/15'
                  }`}>
                    {s.session_type === 'karaoke'
                      ? <Mic2 className="w-5 h-5 text-pink-400" />
                      : <Music2 className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-gray-500 text-xs truncate">
                      {s.dj_name ? `${s.dj_name} · ` : ''}{s.requests} demande{s.requests > 1 ? 's' : ''}
                    </p>
                  </div>
                  {s.spent > 0 && <span className="text-green-300 font-semibold text-sm flex-shrink-0">{formatPrice(s.spent)}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Historique récent */}
        {data && data.recent.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-gray-400" /> Demandes récentes
            </h2>
            <div className="space-y-2">
              {data.recent.map(r => {
                const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.paid
                return (
                  <div key={r.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                    {r.album_image
                      ? <img src={r.album_image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                      : <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0"><Music2 className="w-5 h-5 text-gray-600" /></div>}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{r.song_name}</p>
                      <p className="text-gray-500 text-xs truncate">{r.artist}{r.session_name ? ` · ${r.session_name}` : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${st.cls}`}>{st.txt}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {data && data.kpi.requests === 0 && (
          <div className="text-center py-12 text-gray-600 space-y-2">
            <Music2 className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">Vous n&apos;avez pas encore participé à une soirée.</p>
            <a href="/join" className="text-purple-400 text-sm underline underline-offset-4">Rejoindre une soirée</a>
          </div>
        )}

        {/* Sécurité — changement de mot de passe (utilisateurs email seulement) */}
        {isEmailUser && (
          <section className="space-y-3 pt-2">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" /> Sécurité
            </h2>
            <form onSubmit={changePassword} className="glass rounded-2xl p-5 space-y-3">
              <p className="text-gray-400 text-sm">Modifier votre mot de passe</p>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition pr-12"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd2}
                onChange={e => setPwd2(e.target.value)}
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
              />
              {pwdMsg && <p className={`text-sm ${pwdMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{pwdMsg.txt}</p>}
              <button type="submit" disabled={pwdLoading || !pwd}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition">
                {pwdLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Mettre à jour
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}

function Kpi({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon className={`w-5 h-5 mb-3 ${color}`} />
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  )
}
