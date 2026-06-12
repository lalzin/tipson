'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, CheckCircle2, Wallet, ExternalLink, AlertCircle, BadgeCheck } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface PayoutStatus {
  onboarded: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  available: number
  pending: number
  feePercent: number
}

export default function DJSettingsPage() {
  const router = useRouter()
  const [djName, setDjName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [payout, setPayout] = useState<PayoutStatus | null>(null)
  const [payoutLoading, setPayoutLoading] = useState(true)
  const [action, setAction] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(p => { setDjName(p.dj_name || ''); setLoading(false) })

    fetch('/api/stripe/connect/status', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(setPayout)
      .finally(() => setPayoutLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(false)
    await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dj_name: djName }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function startOnboarding() {
    setAction(true)
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) { window.location.href = data.url; return }
      alert(data.error || `Erreur (${res.status}). Réessayez.`)
    } catch {
      alert('Erreur réseau. Réessayez.')
    } finally {
      setAction(false)
    }
  }

  async function openDashboard() {
    setAction(true)
    try {
      const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) { window.location.href = data.url; return }
      alert(data.error || `Erreur (${res.status}). Réessayez.`)
    } catch {
      alert('Erreur réseau. Réessayez.')
    } finally {
      setAction(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 pb-20">
      <div className="border-b border-white/5 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dj/dashboard')} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold">Paramètres</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
        {/* Profil */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Nom de scène</label>
            <input
              type="text" value={djName} onChange={e => setDjName(e.target.value)} placeholder="DJ Shadow"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </form>

        {/* Versements / Stripe Connect */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-400" />
            <h2 className="font-bold text-lg">Versements</h2>
          </div>

          {payoutLoading ? (
            <div className="glass rounded-2xl p-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : !payout ? (
            <div className="glass rounded-2xl p-4 text-sm text-gray-400">Statut indisponible pour le moment.</div>
          ) : payout.payouts_enabled ? (
            // ── Compte actif ──
            <div className="space-y-3">
              <div className="rounded-2xl border border-green-500/25 bg-green-500/5 p-4 flex items-center gap-3">
                <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-300 text-sm">Versements activés</p>
                  <p className="text-gray-400 text-xs">Vos revenus sont virés automatiquement sur votre compte bancaire.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-2xl p-4">
                  <p className="text-2xl font-black text-green-300">{formatPrice(payout.available)}</p>
                  <p className="text-gray-500 text-xs mt-1">Disponible</p>
                </div>
                <div className="glass rounded-2xl p-4">
                  <p className="text-2xl font-black text-gray-300">{formatPrice(payout.pending)}</p>
                  <p className="text-gray-500 text-xs mt-1">En attente</p>
                </div>
              </div>

              <button onClick={openDashboard} disabled={action}
                className="w-full py-3.5 rounded-2xl glass hover:bg-white/8 font-medium flex items-center justify-center gap-2 transition disabled:opacity-50">
                {action ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Voir mes virements et coordonnées
              </button>

              <FeeNote percent={payout.feePercent} />
            </div>
          ) : payout.onboarded ? (
            // ── Onboarding commencé mais incomplet ──
            <div className="space-y-3">
              <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-300 text-sm">Configuration à finaliser</p>
                  <p className="text-gray-400 text-xs">Il manque des informations pour activer vos virements.</p>
                </div>
              </div>
              <button onClick={startOnboarding} disabled={action}
                className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition">
                {action ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Finaliser la configuration
              </button>
              <FeeNote percent={payout.feePercent} />
            </div>
          ) : (
            // ── Pas encore configuré ──
            <div className="space-y-3">
              <div className="glass rounded-2xl p-4 space-y-2">
                <p className="text-gray-300 text-sm font-medium">Recevez vos pourboires sur votre compte</p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Configurez vos coordonnées bancaires et votre identité de façon sécurisée via Stripe.
                  Vos revenus sont ensuite virés automatiquement. Sans cette étape, vos pourboires ne
                  peuvent pas vous être reversés.
                </p>
              </div>
              <button onClick={startOnboarding} disabled={action}
                className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition">
                {action ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Configurer mes versements
              </button>
              <FeeNote percent={payout.feePercent} />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function FeeNote({ percent }: { percent: number }) {
  return (
    <p className="text-gray-600 text-xs leading-relaxed">
      Sur chaque pourboire : commission TIPSON de <strong className="text-gray-400">{percent}%</strong>,
      plus les frais de paiement Stripe (~1,5% + 0,25&nbsp;€). Le reste vous revient intégralement.
    </p>
  )
}
