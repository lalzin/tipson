import { useState } from 'react'

export default function CodeEntry({ onResolved, onSignOut }: {
  onResolved: (code: string) => Promise<void>
  onSignOut: () => void
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try { await onResolved(code) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setLoading(false) }
  }

  return (
    <div className="center">
      <div className="card">
        <div className="logo">T</div>
        <h1>Code de la soirée</h1>
        <p className="sub">Entrez le code affiché par l'organisateur pour lancer le visualiseur.</p>
        <form onSubmit={submit}>
          <input
            className="field"
            style={{ textAlign: 'center', fontSize: 28, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 800 }}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            autoFocus
            required
          />
          <button className="btn" type="submit" disabled={loading || code.length < 4}>
            {loading ? 'Connexion…' : 'Lancer le visualiseur'}
          </button>
        </form>
        {error && <p className="err">{error}</p>}
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={onSignOut}>Se déconnecter</button>
      </div>
    </div>
  )
}
