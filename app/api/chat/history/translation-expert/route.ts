import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, chatTable, messageTable } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
const MODEL_NAME = 'translation-expert'; // Define the model name

export async function GET(req: Request) {
  try {
    // 1. Get the user's session
    const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) {
      return new Response('Unauthorized', { status: 401 });
    }
    const { session } = await auth.validateSession(sessionId);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
    const userId = session.userId;

    // 2. Find their chat for THIS model
    const chat = await db.query.chatTable.findFirst({
      where: and(
        eq(chatTable.userId, userId),
        eq(chatTable.modelName, MODEL_NAME)
      )
    });

    if (!chat) {
      // No history yet, return an empty array
      return NextResponse.json([]);
    }

    // 3. Get all messages for that chat
    const history = await db
      .select({
        id: messageTable.id,
        role: messageTable.role,
        content: messageTable.content,
      })
      .from(messageTable)
      .where(eq(messageTable.chatId, chat.id))
      .orderBy(messageTable.createdAt);
      
    // 4. Return the simple history array (which our frontend expects)
    return NextResponse.json(history);

  } catch (error) {
    console.error('History route error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred' }), { status: 500 });
  }
}