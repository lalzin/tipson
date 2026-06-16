import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Conditions générales · TIPSON',
  description: 'Conditions générales d\'utilisation et de vente du service TIPSON.',
}

const UPDATED = '12 juin 2026'

export default function TermsPage() {
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
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Conditions générales d&apos;utilisation et de vente</h1>
          <p className="text-gray-500 text-sm mt-2">Dernière mise à jour : {UPDATED}</p>
        </div>

        <Section title="1. Objet">
          <p>
            Les présentes conditions régissent l&apos;utilisation du service TIPSON, édité par
            <strong> MARZIN CONSULTING</strong>, qui permet au public
            d&apos;envoyer des demandes de morceaux à un DJ ou de rejoindre une file de karaoké lors d&apos;un
            événement, avec une option de participation payante. En utilisant le service, vous acceptez
            ces conditions.
          </p>
        </Section>

        <Section title="2. Description du service">
          <p>
            TIPSON met en relation des participants et des organisateurs (DJ, animateurs). Le participant
            recherche un morceau, l&apos;envoie au DJ, et peut payer pour une option prioritaire ou pour
            rejoindre la file karaoké. L&apos;organisateur reste libre d&apos;accepter, de refuser ou de jouer la
            demande. TIPSON ne garantit pas qu&apos;un morceau demandé sera joué.
          </p>
        </Section>

        <Section title="3. Compte et accès organisateur">
          <p>
            La participation est possible sans compte. La création d&apos;un compte est requise pour les
            organisateurs, dont l&apos;accès est validé manuellement. Vous êtes responsable de l&apos;exactitude
            des informations fournies et de la confidentialité de vos identifiants.
          </p>
        </Section>

        <Section title="4. Prix et paiement">
          <p>
            Les montants sont indiqués en euros, toutes taxes comprises, et fixés par l&apos;organisateur de
            chaque soirée. Les paiements sont traités de façon sécurisée par Stripe.
          </p>
          <p className="mt-2">
            Le paiement fonctionne en deux temps : lors de votre demande, le montant est{' '}
            <strong>autorisé</strong> (bloqué) sur votre moyen de paiement, mais{' '}
            <strong>débité uniquement si l&apos;organisateur valide votre demande</strong>. Si elle est
            refusée ou annulée, l&apos;autorisation est levée et aucun montant n&apos;est prélevé.
          </p>
        </Section>

        <Section title="5. Annulation et droit de rétractation">
          <p>
            Le service est exécuté immédiatement pendant l&apos;événement. Conformément à l&apos;article L221-28
            du Code de la consommation, le droit de rétractation ne s&apos;applique pas à un service
            pleinement exécuté avec votre accord préalable (morceau validé ou joué).
          </p>
          <p className="mt-2">
            <strong>Avant validation par l&apos;organisateur</strong>, vous pouvez toutefois annuler votre
            demande directement depuis l&apos;écran de suivi. L&apos;autorisation de paiement est alors levée et{' '}
            <strong>aucun montant n&apos;est prélevé</strong>. Une fois la demande validée ou jouée, elle ne
            peut plus être annulée.
          </p>
        </Section>

        <Section title="6. Remboursements">
          <p>
            Grâce au système d&apos;autorisation, aucun remboursement n&apos;est nécessaire dans les cas
            courants : si la demande est refusée, annulée ou non jouée, vous n&apos;êtes simplement pas
            débité. En cas de débit que vous estimeriez injustifié, contactez-nous.
          </p>
        </Section>

        <Section title="7. Comportement des utilisateurs">
          <p>
            Vous vous engagez à ne pas envoyer de contenu illégal, offensant ou inapproprié dans les
            messages accompagnant vos demandes. L&apos;organisateur peut refuser toute demande à sa
            discrétion. Tout usage abusif du service peut entraîner une restriction d&apos;accès.
          </p>
        </Section>

        <Section title="8. Responsabilité">
          <p>
            TIPSON fournit un outil de mise en relation et ne saurait être tenu responsable du déroulé
            de l&apos;événement, des choix de l&apos;organisateur, ni d&apos;une indisponibilité temporaire du service.
          </p>
        </Section>

        <Section title="9. Données personnelles">
          <p>
            Le traitement de vos données est décrit dans notre{' '}
            <Link href="/confidentialite" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">politique de confidentialité</Link>.
          </p>
        </Section>

        <Section title="10. Droit applicable et litiges">
          <p>
            Les présentes conditions sont soumises au droit français. En cas de litige, une solution
            amiable sera recherchée en priorité. À défaut, le consommateur peut recourir gratuitement à
            un médiateur de la consommation, ou saisir les tribunaux compétents.
          </p>
        </Section>

        <div className="pt-4 border-t border-white/5 text-sm text-gray-500 flex flex-wrap gap-4">
          <Link href="/confidentialite" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Confidentialité</Link>
          <Link href="/mentions-legales" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Mentions légales</Link>
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
