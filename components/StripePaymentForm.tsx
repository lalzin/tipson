'use client'
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Lock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  requestId: string
  amount: number
  onSuccess: (data: unknown) => void
  onError: (err: unknown) => void
}

function InnerForm({ requestId, amount, onSuccess, onError }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')

    // Autorise le paiement (fonds bloqués, non débités)
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message || 'Le paiement a échoué.')
      setSubmitting(false)
      onError(confirmError)
      return
    }

    // Vérifie côté serveur que l'autorisation est en place → marque la demande payée
    try {
      const res = await fetch('/api/stripe/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSuccess(data)
    } catch (err) {
      setError('Paiement autorisé mais confirmation impossible. Contactez le DJ.')
      onError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 font-bold text-lg flex items-center justify-center gap-2 transition active:scale-[0.98]"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
        {submitting ? 'Traitement…' : `Payer ${formatPrice(amount)}`}
      </button>
      <p className="text-center text-gray-600 text-xs flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Paiement sécurisé par Stripe · débité seulement si le DJ accepte
      </p>
    </form>
  )
}

export default function StripePaymentForm(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/stripe/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: props.requestId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) setClientSecret(data.clientSecret)
        else setError(data.error || 'Initialisation du paiement impossible')
      })
      .catch(() => setError('Erreur réseau'))
  }, [props.requestId])

  if (error) return <p className="text-red-400 text-sm text-center py-4">{error}</p>
  if (!clientSecret) {
    return (
      <div className="w-full py-8 flex items-center justify-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement du paiement…</span>
      </div>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#a855f7',
            colorBackground: '#1f2937',
            borderRadius: '12px',
          },
        },
      }}
    >
      <InnerForm {...props} />
    </Elements>
  )
}
