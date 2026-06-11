const BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

let tokenCache: { token: string; expiresAt: number } | null = null

export async function getPayPalToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('PayPal auth failed')
  const data = await res.json()
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  return tokenCache.token
}

export async function createPayPalOrder(amountEur: number, description: string) {
  const token = await getPayPalToken()
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'EUR', value: (amountEur / 100).toFixed(2) },
        description,
      }],
    }),
  })
  if (!res.ok) throw new Error('PayPal create order failed')
  return res.json()
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalToken()
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('PayPal capture failed')
  return res.json()
}

export async function refundPayPalCapture(captureId: string, amountEur: number) {
  const token = await getPayPalToken()
  const res = await fetch(`${BASE}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: { currency_code: 'EUR', value: (amountEur / 100).toFixed(2) },
      note_to_payer: 'Remboursement TIPSON — demande non acceptée par le DJ',
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`PayPal refund failed: ${JSON.stringify(err)}`)
  }
  return res.json()
}
