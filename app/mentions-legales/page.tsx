import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mentions légales — TIPSON',
  description: 'Informations légales relatives à l\'éditeur et à l\'hébergeur du site TIPSON.',
}

const UPDATED = '12 juin 2026'

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/5 sticky top-0 bg-gray-950/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Accueil
          </Link>
          <span className="font-black tracking-tight">TIPSON</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 sm:px-8 py-12 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Mentions légales</h1>
          <p className="text-gray-500 text-sm mt-2">Dernière mise à jour : {UPDATED}</p>
        </div>

        <Section title="1. Éditeur du site">
          <p>Le site et l&apos;application TIPSON sont édités par :</p>
          <ul className="list-none space-y-1.5 mt-2">
            <li>Dénomination : <Fill>[Nom de la société ou de l&apos;auto-entrepreneur]</Fill></li>
            <li>Forme juridique : <Fill>[SAS / SARL / micro-entreprise…]</Fill></li>
            <li>Capital social : <Fill>[le cas échéant]</Fill></li>
            <li>Siège social : <Fill>[adresse complète]</Fill></li>
            <li>SIRET : <Fill>[numéro SIRET]</Fill></li>
            <li>N° TVA intracommunautaire : <Fill>[le cas échéant]</Fill></li>
            <li>Email : <Fill>[email de contact]</Fill></li>
          </ul>
        </Section>

        <Section title="2. Directeur de la publication">
          <p>Le directeur de la publication est <Fill>[Prénom Nom]</Fill>.</p>
        </Section>

        <Section title="3. Hébergement">
          <p>L&apos;application est hébergée par :</p>
          <ul className="list-none space-y-1.5 mt-2">
            <li>Vercel Inc.</li>
            <li>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
            <li><a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">vercel.com</a></li>
          </ul>
          <p className="mt-3">Les données et l&apos;authentification sont gérées via :</p>
          <ul className="list-none space-y-1.5 mt-2">
            <li>Supabase — <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">supabase.com</a></li>
          </ul>
        </Section>

        <Section title="4. Paiements">
          <p>
            Les paiements sont traités de manière sécurisée par Stripe Payments Europe, Ltd. TIPSON
            n&apos;a jamais accès aux données complètes de votre moyen de paiement.
          </p>
        </Section>

        <Section title="5. Propriété intellectuelle">
          <p>
            L&apos;ensemble des éléments du site (marque TIPSON, logo, textes, interface, code) est protégé
            par le droit de la propriété intellectuelle. Toute reproduction ou utilisation sans
            autorisation écrite préalable est interdite. Les pochettes et métadonnées musicales sont
            fournies via l&apos;API d&apos;Apple (iTunes) et restent la propriété de leurs ayants droit respectifs.
          </p>
        </Section>

        <Section title="6. Responsabilité">
          <p>
            TIPSON met tout en œuvre pour assurer la disponibilité et l&apos;exactitude du service, sans
            pouvoir le garantir de manière absolue. La responsabilité de l&apos;éditeur ne saurait être
            engagée en cas d&apos;interruption, de dysfonctionnement ou d&apos;usage non conforme du service.
          </p>
        </Section>

        <Section title="7. Données personnelles">
          <p>
            Le traitement de vos données personnelles est décrit dans notre{' '}
            <Link href="/confidentialite" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">politique de confidentialité</Link>.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>Pour toute question relative au site, vous pouvez nous écrire à <Fill>[email de contact]</Fill>.</p>
        </Section>

        <div className="pt-4 border-t border-white/5 text-sm text-gray-500">
          Voir aussi la{' '}
          <Link href="/confidentialite" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">politique de confidentialité</Link>.
        </div>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="text-gray-300 leading-relaxed">{children}</div>
    </section>
  )
}

function Fill({ children }: { children: React.ReactNode }) {
  return <span className="bg-yellow-500/10 text-yellow-300 px-1.5 py-0.5 rounded">{children}</span>
}
