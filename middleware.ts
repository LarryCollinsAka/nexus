// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  // THE FIX: Get cookies directly from the 'req' object
  const sessionId = req.cookies.get(auth.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    // User is not logged in
    if (req.nextUrl.pathname.startsWith('/chat')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // User has a session cookie, let's validate it
  const { session } = await auth.validateSession(sessionId);

  // If the user is logged in
  if (session && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register'))) {
    // Redirect them away from login/register
    return NextResponse.redirect(new URL('/chat', req.url));
  }

  // If the user is not logged in (invalid session) and tries to access chat
  if (!session && req.nextUrl.pathname.startsWith('/chat')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/login', '/register'],
  runtime: 'nodejs',
};