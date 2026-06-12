import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  // Rafraîchit la session (obligatoire avec @supabase/ssr)
  const { data: { user } } = await supabase.auth.getUser()

  // Protège les routes DJ et Admin (présence d'auth ; les rôles sont vérifiés côté serveur/API)
  const path = request.nextUrl.pathname
  const isDjProtected =
    path.startsWith('/dj/dashboard') ||
    path.startsWith('/dj/session') ||
    path.startsWith('/dj/settings') ||
    path.startsWith('/admin') ||
    path.startsWith('/connect-demo')

  if (isDjProtected && !user) {
    return NextResponse.redirect(new URL('/dj', request.url))
  }

  // Espace client : redirige vers /join si non connecté
  if (path.startsWith('/account') && !user) {
    return NextResponse.redirect(new URL('/join', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dj/dashboard',
    '/dj/dashboard/:path*',
    '/dj/session/:path*',
    '/dj/settings',
    '/admin',
    '/admin/:path*',
    '/account',
    '/connect-demo',
    '/connect-demo/:path*',
  ],
}
