import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Téléchargement de TIPSON Studio — réservé aux comptes DJ (inscrits + rôle DJ).
// Les binaires sont hébergés ailleurs (R2/S3/GitHub Releases) ; les URLs sont
// fournies par variables d'environnement pour ne pas exposer de lien direct.
const URLS: Record<string, string | undefined> = {
  mac: process.env.STUDIO_DL_MAC,
  win: process.env.STUDIO_DL_WIN,
  linux: process.env.STUDIO_DL_LINUX,
}

export async function GET(req: NextRequest) {
  const platform = (req.nextUrl.searchParams.get('platform') || '').toLowerCase()
  if (!['mac', 'win', 'linux'].includes(platform)) {
    return NextResponse.json({ error: 'Plateforme inconnue.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_dj, is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_dj && !profile?.is_admin) {
    return NextResponse.json({ error: 'Réservé aux comptes DJ.' }, { status: 403 })
  }

  const url = URLS[platform]
  if (!url) {
    return NextResponse.json({ error: 'Bientôt disponible pour cette plateforme.' }, { status: 503 })
  }

  return NextResponse.redirect(url, 302)
}
