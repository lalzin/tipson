'use client'
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { Loader2 } from 'lucide-react'

interface Props {
  requestId: string
  amount: number
  onSuccess: (data: any) => void
  onError: (err: any) => void
}

function Buttons({ requestId, onSuccess, onError }: Props) {
  const [{ isPending }] = usePayPalScriptReducer()

  if (isPending) {
    return (
      <div className="w-full py-4 flex items-center justify-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement PayPal…</span>
      </div>
    )
  }

  return (
    <PayPalButtons
      style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 }}
      createOrder={async () => {
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data.orderId
      }}
      onApprove={async (data) => {
        const res = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: data.orderID, request_id: requestId }),
        })
        const captured = await res.json()
        if (!res.ok) throw new Error(captured.error)
        onSuccess(captured)
      }}
      onError={onError}
      onCancel={() => onError(new Error('Paiement annulé'))}
    />
  )
}

export default function PayPalButton(props: Props) {
  return (
    <PayPalScriptProvider options={{
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
      currency: 'EUR',
      locale: 'fr_FR',
    }}>
      <Buttons {...props} />
    </PayPalScriptProvider>
  )
}
