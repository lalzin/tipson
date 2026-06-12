import type { Metadata, Viewport } from 'next'
import './globals.css'
import CookieNotice from '@/components/CookieNotice'

export const metadata: Metadata = {
  title: 'TIPSON — Demandez vos sons',
  description: 'Envoyez une demande musicale à votre DJ en quelques secondes',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        {children}
        <CookieNotice />
      </body>
    </html>
  )
}
