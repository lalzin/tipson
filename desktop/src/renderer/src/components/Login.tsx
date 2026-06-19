import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_BASE } from '../lib/config'

// Connexion email (mot de passe) + Google (via navigateur système).
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function signInGoogle() {
    setError('')
    // On délègue à la page de relais de tipson.online : login Google dans le
    // navigateur, puis retour de la session à l'app via le deep-link tipson://.
    await window.tipson.openExternal(`${API_BASE}/desktop-auth`)
  }

  return (
    <div className="center">
      <div className="card">
        <div className="logo">T</div>
        <h1>TIPSON Studio</h1>
        <p className="sub">Connectez-vous pour afficher le visualiseur d'une soirée.</p>

        <form onSubmit={signInEmail}>
          <label>Email</label>
          <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" required />
          <label>Mot de passe</label>
          <input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
        </form>

        <div className="row" style={{ margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
          <span className="muted" style={{ margin: 0 }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
        </div>
        <button className="btn ghost" onClick={signInGoogle}>Continuer avec Google</button>

        {error && <p className="err">{error}</p>}
        <p className="muted">Mêmes identifiants que sur tipson.online</p>
      </div>
    </div>
  )
}
