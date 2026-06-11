import Link from 'next/link'
import {
  Music2, Mic2, Zap, QrCode, ShieldCheck, Wallet,
  ArrowRight, Radio, ListMusic, Sparkles,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 backdrop-blur bg-gray-950/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
              <span className="font-black text-lg">T</span>
            </div>
            <span className="font-black text-lg tracking-tight">TIPSON</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dj" className="px-3 sm:px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition">
              Espace DJ
            </Link>
            <Link href="/join" className="px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-white text-gray-950 hover:bg-gray-200 transition">
              Rejoindre
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-pink-600/15 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            La soirée, dirigée par le public
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Vos sons.{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Votre soirée.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            TIPSON connecte le public au DJ et à l&apos;animateur karaoké.
            Scannez, choisissez votre morceau, et faites vibrer la piste — en quelques secondes.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/join"
              className="group w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-lg flex items-center justify-center gap-2 transition shadow-xl shadow-purple-900/30">
              Rejoindre une soirée
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition" />
            </Link>
            <Link href="/dj"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl glass hover:bg-white/10 font-semibold text-lg flex items-center justify-center gap-2 transition">
              <Radio className="w-5 h-5 text-purple-400" />
              Je suis organisateur
            </Link>
          </div>
        </div>
      </section>

      {/* ── Deux modes ────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl p-8 border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-transparent">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mb-5">
              <Music2 className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold">Mode DJ</h3>
            <p className="text-gray-400 mt-2 leading-relaxed">
              Le public propose des morceaux et peut payer pour passer en priorité.
              Le DJ valide, refuse ou joue — tout en temps réel.
            </p>
          </div>
          <div className="rounded-3xl p-8 border border-pink-500/20 bg-gradient-to-br from-pink-900/20 to-transparent">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center mb-5">
              <Mic2 className="w-7 h-7 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold">Mode Karaoké</h3>
            <p className="text-gray-400 mt-2 leading-relaxed">
              Les chanteurs rejoignent une file d&apos;attente, suivent leur position en direct,
              et peuvent payer pour passer devant. À vous le micro !
            </p>
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ─────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-black text-center">Comment ça marche</h2>
        <p className="text-gray-500 text-center mt-3">Trois étapes, aucune appli à installer.</p>

        <div className="grid sm:grid-cols-3 gap-5 mt-12">
          {[
            { icon: QrCode, title: 'Scannez le QR', desc: 'Le code de la soirée vous ouvre la page instantanément.' },
            { icon: ListMusic, title: 'Choisissez un son', desc: 'Recherchez n\'importe quel titre et envoyez votre demande.' },
            { icon: Zap, title: 'Faites-le passer', desc: 'Option prioritaire pour être joué — ou chanter — plus vite.' },
          ].map((s, i) => (
            <div key={i} className="glass rounded-3xl p-7 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                <s.icon className="w-7 h-7 text-purple-400" />
              </div>
              <div className="text-xs font-bold text-purple-400 mb-1">ÉTAPE {i + 1}</div>
              <h3 className="font-bold text-lg">{s.title}</h3>
              <p className="text-gray-400 text-sm mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Réassurance ───────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: ShieldCheck, title: 'Paiement sécurisé', desc: 'Transactions via PayPal, remboursement automatique si non joué.' },
            { icon: Wallet, title: 'Sans compte', desc: 'Le public participe sans inscription. Rapide et sans friction.' },
            { icon: Radio, title: 'Temps réel', desc: 'File d\'attente et statuts mis à jour en direct sur tous les écrans.' },
          ].map((f, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 p-10 sm:p-16 text-center bg-gradient-to-br from-purple-900/30 via-gray-900 to-pink-900/20">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px]" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Prêt à faire vibrer la piste ?</h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto">
              Rejoignez une soirée en cours, ou créez la vôtre en tant qu&apos;organisateur.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/join"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white text-gray-950 hover:bg-gray-200 font-bold text-lg transition">
                Rejoindre une soirée
              </Link>
              <Link href="/dj"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl border border-white/20 hover:bg-white/5 font-semibold text-lg transition">
                Espace organisateur
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <span className="font-black text-xs">T</span>
            </div>
            <span className="font-bold text-gray-400">TIPSON</span>
          </div>
          <p>© {new Date().getFullYear()} TIPSON — La soirée dirigée par le public.</p>
        </div>
      </footer>
    </main>
  )
}
