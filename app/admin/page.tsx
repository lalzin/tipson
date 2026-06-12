'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Shield, Loader2, Check, X, Music2, Crown, LogOut, Search, Users,
  Radio, Mic2, Wallet, TrendingUp, Clock, RefreshCw, Activity, UserPlus, Filter,
} from 'lucide-react'

interface AdminUser {
  id: string
  dj_name: string
  email: string | null
  is_dj: boolean
  is_admin: boolean
  created_at: string
  sessionCount: number
  revenue: number
}

interface Stats {
  users: { total: number; djs: number; admins: number; pending: number; new7d: number }
  sessions: { total: number; active: number; paused: number; ended: number; dj: number; karaoke: number; new7d: number }
  requests: { total: number; paid: number; refunded: number; priority: number }
  revenue: { gross: number; refunded: number; net: number; avgPerRequest: number }
  daily: { date: string; revenue: number; requests: number }[]
}

type RoleFilter = 'all' | 'dj' | 'admin' | 'pending'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [refreshing, setRefreshing] = useState(false)

  async function loadData() {
    const [uRes, sRes] = await Promise.all([
      fetch('/api/admin/users', { cache: 'no-store' }),
      fetch('/api/admin/stats', { cache: 'no-store' }),
    ])
    if (uRes.status === 403 || uRes.status === 401) { setDenied(true); return }
    if (uRes.ok) setUsers(await uRes.json())
    if (sRes.ok) setStats(await sRes.json())
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/dj'); return }
      await loadData()
      setLoading(false)
    }
    init()
  }, [router])

  async function refresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  async function toggle(u: AdminUser, field: 'is_dj' | 'is_admin') {
    setSaving(u.id + field)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, [field]: !u[field] }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(list => list.map(x => x.id === u.id ? { ...x, ...updated } : x))
      refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Erreur')
    }
    setSaving(null)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/dj')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-4 bg-gray-950">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold">Accès refusé</h1>
        <p className="text-gray-400 text-sm">Cette zone est réservée aux administrateurs.</p>
        <a href="/dj/dashboard" className="text-purple-400 underline underline-offset-4 text-sm">Retour</a>
      </div>
    )
  }

  const filtered = users.filter(u => {
    if (roleFilter === 'dj' && !u.is_dj) return false
    if (roleFilter === 'admin' && !u.is_admin) return false
    if (roleFilter === 'pending' && (u.is_dj || u.is_admin)) return false
    return !query ||
      u.dj_name?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase())
  })

  const maxDaily = Math.max(1, ...(stats?.daily.map(d => d.revenue) ?? [1]))

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/5 sticky top-0 bg-gray-950/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg leading-none">Administration</h1>
              <p className="text-gray-500 text-xs mt-1">Vue d&apos;ensemble de la plateforme</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={refresh} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition" title="Rafraîchir">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => router.push('/dj/dashboard')} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition" title="Dashboard DJ">
              <Music2 className="w-5 h-5" />
            </button>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition" title="Déconnexion">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        {/* ── KPIs principaux ─────────────────────────────────── */}
        {stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Wallet} color="green" label="Revenu net" value={formatPrice(stats.revenue.net)}
                sub={`Brut ${formatPrice(stats.revenue.gross)} · Remb. ${formatPrice(stats.revenue.refunded)}`} />
              <Kpi icon={Users} color="blue" label="Comptes" value={String(stats.users.total)}
                sub={`+${stats.users.new7d} cette semaine`} />
              <Kpi icon={Radio} color="purple" label="Soirées" value={String(stats.sessions.total)}
                sub={`${stats.sessions.active} en direct`} />
              <Kpi icon={TrendingUp} color="pink" label="Demandes payées" value={String(stats.requests.paid)}
                sub={`Panier moyen ${formatPrice(stats.revenue.avgPerRequest)}`} />
            </div>

            {/* ── Détails secondaires ───────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat icon={Music2} label="Organisateurs" value={stats.users.djs} accent="text-purple-300" />
              <MiniStat icon={Crown} label="Admins" value={stats.users.admins} accent="text-yellow-300" />
              <MiniStat icon={UserPlus} label="En attente" value={stats.users.pending} accent="text-gray-300" />
              <MiniStat icon={Mic2} label="Karaokés" value={stats.sessions.karaoke} accent="text-pink-300" />
            </div>

            {/* ── Graphique d'activité ──────────────────────────── */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-sm">Revenus — 14 derniers jours</h3>
                </div>
                <span className="text-gray-500 text-xs">{stats.requests.priority} demandes prioritaires</span>
              </div>
              <div className="flex items-end gap-1.5 h-32">
                {stats.daily.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full bg-gradient-to-t from-purple-600 to-pink-500 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${Math.max(2, (d.revenue / maxDaily) * 100)}%` }} />
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-xs whitespace-nowrap z-10 pointer-events-none">
                      {formatPrice(d.revenue)} · {d.requests} dem.
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-600">
                <span>{stats.daily[0]?.date.slice(5)}</span>
                <span>Aujourd&apos;hui</span>
              </div>
            </div>

            {/* ── Répartition sessions ──────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              <StatusPill label="En direct" value={stats.sessions.active} color="bg-green-500" />
              <StatusPill label="En pause" value={stats.sessions.paused} color="bg-yellow-500" />
              <StatusPill label="Terminées" value={stats.sessions.ended} color="bg-gray-500" />
            </div>
          </>
        )}

        {/* ── Gestion des comptes ─────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" /> Comptes
            </h2>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un nom ou email…"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-sm"
              />
            </div>
            <div className="flex gap-1.5 bg-white/5 rounded-2xl p-1 border border-white/10">
              {(['all', 'dj', 'admin', 'pending'] as RoleFilter[]).map(f => (
                <button key={f} onClick={() => setRoleFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition flex-1 sm:flex-none whitespace-nowrap ${
                    roleFilter === f ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}>
                  {f === 'all' ? 'Tous' : f === 'dj' ? 'DJ' : f === 'admin' ? 'Admins' : 'En attente'}
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 font-bold text-gray-400">
                    {(u.dj_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate flex items-center gap-1.5">
                      {u.dj_name || 'Sans nom'}
                      {u.is_admin && <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{u.email ?? u.id.slice(0, 8)}</p>
                    {(u.sessionCount > 0 || u.revenue > 0) && (
                      <p className="text-gray-600 text-xs mt-0.5">
                        {u.sessionCount} soirée{u.sessionCount > 1 ? 's' : ''} · {formatPrice(u.revenue)} générés
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(u, 'is_dj')}
                    disabled={saving === u.id + 'is_dj'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                      u.is_dj ? 'bg-purple-600/25 border border-purple-500/40 text-purple-300'
                        : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                    }`}>
                    {saving === u.id + 'is_dj'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : u.is_dj ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    DJ
                  </button>
                  <button
                    onClick={() => toggle(u, 'is_admin')}
                    disabled={saving === u.id + 'is_admin'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                      u.is_admin ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
                        : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                    }`}>
                    {saving === u.id + 'is_admin'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Crown className="w-3.5 h-3.5" />}
                    Admin
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-12">Aucun compte trouvé</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

const COLORS: Record<string, string> = {
  green: 'text-green-400 bg-green-500/10 border-green-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  pink: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
}

function Kpi({ icon: Icon, color, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>; color: string; label: string; value: string; sub: string
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${COLORS[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
      <p className="text-gray-600 text-xs mt-1 truncate">{sub}</p>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent: string
}) {
  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${accent}`} />
      <div>
        <p className="text-xl font-black leading-none">{value}</p>
        <p className="text-gray-500 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function StatusPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="ml-auto font-bold">{value}</span>
    </div>
  )
}
