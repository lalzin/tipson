'use client'
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Loader2, Lock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import StripeCheckout from '@/components/customer/StripeCheckout'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  requestId: string
  amount: number
  onSuccess: (data: unknown) => void
  onError: (err: unknown) => void
}

function InnerForm({ requestId, amount, onSuccess, onError }: Props) {
  // Marque la demande payée après autorisation (vérif serveur)
  async function finalize() {
    try {
      const res = await fetch('/api/stripe/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSuccess(data)
    } catch (err) { onError(err); throw err }
  }

  return (
    <StripeCheckout
      recordPayment={finalize}
      submitLabel={`Payer ${formatPrice(amount)}`}
      icon={<Lock className="w-4 h-4" />}
      footer={
        <p className="text-center text-gray-600 text-xs flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Paiement sécurisé par Stripe · débité seulement si le DJ accepte
        </p>
      }
    />
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
