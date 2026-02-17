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

  // Use getUser() for security (re-validates with Supabase Auth)
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth')

  if (!user) {
    if (!isLoginPage && !isAuthCallback) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Whitelist check
  if (user && !isLoginPage && !isAuthCallback) {
    const { data: whitelistEntry } = await supabase
      .from('whitelist')
      .select('email')
      .eq('email', user.email)
      .single();

    if (!whitelistEntry) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'not_authorized')
      return NextResponse.redirect(loginUrl)
    }

    if (isLoginPage || request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/deep_research', request.url))
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
