'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react'
import type { Profile } from '@/types'

export default function DJSettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [djName, setDjName] = useState('')
  const [paypalUrl, setPaypalUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(p => {
        setProfile(p)
        setDjName(p.dj_name || '')
        setPaypalUrl(p.paypal_me_url || '')
        setLoading(false)
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    // Normalise l'URL PayPal
    let normalizedPaypal = paypalUrl.trim()
    if (normalizedPaypal && !normalizedPaypal.startsWith('https://')) {
      if (normalizedPaypal.startsWith('paypal.me/')) {
        normalizedPaypal = `https://${normalizedPaypal}`
      } else if (!normalizedPaypal.includes('/')) {
        normalizedPaypal = `https://paypal.me/${normalizedPaypal}`
      }
    }

    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dj_name: djName, paypal_me_url: normalizedPaypal }),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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

      <div className="max-w-lg mx-auto px-6 py-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Nom DJ */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Nom de scène</label>
            <input
              type="text"
              value={djName}
              onChange={e => setDjName(e.target.value)}
              placeholder="DJ Shadow"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* PayPal */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Lien PayPal.me</label>
            <input
              type="text"
              value={paypalUrl}
              onChange={e => setPaypalUrl(e.target.value)}
              placeholder="paypal.me/votrenom  ou  VotreNom"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
            <p className="text-gray-500 text-xs">
              Entrez votre identifiant PayPal.me (ex: <code className="text-gray-400">paypal.me/djshadow</code>).
              Les clients seront redirigés vers ce lien avec le montant pré-rempli.
            </p>
            {paypalUrl && (
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-400 text-xs">Aperçu lien :</p>
                <p className="text-purple-300 text-sm font-mono break-all">
                  {paypalUrl.startsWith('https://') ? paypalUrl : `https://paypal.me/${paypalUrl.replace('paypal.me/', '')}`}/2,00
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </main>
  )
}
