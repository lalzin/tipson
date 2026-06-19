import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { resolveSessionByCode, type StudioSession } from './lib/session'
import Login from './components/Login'
import CodeEntry from './components/CodeEntry'
import Studio from './components/Studio'

type Stage = 'loading' | 'login' | 'code' | 'studio'

export default function App() {
  const [stage, setStage] = useState<Stage>('loading')
  const [session, setSession] = useState<StudioSession | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStage(data.session ? 'code' : 'login')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setStage(prev => {
        if (s && (prev === 'login' || prev === 'loading')) return 'code'
        if (!s) return 'login'
        return prev
      })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function onCode(code: string) {
    const s = await resolveSessionByCode(code)
    setSession(s)
    setStage('studio')
  }

  if (stage === 'loading') return <div className="center"><p className="muted">Chargement…</p></div>
  if (stage === 'login') return <Login />
  if (stage === 'code') return <CodeEntry onResolved={onCode} onSignOut={() => supabase.auth.signOut()} />
  if (stage === 'studio' && session) return <Studio session={session} onExit={() => { setSession(null); setStage('code') }} />
  return null
}
