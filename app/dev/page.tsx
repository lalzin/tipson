'use client'
import { useState } from 'react'
import { useRouter, notFound } from 'next/navigation'
import {
  Loader2, CheckCircle2, ExternalLink, Copy, Check,
  Music2, Users, Zap, ListMusic, AlertCircle, Terminal
} from 'lucide-react'

const SESSION_ACTIVE = { code: 'TEST01', id: 'b0000000-0000-0000-0000-000000000001', name: 'Soirée Rooftop — Vendredi', status: 'active' }
const SESSION_PAUSED = { code: 'TEST02', id: 'b0000000-0000-0000-0000-000000000002', name: 'Club Night Samedi', status: 'paused' }
const SESSION_ENDED  = { code: 'TEST03', id: 'b0000000-0000-0000-0000-000000000003', name: 'Anniversaire Julie', status: 'ended' }

export default function DevPage() {
  // Hub de développement — indisponible en production
  if ((process.env.NODE_ENV as string) === 'production') notFound()
  const router = useRouter()
  const [setupStatus, setSetupStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [setupMsg, setSetupMsg] = useState('')
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [loginError, setLoginError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-gray-400">Page de dev non disponible en production.</p>
        </div>
      </div>
    )
  }

  async function runSetup() {
    setSetupStatus('loading')
    setSetupMsg('')
    const res = await fetch('/api/dev-setup', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setSetupStatus('error')
      setSetupMsg(data.error || (data.errors?.join(' · ') ?? 'Erreur'))
      return
    }
    setSetupStatus('ok')
    setSetupMsg(data.message)
  }

  async function loginAsDJ() {
    setLoginStatus('loading')
    setLoginError('')
    const res = await fetch('/api/dev-login', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setLoginStatus('error')
      setLoginError(data.error || 'Erreur — lancez d\'abord "Initialiser les données"')
      return
    }
    setLoginStatus('ok')
    setTimeout(() => router.push('/dj/dashboard'), 800)
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <main className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <div className="border-b border-yellow-500/20 bg-yellow-500/5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Terminal className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-yellow-300 font-bold text-sm">Mode développement — TIPSON Dev Hub</p>
            <p className="text-yellow-600 text-xs">Cette page n&apos;existe pas en production</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">

        {/* ─── SETUP ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={<Terminal className="w-4 h-4" />} title="Étape 1 — Initialiser les données" />
          <div className="glass rounded-2xl p-5 space-y-3">
            <p className="text-gray-400 text-sm">
              Crée le compte DJ test et les sessions mock directement via l&apos;Admin API Supabase.
              Nécessite <code className="text-yellow-300 bg-yellow-500/10 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> dans <code className="text-gray-400">.env.local</code>.
            </p>
            <button
              onClick={runSetup}
              disabled={setupStatus === 'loading' || setupStatus === 'ok'}
              className="w-full py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              {setupStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {setupStatus === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {setupStatus === 'ok' ? 'Données initialisées ✓' : 'Initialiser les données mock'}
            </button>
            {setupStatus === 'ok' && (
              <p className="text-green-400 text-xs text-center">{setupMsg}</p>
            )}
            {setupStatus === 'error' && (
              <p className="text-red-400 text-xs text-center">{setupMsg}</p>
            )}
          </div>
        </section>

        {/* ─── CONNEXION DJ ───────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={<Users className="w-4 h-4" />} title="Étape 2 — Connexion DJ" />
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Email" value="dj@test.com" copyKey="email" copied={copied} onCopy={copy} />
              <InfoRow label="Mot de passe" value="testdj123" copyKey="pass" copied={copied} onCopy={copy} />
              <InfoRow label="Nom DJ" value="DJ Shadow" />
              <InfoRow label="PayPal" value="paypal.me/djshadowtest" />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={loginAsDJ}
                disabled={loginStatus === 'loading' || loginStatus === 'ok'}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                {loginStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                {loginStatus === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                {loginStatus === 'ok' ? 'Connecté — redirection…' : 'Se connecter comme DJ Shadow'}
              </button>
              <a
                href="/dj"
                className="px-4 py-3 rounded-xl glass text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition"
              >
                Login normal <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {loginStatus === 'error' && (
              <p className="text-red-400 text-xs text-center">
                {loginError} — Avez-vous exécuté le seed SQL ?
              </p>
            )}
          </div>
        </section>

        {/* ─── SESSIONS ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={<Music2 className="w-4 h-4" />} title="Étape 3 — Tester les sessions" />
          <div className="space-y-2">
            {[SESSION_ACTIVE, SESSION_PAUSED, SESSION_ENDED].map(s => (
              <div key={s.code} className="glass rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                    <code className="text-gray-500 text-xs font-mono">{s.code}</code>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {/* Lien client (mobile) */}
                  <a
                    href={`/session/${s.id}`}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs font-medium hover:bg-blue-500/25 transition flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" /> Client
                  </a>
                  {/* Lien DJ */}
                  <a
                    href={`/dj/session/${s.id}`}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition flex items-center gap-1"
                  >
                    <Music2 className="w-3 h-3" /> DJ
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── DEMANDES PRÉ-CHARGÉES ──────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={<ListMusic className="w-4 h-4" />} title="Demandes dans TEST01 (Rooftop)" />
          <div className="glass rounded-2xl overflow-hidden">
            {[
              { name: 'Blinding Lights — The Weeknd', type: 'priority', status: 'paid', amount: '5€', customer: 'Lucas' },
              { name: 'Levitating — Dua Lipa', type: 'normal', status: 'paid', amount: '1€', customer: 'Sarah' },
              { name: 'One More Time — Daft Punk', type: 'priority', status: 'paid', amount: '5€', customer: 'Tom' },
              { name: 'As It Was — Harry Styles', type: 'normal', status: 'approved', amount: '1€', customer: 'Emma' },
              { name: 'Roses — SAINt JHN', type: 'priority', status: 'played', amount: '5€', customer: 'Alex' },
              { name: 'Gangnam Style — PSY', type: 'normal', status: 'rejected', amount: '1€', customer: 'Marie' },
            ].map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono flex-shrink-0 ${r.type === 'priority' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {r.type === 'priority' ? '⚡' : '🎵'} {r.amount}
                </span>
                <span className="text-gray-300 text-xs flex-1 truncate">{r.name}</span>
                <span className="text-gray-600 text-xs flex-shrink-0">{r.customer}</span>
                <StatusBadge status={r.status} small />
              </div>
            ))}
          </div>
        </section>

        {/* ─── SCÉNARIOS DE TEST ──────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={<Zap className="w-4 h-4" />} title="Scénarios à tester" />
          <div className="space-y-2">
            {[
              {
                label: 'Flow client complet',
                desc: 'Aller sur /join, code TEST01, chercher un son, choisir "La chanson maintenant" (5€), remplir le formulaire, aller sur PayPal, cliquer J\'ai payé → suivre le statut en temps réel',
                link: '/join',
                linkLabel: 'Ouvrir /join',
                color: 'blue',
              },
              {
                label: 'Dashboard DJ en live',
                desc: 'Se connecter comme DJ Shadow, ouvrir la session TEST01. Ouvrir simultanément l\'app client dans un autre onglet. Soumettre une demande et la voir arriver en temps réel avec notification sonore.',
                link: `/dj/session/${SESSION_ACTIVE.id}`,
                linkLabel: 'Session live',
                color: 'purple',
              },
              {
                label: 'Suivi statut client',
                desc: 'Depuis l\'app client, faire une demande et cliquer "J\'ai payé". Dans l\'onglet DJ, valider la demande → le statut change en vert côté client en temps réel.',
                link: null,
                color: 'green',
              },
              {
                label: 'QR Code & partage',
                desc: 'Dans le dashboard DJ, cliquer l\'icône QR sur une session → tester le téléchargement du QR et le lien de partage.',
                link: '/dj/dashboard',
                linkLabel: 'Dashboard',
                color: 'yellow',
              },
            ].map((scenario, i) => (
              <div key={i} className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-sm">{scenario.label}</p>
                  {scenario.link && (
                    <a href={scenario.link} className="text-purple-400 text-xs hover:text-purple-300 flex items-center gap-1 flex-shrink-0 transition">
                      {scenario.linkLabel} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{scenario.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SETUP RAPIDE ───────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={<Terminal className="w-4 h-4" />} title="Setup — checklist" />
          <div className="glass rounded-2xl p-4 space-y-2 font-mono text-xs">
            {[
              { step: '1. Exécutez supabase/schema.sql dans SQL Editor', done: false },
              { step: '2. Exécutez supabase/seed.sql dans SQL Editor', done: false },
              { step: '3. Activez Email/Password auth dans Supabase → Auth → Providers', done: false },
              { step: '4. Copiez .env.example → .env.local avec vos clés', done: false },
              { step: '5. Cliquez "Se connecter comme DJ Shadow" ci-dessus', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-gray-400">
                <span className="text-gray-700 flex-shrink-0">{i + 1}.</span>
                <span>{item.step.replace(/^\d+\. /, '')}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-purple-400">{icon}</span>
      <h2 className="font-bold text-sm uppercase tracking-widest text-gray-300">{title}</h2>
    </div>
  )
}

function InfoRow({ label, value, copyKey, copied, onCopy }: {
  label: string; value: string; copyKey?: string; copied?: string | null; onCopy?: (v: string, k: string) => void
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-gray-600 text-xs">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-gray-200 font-mono text-sm">{value}</p>
        {copyKey && onCopy && (
          <button onClick={() => onCopy(value, copyKey)} className="text-gray-600 hover:text-gray-400 transition">
            {copied === copyKey ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const map: Record<string, { label: string; class: string }> = {
    active:   { label: 'Actif',     class: 'bg-green-500/20 text-green-400' },
    paused:   { label: 'Pause',     class: 'bg-yellow-500/20 text-yellow-400' },
    ended:    { label: 'Terminée',  class: 'bg-gray-500/20 text-gray-500' },
    paid:     { label: 'À valider', class: 'bg-purple-500/20 text-purple-300' },
    approved: { label: 'Validée',   class: 'bg-blue-500/20 text-blue-300' },
    played:   { label: 'Jouée',     class: 'bg-green-500/20 text-green-400' },
    rejected: { label: 'Refusée',   class: 'bg-red-500/20 text-red-400' },
  }
  const cfg = map[status] || { label: status, class: 'bg-gray-500/20 text-gray-400' }
  return (
    <span className={`${cfg.class} ${small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full font-medium`}>
      {cfg.label}
    </span>
  )
}
