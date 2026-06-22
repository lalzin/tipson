import Link from 'next/link'
import type { Metadata } from 'next'
import { Unbounded, Sora } from 'next/font/google'
import {
  Sparkles, Activity, Zap, SlidersHorizontal, ImageIcon, MessageSquare,
  QrCode, MonitorPlay, Wifi, Keyboard, ArrowRight,
} from 'lucide-react'
import LandingNav from '@/components/LandingNav'
import { LogoBadge } from '@/components/Logo'
import Reveal from '@/components/landing/Reveal'
import TiltCard from '@/components/landing/TiltCard'
import StudioDownload from '@/components/landing/StudioDownload'

const display = Unbounded({ subsets: ['latin'], weight: ['500', '700', '900'], variable: '--font-display' })
const body = Sora({ subsets: ['latin'], weight: ['300', '400', '600', '700'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'TIPSON Studio — le visualiseur live pour DJ',
  description: 'Application desktop (Mac/Windows) : visualiseur Milkdrop réactif au son, overlay des demandes et messages en direct, strobe, blackout, contrôle MIDI et médias. Réservé aux comptes DJ.',
}

export default function StudioLanding() {
  return (
    <main className={`${display.variable} ${body.variable} font-body relative min-h-screen overflow-x-hidden bg-[#06060b] text-white`}>
      {/* Atmosphère */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="lp-aurora absolute -top-40 left-[8%] h-[520px] w-[520px] rounded-full bg-fuchsia-600/25 blur-[130px]" />
        <div className="lp-aurora absolute top-[30%] right-[2%] h-[460px] w-[460px] rounded-full bg-cyan-500/20 blur-[130px]" style={{ animationDelay: '4s' }} />
        <div className="lp-aurora absolute bottom-[6%] left-[26%] h-[420px] w-[420px] rounded-full bg-violet-700/20 blur-[130px]" style={{ animationDelay: '8s' }} />
        <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at center, black, transparent 78%)' }} />
      </div>
      <div className="lp-grain" />

      <div className="relative z-10">
        <LandingNav />

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-10 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="text-center lg:text-left">
            <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
              <MonitorPlay className="h-3.5 w-3.5 text-cyan-300" /> Application desktop · Mac &amp; Windows
            </div>

            <h1 className="font-display mt-6 text-[2.6rem] font-black leading-[0.95] sm:text-6xl lg:text-[4.3rem]">
              <span className="lp-rise block" style={{ animationDelay: '0.1s' }}>TIPSON</span>
              <span className="lp-rise lp-shimmer block bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-fuchsia-400" style={{ animationDelay: '0.2s' }}>Studio</span>
            </h1>

            <p className="lp-rise mx-auto mt-6 max-w-xl text-base text-gray-400 sm:text-lg lg:mx-0" style={{ animationDelay: '0.35s' }}>
              Le visualiseur live qui réagit à ta musique. Projette le visuel Milkdrop, affiche les
              demandes et messages du public en direct, déclenche strobe, blackout, médias et presets —
              au clavier ou à ton contrôleur MIDI.
            </p>

            <div className="lp-rise mt-9" style={{ animationDelay: '0.5s' }}>
              <StudioDownload />
            </div>
          </div>

          {/* Aperçu animé du logiciel */}
          <div className="lp-rise" style={{ animationDelay: '0.3s' }}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-900/40 shadow-2xl shadow-fuchsia-900/20 backdrop-blur">
              {/* barre de fenêtre */}
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/70" />
                <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-xs text-gray-400">TIPSON Studio</span>
              </div>
              {/* scène */}
              <div className="relative h-72 overflow-hidden bg-gradient-to-br from-fuchsia-900/40 via-[#0b0b14] to-cyan-900/30 sm:h-80">
                {/* equalizer */}
                <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center gap-1.5 px-6 pb-0 opacity-70">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span key={i} className="w-2 flex-1 animate-pulse rounded-t bg-gradient-to-t from-fuchsia-500 to-cyan-300"
                      style={{ height: `${25 + ((i * 37) % 60)}%`, animationDelay: `${(i % 7) * 0.12}s`, animationDuration: `${0.8 + (i % 4) * 0.25}s` }} />
                  ))}
                </div>
                {/* logo réactif central */}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="lp-aurora">
                    <LogoBadge className="h-20 w-20 drop-shadow-[0_0_30px_rgba(217,70,239,0.7)]" rounded={22} gradient={['#d946ef', '#22d3ee']} />
                  </div>
                </div>
                {/* chips overlay */}
                <div className="absolute left-4 top-4 rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  🎧 DJ NOVA
                </div>
                <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-bold text-fuchsia-100 backdrop-blur">
                  ⚡ EXPRESS VALIDÉ
                </div>
                <div className="absolute bottom-3 left-0 right-0 overflow-hidden">
                  <div className="lp-marquee whitespace-nowrap text-sm text-white/80">
                    <span className="mx-6">💬 Énorme set !</span><span className="mx-6">❤️ One more time</span><span className="mx-6">🔥 +1</span>
                    <span className="mx-6">💬 Énorme set !</span><span className="mx-6">❤️ One more time</span><span className="mx-6">🔥 +1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FONCTIONS ────────────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal className="text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-fuchsia-400">Le logiciel</p>
            <h2 className="font-display mt-3 text-3xl font-black sm:text-5xl">Tout pour un visuel qui vit</h2>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Activity, glow: 'rgba(217,70,239,0.35)', ring: 'border-fuchsia-500/25', a: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/25', t: 'Visualiseur réactif', d: 'Moteur Milkdrop (Butterchurn) piloté par le son : ligne, micro ou beat. Des centaines de presets, fondu fluide.' },
              { icon: Sparkles, glow: 'rgba(34,211,238,0.35)', ring: 'border-cyan-500/25', a: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/25', t: 'Logo réactif', d: 'Le logo change de couleur et pulse au rythme de la basse. Déplaçable et redimensionnable comme chaque bloc.' },
              { icon: MessageSquare, glow: 'rgba(236,72,153,0.35)', ring: 'border-pink-500/25', a: 'text-pink-300 bg-pink-500/15 border-pink-500/25', t: 'Overlay en direct', d: 'Demandes validées, messages défilants, super messages géants, emojis et votes — synchronisés avec ta soirée TIPSON.' },
              { icon: Zap, glow: 'rgba(250,204,21,0.35)', ring: 'border-amber-500/25', a: 'text-amber-300 bg-amber-500/15 border-amber-500/25', t: 'Strobe & Blackout', d: 'Stroboscope à vitesse réglable (maintien de touche S) et blackout instantané (B) pour ponctuer les drops.' },
              { icon: ImageIcon, glow: 'rgba(139,92,246,0.35)', ring: 'border-violet-500/25', a: 'text-violet-300 bg-violet-500/15 border-violet-500/25', t: 'Médias image / vidéo', d: 'Intègre tes visuels, règle leur opacité pour les fondre avec le visualiseur, change-les au clavier ou en MIDI.' },
              { icon: SlidersHorizontal, glow: 'rgba(16,185,129,0.35)', ring: 'border-emerald-500/25', a: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25', t: 'Contrôle MIDI', d: 'Mappe chaque action sur ton contrôleur : presets, strobe, blackout, médias, opacité. Apprentissage en un clic.' },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 80}>
                <TiltCard glow={f.glow} className="h-full">
                  <div className={`flex h-full flex-col rounded-[1.6rem] border ${f.ring} bg-gray-900/40 p-7 backdrop-blur-sm`}>
                    <div className={`lp-tilt-deep mb-5 grid h-14 w-14 place-items-center rounded-2xl border ${f.a}`}>
                      <f.icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-xl font-bold">{f.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.d}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── EN 3 ÉTAPES ──────────────────────────────────────── */}
        <section className="relative mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-black sm:text-5xl">Prêt en trois étapes</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {[
              { n: '01', icon: Keyboard, t: 'Connecte-toi', d: 'Mêmes identifiants que tipson.online. Ton compte DJ ouvre l\'application.' },
              { n: '02', icon: QrCode, t: 'Entre le code soirée', d: 'Le Studio se synchronise à ta soirée en direct : demandes, messages, votes.' },
              { n: '03', icon: Wifi, t: 'Compose ton écran', d: 'Branche le son, glisse tes blocs, mappe ton MIDI. Projette et fais vivre la salle.' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-4xl font-black text-white/10">{s.n}</span>
                    <s.icon className="h-6 w-6 text-cyan-300" />
                  </div>
                  <h3 className="font-display mt-4 text-xl font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm text-gray-400">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA TÉLÉCHARGEMENT ───────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 p-10 text-center sm:p-16">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-900/40 via-gray-950 to-cyan-900/30" />
              <div className="lp-aurora absolute -left-10 top-0 h-64 w-64 rounded-full bg-fuchsia-600/30 blur-[90px]" />
              <Sparkles className="mx-auto mb-5 h-8 w-8 text-cyan-300" />
              <h2 className="font-display text-3xl font-black tracking-tight sm:text-5xl">Télécharge TIPSON Studio</h2>
              <p className="mx-auto mt-4 max-w-xl text-gray-400">
                Réservé aux comptes DJ. Crée ton compte, puis installe l&apos;application sur Mac ou Windows.
              </p>
              <div className="mt-9 flex justify-center">
                <StudioDownload />
              </div>
              <p className="mt-6 text-xs text-gray-500">Pas encore organisateur ? <Link href="/dj" className="text-cyan-300 underline-offset-2 hover:underline">Créer un compte DJ</Link></p>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer className="relative border-t border-white/5">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:px-8">
            <div className="flex items-center gap-2">
              <LogoBadge className="h-6 w-6" rounded={16} gradient={['#d946ef', '#22d3ee']} />
              <span className="font-display font-bold text-gray-300">TIPSON</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link href="/" className="transition hover:text-gray-300">Accueil</Link>
              <Link href="/cgv" className="transition hover:text-gray-300">CGU / CGV</Link>
              <Link href="/confidentialite" className="transition hover:text-gray-300">Confidentialité</Link>
              <Link href="/mentions-legales" className="transition hover:text-gray-300">Mentions légales</Link>
            </nav>
            <p className="text-gray-600">© {new Date().getFullYear()} TIPSON</p>
          </div>
        </footer>
      </div>
    </main>
  )
}
