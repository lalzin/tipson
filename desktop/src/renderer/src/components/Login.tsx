import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_BASE } from '../lib/config'
import { LogoBadge } from './Logo'

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
    // Loopback local : tipson.online renvoie la session à l'app via 127.0.0.1
    // (fiable en dev comme en app installée).
    await window.tipson.googleLogin(API_BASE)
  }

  return (
    <div className="center">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><LogoBadge size={64} rounded={18} /></div>
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
        <button className="btn google" onClick={signInGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Continuer avec Google
        </button>

        {error && <p className="err">{error}</p>}
        <p className="muted">Mêmes identifiants que sur tipson.online</p>
      </div>
    </div>
  )
}
