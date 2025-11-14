// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers'; // This is CORRECT here

export async function POST(req: Request) {
  // THE FIX: Manually get the session ID from cookies
  const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { session } = await auth.validateSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await auth.invalidateSession(session.id);
  const sessionCookie = auth.createBlankSessionCookie();

  return new Response(null, {
    status: 200,
    headers: { 'Set-Cookie': sessionCookie.serialize() },
  });
}