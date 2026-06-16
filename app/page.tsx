import Link from 'next/link'
import { Unbounded, Sora } from 'next/font/google'
import {
  Music2, Mic2, Zap, QrCode, ShieldCheck, Wallet,
  ArrowRight, Radio, ListMusic, Sparkles, Disc3, ScanLine, Flame,
} from 'lucide-react'
import LandingNav from '@/components/LandingNav'
import { LogoBadge } from '@/components/Logo'
import Reveal from '@/components/landing/Reveal'
import TiltCard from '@/components/landing/TiltCard'
import HeroScene from '@/components/landing/HeroScene'

const display = Unbounded({ subsets: ['latin'], weight: ['500', '700', '900'], variable: '--font-display' })
const body = Sora({ subsets: ['latin'], weight: ['300', '400', '600', '700'], variable: '--font-body' })

const MARQUEE = ['STROBE', 'ONE MORE TIME', 'BAD GUY', 'LEVELS', 'BLINDING LIGHTS', 'TITANIUM', 'GET LUCKY', 'INSOMNIA', 'SANDSTORM', 'ANIMALS']

export default function LandingPage() {
  return (
    <main className={`${display.variable} ${body.variable} font-body relative min-h-screen overflow-x-hidden bg-[#06060b] text-white`}>
      {/* ── Atmosphère : aurores + grain ─────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="lp-aurora absolute -top-40 left-[8%] h-[520px] w-[520px] rounded-full bg-fuchsia-600/25 blur-[130px]" />
        <div className="lp-aurora absolute top-[30%] right-[2%] h-[460px] w-[460px] rounded-full bg-cyan-500/20 blur-[130px]" style={{ animationDelay: '4s' }} />
        <div className="lp-aurora absolute bottom-[6%] left-[26%] h-[420px] w-[420px] rounded-full bg-violet-700/20 blur-[130px]" style={{ animationDelay: '8s' }} />
        <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at center, black, transparent 78%)' }} />
      </div>
      <div className="lp-grain" />

      <div className="relative z-10">
        <LandingNav />

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300" style={{ animationDelay: '0.05s' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
              </span>
              La nuit appartient à la foule
            </div>

            <h1 className="font-display mt-6 text-[2.7rem] font-black leading-[0.95] sm:text-6xl lg:text-[4.6rem]">
              <span className="lp-rise block" style={{ animationDelay: '0.12s' }}>Tu choisis</span>
              <span className="lp-rise lp-shimmer block bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-fuchsia-400"
                style={{ animationDelay: '0.22s' }}>le son.</span>
              <span className="lp-rise block" style={{ animationDelay: '0.32s' }}>La piste s&apos;enflamme.</span>
            </h1>

            <p className="lp-rise mx-auto mt-6 max-w-xl text-base text-gray-400 sm:text-lg lg:mx-0" style={{ animationDelay: '0.45s' }}>
              TIPSON relie le public au DJ, à l&apos;animateur karaoké et au jukebox du lieu.
              Scanne, balance ton morceau, fais passer ta demande en quelques secondes.
            </p>

            <div className="lp-rise mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start" style={{ animationDelay: '0.58s' }}>
              <Link href="/join"
                className="lp-glow group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-7 py-4 text-lg font-bold text-gray-950 transition hover:brightness-110 sm:w-auto">
                Rejoindre une soirée
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
              </Link>
              <Link href="/dj"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-lg font-semibold backdrop-blur transition hover:bg-white/10 sm:w-auto">
                <Radio className="h-5 w-5 text-cyan-300" />
                Je suis organisateur
              </Link>
            </div>
          </div>

          <div className="lp-rise" style={{ animationDelay: '0.3s' }}>
            <HeroScene />
          </div>
        </section>

        {/* ── Marquee titres ────────────────────────────────────── */}
        <section className="relative my-6 border-y border-white/5 py-4">
          <div className="lp-marquee font-display text-3xl font-black text-white/[0.06] sm:text-5xl">
            {[...MARQUEE, ...MARQUEE].map((t, i) => (
              <span key={i} className="mx-6 flex items-center gap-6">{t}<span className="text-fuchsia-500/40">✦</span></span>
            ))}
          </div>
        </section>

        {/* ── L'HISTOIRE EN 3 ACTES ─────────────────────────────── */}
        <section className="relative mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-fuchsia-400">L&apos;expérience</p>
            <h2 className="font-display mt-3 text-3xl font-black sm:text-5xl">Trois temps, une nuit</h2>
          </Reveal>

          <div className="mt-16 space-y-6">
            {[
              { n: '01', icon: ScanLine, c: 'from-fuchsia-500/20', a: 'text-fuchsia-300', t: 'Tu scannes', d: 'Le QR code de la soirée ouvre la page à l\'instant. Aucune appli, aucun compte, juste toi et la musique.' },
              { n: '02', icon: ListMusic, c: 'from-cyan-500/20', a: 'text-cyan-300', t: 'Tu choisis ton son', d: 'Cherche n\'importe quel titre, ajoute un message, et passe en express pour être joué en priorité.' },
              { n: '03', icon: Flame, c: 'from-violet-500/20', a: 'text-violet-300', t: 'La piste s\'embrase', d: 'Ta demande s\'affiche en direct côté DJ. Validée, jouée, applaudie : la foule dirige la nuit.' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className={`group relative grid grid-cols-[auto_1fr] items-center gap-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${s.c} to-transparent p-6 sm:gap-8 sm:p-9 ${i % 2 ? 'lg:ml-16' : 'lg:mr-16'}`}>
                  <span className="font-display select-none text-5xl font-black text-white/10 sm:text-7xl">{s.n}</span>
                  <div className="flex items-start gap-4">
                    <div className="hidden h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 sm:grid">
                      <s.icon className={`h-7 w-7 ${s.a}`} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold sm:text-2xl">{s.t}</h3>
                      <p className="mt-1.5 text-sm text-gray-400 sm:text-base">{s.d}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── TROIS MODES (tilt 3D) ─────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-black sm:text-5xl">Trois façons d&apos;animer</h2>
            <p className="mt-3 text-gray-500">Un seul outil, adapté à chaque ambiance.</p>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              { icon: Music2, glow: 'rgba(217,70,239,0.35)', ring: 'border-fuchsia-500/25', accent: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/25', t: 'Mode DJ', d: 'Le public propose des morceaux et paie pour passer en priorité. Le DJ valide, refuse ou joue en temps réel.' },
              { icon: Mic2, glow: 'rgba(236,72,153,0.35)', ring: 'border-pink-500/25', accent: 'text-pink-300 bg-pink-500/15 border-pink-500/25', t: 'Mode Karaoké', d: 'Les chanteurs rejoignent la file, suivent leur position en direct et passent devant en express. À toi le micro !' },
              { icon: Disc3, glow: 'rgba(16,185,129,0.35)', ring: 'border-emerald-500/25', accent: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25', t: 'Mode Jukebox', d: 'Sans DJ : le public ajoute ses titres à la file qui passe sur Apple Music. Express pour jouer juste après le morceau en cours.' },
            ].map((m, i) => (
              <Reveal key={m.t} delay={i * 100}>
                <TiltCard glow={m.glow} className="h-full">
                  <div className={`flex h-full flex-col rounded-[1.6rem] border ${m.ring} bg-gray-900/40 p-7 backdrop-blur-sm`}>
                    <div className={`lp-tilt-deep mb-5 grid h-14 w-14 place-items-center rounded-2xl border ${m.accent}`}>
                      <m.icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">{m.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{m.d}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── RÉASSURANCE ───────────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: 'Paiement sécurisé', d: 'Carte, Apple Pay & Google Pay via Stripe. Débité seulement si le son est accepté.' },
              { icon: Wallet, t: 'Sans compte', d: 'Le public participe sans inscription. Rapide, fluide, sans friction.' },
              { icon: Radio, t: 'Temps réel', d: 'File d\'attente et statuts mis à jour en direct sur tous les écrans.' },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 90}>
                <div className="flex h-full gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
                    <f.icon className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.t}</h3>
                    <p className="mt-1 text-sm text-gray-400">{f.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA FINAL ─────────────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 p-10 text-center sm:p-16">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-900/40 via-gray-950 to-cyan-900/30" />
              <div className="lp-aurora absolute -left-10 top-0 h-64 w-64 rounded-full bg-fuchsia-600/30 blur-[90px]" />
              <Sparkles className="mx-auto mb-5 h-8 w-8 text-cyan-300" />
              <h2 className="font-display text-3xl font-black tracking-tight sm:text-5xl">Prêt à faire vibrer la piste ?</h2>
              <p className="mx-auto mt-4 max-w-xl text-gray-400">
                Rejoins une soirée en cours, ou crée la tienne en tant qu&apos;organisateur.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/join" className="lp-glow w-full rounded-2xl bg-white px-7 py-4 text-lg font-bold text-gray-950 transition hover:bg-gray-200 sm:w-auto">
                  Rejoindre une soirée
                </Link>
                <Link href="/dj" className="w-full rounded-2xl border border-white/20 px-7 py-4 text-lg font-semibold transition hover:bg-white/5 sm:w-auto">
                  Espace organisateur
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <footer className="relative border-t border-white/5">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:px-8">
            <div className="flex items-center gap-2">
              <LogoBadge className="h-6 w-6" rounded={16} />
              <span className="font-display font-bold text-gray-300">TIPSON</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
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
