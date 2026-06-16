'use client'
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  sessionId: string
  text: string
  authorName: string
  onSuccess: () => void
  onCancel: () => void
}

function Inner({ paymentIntentId, amount, onSuccess }: { paymentIntentId: string; amount: number; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hasWallets, setHasWallets] = useState(false)

  async function confirmAndRecord(): Promise<boolean> {
    if (!stripe || !elements) return false
    setError('')
    const { error: payErr } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (payErr) { setError(payErr.message || 'Paiement échoué'); return false }
    try {
      const res = await fetch('/api/stripe/super-message/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      onSuccess()
      return true
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); return false }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); await confirmAndRecord(); setSubmitting(false)
  }
  async function handleWallet() {
    setSubmitting(true); await confirmAndRecord(); setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      <ExpressCheckoutElement onConfirm={handleWallet} onReady={({ availablePaymentMethods }) => setHasWallets(!!availablePaymentMethods)} />
      {hasWallets && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" /><span className="text-gray-600 text-xs">ou payer par carte</span><div className="flex-1 h-px bg-white/10" />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement options={{ layout: 'tabs' }} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={!stripe || submitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 font-bold flex items-center justify-center gap-2 transition">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Envoyer le super message · {formatPrice(amount)}
        </button>
      </form>
    </div>
  )
}

export default function SuperMessageForm({ sessionId, text, authorName, onSuccess, onCancel }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/stripe/super-message/intent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, text, author_name: authorName, client_id: typeof localStorage !== 'undefined' ? localStorage.getItem('tipson-cid') : null }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.clientSecret) { setClientSecret(d.clientSecret); setPaymentIntentId(d.paymentIntentId); setAmount(d.amount) }
        else setError(d.error || 'Initialisation impossible')
      })
      .catch(() => setError('Erreur réseau'))
  }, [sessionId, text, authorName])

  if (error) return (
    <div className="space-y-3">
      <p className="text-red-400 text-sm text-center">{error}</p>
      <button onClick={onCancel} className="w-full py-2 text-gray-400 text-sm hover:text-white transition">Retour</button>
    </div>
  )
  if (!clientSecret) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#a855f7', borderRadius: '12px' } } }}>
      <Inner paymentIntentId={paymentIntentId} amount={amount} onSuccess={onSuccess} />
      <button onClick={onCancel} className="w-full mt-2 py-2 text-gray-500 text-xs hover:text-gray-300 transition">Annuler</button>
    </Elements>
  )
}
