'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Store, UserPlus, PackagePlus, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'

interface Status {
  readyToReceivePayments: boolean
  onboardingComplete: boolean
  requirementsStatus: string | null
}
interface Product {
  id: string; name: string; description: string | null
  priceId: string | null; unitAmount: number | null; currency: string
  connectedAccountId: string | null
}

const eur = (cents: number | null) =>
  cents == null ? '' : (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

function ConnectDemo() {
  const params = useSearchParams()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Formulaire compte
  const [displayName, setDisplayName] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Formulaire produit
  const [pName, setPName] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pPrice, setPPrice] = useState('')

  const [products, setProducts] = useState<Product[]>([])

  // Réservé aux administrateurs
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(p => setAllowed(!!p?.is_admin))
      .catch(() => setAllowed(false))
  }, [])

  // Récupère l'accountId (retour d'onboarding via ?accountId, sinon localStorage)
  useEffect(() => {
    const fromUrl = params.get('accountId')
    const stored = typeof window !== 'undefined' ? localStorage.getItem('connect-demo-account') : null
    const id = fromUrl || stored
    if (id) {
      setAccountId(id)
      localStorage.setItem('connect-demo-account', id)
    }
  }, [params])

  const loadStatus = useCallback(async (id: string) => {
    const res = await fetch(`/api/connect-demo/account-status?accountId=${id}`)
    const data = await res.json()
    if (res.ok) setStatus(data)
  }, [])

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/connect-demo/products')
    const data = await res.json()
    if (res.ok) setProducts(data.products)
  }, [])

  useEffect(() => { if (accountId) loadStatus(accountId) }, [accountId, loadStatus])
  useEffect(() => { loadProducts() }, [loadProducts])

  async function createAccount() {
    setBusy('account'); setError('')
    try {
      const res = await fetch('/api/connect-demo/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, contact_email: contactEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('connect-demo-account', data.accountId)
      setAccountId(data.accountId)
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  async function onboard() {
    if (!accountId) return
    setBusy('onboard'); setError('')
    try {
      const res = await fetch('/api/connect-demo/account-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e: any) { setError(e.message); setBusy(null) }
  }

  async function createProduct() {
    setBusy('product'); setError('')
    try {
      const res = await fetch('/api/connect-demo/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pName, description: pDesc,
          priceInCents: Math.round(parseFloat(pPrice) * 100),
          connectedAccountId: accountId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPName(''); setPDesc(''); setPPrice('')
      loadProducts()
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  async function buy(productId: string) {
    setBusy('buy-' + productId); setError('')
    try {
      const res = await fetch('/api/connect-demo/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e: any) { setError(e.message); setBusy(null) }
  }

  if (allowed === null) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
  }
  if (!allowed) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6 text-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <h1 className="text-xl font-bold">Accès réservé aux administrateurs</h1>
        <a href="/" className="text-purple-400 underline underline-offset-4 text-sm">Retour à l&apos;accueil</a>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 space-y-8">
        <header>
          <h1 className="text-3xl font-black tracking-tight">Démo Stripe Connect (V2)</h1>
          <p className="text-gray-500 text-sm mt-1">Onboarding · Produits · Storefront · Destination charges</p>
        </header>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        {/* 1. Compte connecté + onboarding */}
        <section className="glass rounded-2xl p-5 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><UserPlus className="w-4 h-4 text-purple-400" /> 1. Compte connecté</h2>

          {!accountId ? (
            <div className="space-y-3">
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nom affiché (display_name)"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500 transition" />
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email (contact_email)" type="email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500 transition" />
              <button onClick={createAccount} disabled={busy === 'account' || !displayName || !contactEmail}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition">
                {busy === 'account' && <Loader2 className="w-4 h-4 animate-spin" />} Créer le compte connecté
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-mono break-all">{accountId}</p>
              {status && (
                <div className="flex flex-wrap gap-2">
                  <Badge ok={status.onboardingComplete} label={status.onboardingComplete ? 'Onboarding complet' : 'Onboarding requis'} />
                  <Badge ok={status.readyToReceivePayments} label={status.readyToReceivePayments ? 'Prêt à recevoir' : 'Pas encore prêt'} />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onboard} disabled={busy === 'onboard'}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition">
                  {busy === 'onboard' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Onboard to collect payments
                </button>
                <button onClick={() => loadStatus(accountId)} className="px-4 py-3 rounded-xl glass hover:bg-white/8 text-sm transition">
                  Rafraîchir
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 2. Créer un produit */}
        <section className="glass rounded-2xl p-5 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><PackagePlus className="w-4 h-4 text-pink-400" /> 2. Créer un produit</h2>
          {!accountId ? (
            <p className="text-gray-500 text-sm">Créez d&apos;abord un compte connecté ci-dessus.</p>
          ) : (
            <div className="space-y-3">
              <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Nom du produit"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-pink-500 transition" />
              <input value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Description (optionnel)"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-pink-500 transition" />
              <input value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="Prix en € (ex : 9.99)" type="number" step="0.01" min="0.5"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-pink-500 transition" />
              <button onClick={createProduct} disabled={busy === 'product' || !pName || !pPrice}
                className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition">
                {busy === 'product' && <Loader2 className="w-4 h-4 animate-spin" />} Créer le produit
              </button>
              <p className="text-gray-600 text-xs">Le produit est créé au niveau plateforme et rattaché à ce compte connecté.</p>
            </div>
          )}
        </section>

        {/* 3. Storefront */}
        <section className="glass rounded-2xl p-5 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><Store className="w-4 h-4 text-green-400" /> 3. Storefront</h2>
          {products.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun produit pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    {p.description && <p className="text-gray-400 text-xs truncate">{p.description}</p>}
                    <p className="text-gray-600 text-[11px] font-mono truncate">→ {p.connectedAccountId}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-bold text-green-300">{eur(p.unitAmount)}</span>
                    <button onClick={() => buy(p.id)} disabled={busy === 'buy-' + p.id}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-sm font-semibold flex items-center gap-1.5 transition">
                      {busy === 'buy-' + p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Acheter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
      ok ? 'bg-green-500/15 text-green-300 border-green-500/25' : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25'
    }`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {label}
    </span>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>}>
      <ConnectDemo />
    </Suspense>
  )
}
