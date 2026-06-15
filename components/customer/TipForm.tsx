'use client'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Heart, X, ArrowLeft } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const PRESETS = [200, 500, 1000, 2000] // centimes

function Pay({ paymentIntentId, amount, onSuccess }: { paymentIntentId: string; amount: number; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true); setError('')
    const { error: payErr } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (payErr) { setError(payErr.message || 'Paiement échoué'); setSubmitting(false); return }
    try {
      const res = await fetch('/api/stripe/tip/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      onSuccess()
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={!stripe || submitting}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-pink-500 hover:brightness-110 disabled:opacity-40 font-bold text-gray-950 flex items-center justify-center gap-2 transition">
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-4 h-4" />}
        Donner {formatPrice(amount)}
      </button>
    </form>
  )
}

export default function TipForm({ sessionId, authorName, onSuccess, onClose }: {
  sessionId: string
  authorName: string
  onSuccess: () => void
  onClose: () => void
}) {
  const [custom, setCustom] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [amount, setAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startPayment(cents: number) {
    if (cents < 100) { setError('Minimum 1 €'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/stripe/tip/intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, amount: cents, author_name: authorName || null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setClientSecret(d.clientSecret); setPaymentIntentId(d.paymentIntentId); setAmount(d.amount)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-amber-400" /> Pourboire au chapeau</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>

        {!clientSecret ? (
          <>
            <p className="text-gray-400 text-sm">Soutenez l&apos;ambiance, sans demande de son. Choisissez un montant :</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(c => (
                <button key={c} onClick={() => startPayment(c)} disabled={loading}
                  className="py-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-amber-500/10 font-bold transition disabled:opacity-40">
                  {formatPrice(c)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="number" min="1" step="1" value={custom} onChange={e => setCustom(e.target.value)}
                  placeholder="Autre montant"
                  className="w-full pl-4 pr-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-400 transition" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">€</span>
              </div>
              <button onClick={() => startPayment(Math.round(parseFloat(custom || '0') * 100))} disabled={loading || !custom}
                className="px-5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold hover:bg-amber-500/30 transition disabled:opacity-40">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-gray-600 text-[11px] text-center">Paiement sécurisé Stripe · débité immédiatement</p>
          </>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#f59e0b', borderRadius: '12px' } } }}>
            <button onClick={() => setClientSecret(null)} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition mb-1">
              <ArrowLeft className="w-4 h-4" /> Changer le montant
            </button>
            <Pay paymentIntentId={paymentIntentId} amount={amount} onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  )
}
