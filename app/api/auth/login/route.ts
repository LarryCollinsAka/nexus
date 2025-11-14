import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, keyTable } from '@/lib/db'; 
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt'; 

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Find the key by its provider ID
    const key = await db.query.keyTable.findFirst({
      where: eq(keyTable.id, `email:${email.toLowerCase()}`),
    });

    if (!key) {
      // User not found
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
    }

    // 2. Check if the key has a hashed password
    if (!key.hashedPassword) {
      // This user might exist but has no password (e.g., Google login)
      return NextResponse.json({ error: 'Invalid login method' }, { status: 400 });
    }

    // 3. Compare the provided password with the hashed password
    const isValidPassword = await bcrypt.compare(password, key.hashedPassword);

    if (!isValidPassword) {
      // Password does not match
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
    }

    // 4. Password is valid! Create a session
    const session = await auth.createSession(key.userId, {});

    // 5. Create and set the session cookie
    const sessionCookie = auth.createSessionCookie(session.id);

    return new Response(null, {
      status: 200, // 200 OK
      headers: {
        'Set-Cookie': sessionCookie.serialize(),
      },
    });

  } catch (error: any) {
    // Handle all other errors
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}