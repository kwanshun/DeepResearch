import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      db: {
        schema: 'deep_research',
      },
    }
  )

  // Do not use getUser() here if you want to keep the middleware fast.
  // getSession() is sufficient for refreshing the session.
  const { data: { user } } = await supabase.auth.getUser()

  // Protect routes: Redirect to /login if there is no session
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth')

  if (!user) {
    if (!isLoginPage && !isAuthCallback) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  // Whitelist check: If user exists, verify email is in whitelist
  if (user && !isLoginPage && !isAuthCallback) {
    const { data: whitelistEntry, error: whitelistError } = await supabase
      .from('whitelist')
      .select('email')
      .eq('email', user.email)
      .single();

    if (!whitelistEntry) {
      // If not in whitelist, redirect to login with error
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'not_authorized')
      return NextResponse.redirect(loginUrl)
    }

    // Whitelisted user: Redirect to deep_research if they are on landing page or login page
    if (isLoginPage || request.nextUrl.pathname === '/') {
      const appUrl = new URL('/deep_research', request.url)
      return NextResponse.redirect(appUrl)
    }
  }

  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
