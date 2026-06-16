'use client'
import { useState, type ReactNode } from 'react'
import { PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Lock } from 'lucide-react'

// Bloc de paiement partagé (à placer dans un <Elements>) : boutons wallet
// (Apple Pay / Google Pay / Link) + carte. `recordPayment` est l'étape
// spécifique post-autorisation (appel /confirm…), elle doit lever en cas d'échec.
export default function StripeCheckout({
  recordPayment, submitLabel, buttonClassName, icon, footer,
}: {
  recordPayment: () => Promise<void>
  submitLabel: string
  buttonClassName?: string
  icon?: ReactNode
  footer?: ReactNode
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hasWallets, setHasWallets] = useState(false)

  async function pay() {
    if (!stripe || !elements || submitting) return
    setSubmitting(true); setError('')
    const { error: payErr } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (payErr) { setError(payErr.message || 'Le paiement a échoué.'); setSubmitting(false); return }
    try { await recordPayment() }
    catch (e) { setError(e instanceof Error ? e.message : 'Paiement confirmé mais finalisation impossible.') }
    finally { setSubmitting(false) }
  }

  const btn = buttonClassName ||
    'w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 font-bold text-lg flex items-center justify-center gap-2 transition active:scale-[0.98]'

  return (
    <div className="space-y-4">
      <ExpressCheckoutElement
        onConfirm={pay}
        onReady={({ availablePaymentMethods }) => setHasWallets(!!availablePaymentMethods)}
      />
      {hasWallets && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-600 text-xs">ou payer par carte</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
      )}
      <form onSubmit={e => { e.preventDefault(); pay() }} className="space-y-4">
        <PaymentElement options={{ layout: 'tabs' }} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={!stripe || submitting} className={btn}>
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (icon ?? <Lock className="w-4 h-4" />)}
          {submitting ? 'Traitement…' : submitLabel}
        </button>
        {footer}
      </form>
    </div>
  )
}
