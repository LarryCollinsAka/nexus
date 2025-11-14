import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, userTable, keyTable } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto'; // Built-in Node.js module for unique IDs

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Email and password (min 6 chars) are required' }, { status: 400 });
    }

    // 1. Check if user already exists
    const existingUser = await db.query.userTable.findFirst({
      where: eq(userTable.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    // 2. Generate a new User ID and hash the password
    const userId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Manually create the user and their key in a single transaction
    await db.transaction(async (tx) => {
      // Create the user
      await tx.insert(userTable).values({
        id: userId,
        email: email.toLowerCase(),
        createdAt: new Date(),
      });
      // Create their login key (the password)
      await tx.insert(keyTable).values({
        id: `email:${email.toLowerCase()}`, // The providerId for email/password
        userId: userId,
        hashedPassword: hashedPassword,
      });
    });
    
    // 4. Create a session for the new user
    const session = await auth.createSession(userId, {});

    // 5. Set the session cookie
    const sessionCookie = auth.createSessionCookie(session.id);

    return new Response(null, {
      status: 201,
      headers: {
        'Set-Cookie': sessionCookie.serialize(),
      },
    });

  } catch (error: any) {
    // Check for unique constraint error (just in case)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}