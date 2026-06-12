'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'tipson-cookie-notice'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // N'affiche que si l'utilisateur n'a pas déjà fermé le bandeau
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:left-5 sm:right-auto z-50 sm:max-w-sm">
      <div className="glass-strong rounded-2xl p-4 shadow-2xl shadow-black/40 border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Cookie className="w-4 h-4 text-purple-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-200 leading-relaxed">
              Nous utilisons uniquement des cookies <strong>essentiels</strong> (connexion et
              sécurité des paiements). Aucune publicité, aucun traçage.
            </p>
            <div className="flex items-center gap-3 mt-2.5">
              <button
                onClick={dismiss}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
              >
                J&apos;ai compris
              </button>
              <Link
                href="/confidentialite"
                onClick={dismiss}
                className="text-xs text-gray-400 hover:text-white underline underline-offset-2 transition"
              >
                En savoir plus
              </Link>
            </div>
          </div>
          <button onClick={dismiss} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition flex-shrink-0" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
