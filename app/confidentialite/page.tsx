import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politique de confidentialité · TIPSON',
  description: 'Comment TIPSON collecte, utilise et protège vos données personnelles.',
}

const UPDATED = '12 juin 2026'

export default function PrivacyPage() {
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
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Politique de confidentialité</h1>
          <p className="text-gray-500 text-sm mt-2">Dernière mise à jour : {UPDATED}</p>
        </div>

        <p className="text-gray-300 leading-relaxed">
          La présente politique décrit comment TIPSON (« nous ») collecte, utilise et protège vos
          données personnelles lorsque vous utilisez notre service, conformément au Règlement Général
          sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
        </p>

        <Section title="1. Responsable du traitement">
          <p>
            Le responsable du traitement est <strong>MARZIN CONSULTING</strong> (SAS, SIREN 100 068 568),
            joignable à l&apos;adresse <a href="mailto:contact@tipson.online" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">contact@tipson.online</a>. Les informations complètes
            figurent dans les <Link href="/mentions-legales" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">mentions légales</Link>.
          </p>
        </Section>

        <Section title="2. Données que nous collectons">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Compte</strong> : adresse email, nom ou nom de scène, et identifiant de connexion (Google ou mot de passe).</li>
            <li><strong>Participation</strong> : sons demandés, messages, montants, statut des demandes et historique de vos soirées.</li>
            <li><strong>Paiement</strong> : les transactions sont gérées par Stripe. Nous ne stockons jamais vos numéros de carte ; nous conservons uniquement un identifiant de transaction et le montant.</li>
            <li><strong>Données techniques</strong> : adresse IP (pour la sécurité et la limitation d&apos;abus), et données de session strictement nécessaires au fonctionnement.</li>
          </ul>
        </Section>

        <Section title="3. Finalités et bases légales">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Fournir le service</strong> (demandes de sons, file karaoké, suivi) : exécution du contrat.</li>
            <li><strong>Traiter les paiements</strong> : exécution du contrat.</li>
            <li><strong>Sécuriser la plateforme</strong> (anti-fraude, limitation de requêtes) : intérêt légitime.</li>
            <li><strong>Gérer votre compte et vos accès organisateur</strong> : exécution du contrat / intérêt légitime.</li>
          </ul>
        </Section>

        <Section title="4. Sous-traitants et destinataires">
          <p>Nous faisons appel à des prestataires qui agissent comme sous-traitants :</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Supabase</strong> : hébergement de la base de données et authentification.</li>
            <li><strong>Stripe</strong> : traitement sécurisé des paiements.</li>
            <li><strong>Google</strong> : connexion via compte Google (si vous l&apos;utilisez).</li>
            <li><strong>Vercel</strong> : hébergement de l&apos;application.</li>
            <li><strong>Apple (iTunes Search API)</strong> : recherche de morceaux ; seules les requêtes de recherche sont transmises, aucune donnée personnelle.</li>
          </ul>
          <p className="mt-2 text-gray-400">
            Certains prestataires peuvent traiter des données hors de l&apos;Union européenne. Dans ce cas,
            des garanties appropriées (clauses contractuelles types) encadrent ces transferts.
          </p>
        </Section>

        <Section title="5. Durée de conservation">
          <p>
            Vos données de compte sont conservées tant que votre compte est actif. Les données de
            participation et de transaction sont conservées le temps nécessaire au service puis aux
            obligations légales (notamment comptables, jusqu&apos;à 10 ans pour les pièces de paiement).
            Vous pouvez demander la suppression de votre compte à tout moment.
          </p>
        </Section>

        <Section title="6. Cookies et stockage local">
          <p>
            Nous utilisons uniquement des cookies et un stockage local <strong>strictement nécessaires</strong> :
            jeton de connexion (Supabase) et prévention de la fraude (Stripe). Aucun cookie publicitaire
            ou de traçage tiers n&apos;est utilisé.
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Droit d&apos;accès, de rectification et d&apos;effacement de vos données.</li>
            <li>Droit à la limitation et à l&apos;opposition au traitement.</li>
            <li>Droit à la portabilité de vos données.</li>
            <li>Droit de retirer votre consentement à tout moment.</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à <a href="mailto:contact@tipson.online" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">contact@tipson.online</a>. Vous pouvez
            également introduire une réclamation auprès de la CNIL (
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">www.cnil.fr</a>).
          </p>
        </Section>

        <Section title="8. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger
            vos données : chiffrement des échanges (HTTPS), contrôle d&apos;accès, et hébergement auprès de
            prestataires conformes aux standards de sécurité.
          </p>
        </Section>

        <Section title="9. Modifications">
          <p>
            Nous pouvons mettre à jour cette politique. Toute modification importante sera signalée sur
            cette page, avec une date de mise à jour actualisée.
          </p>
        </Section>

        <div className="pt-4 border-t border-white/5 text-sm text-gray-500">
          Voir aussi les{' '}
          <Link href="/mentions-legales" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">mentions légales</Link>.
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

// Surligne les éléments à compléter par l'éditeur
function Fill({ children }: { children: React.ReactNode }) {
  return <span className="bg-yellow-500/10 text-yellow-300 px-1.5 py-0.5 rounded">{children}</span>
}
