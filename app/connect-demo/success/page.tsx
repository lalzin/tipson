import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

// Page de confirmation après un achat réussi (hosted checkout → success_url).
export default function SuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Paiement réussi</h1>
          <p className="text-gray-400 text-sm mt-2">
            Le paiement a été effectué. Les fonds (moins la commission plateforme) sont transférés
            au compte connecté.
          </p>
          {searchParams.session_id && (
            <p className="text-gray-600 text-xs mt-2 font-mono break-all">{searchParams.session_id}</p>
          )}
        </div>
        <Link href="/connect-demo" className="inline-block px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold transition">
          Retour à la démo
        </Link>
      </div>
    </main>
  )
}
