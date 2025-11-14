import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, chatTable, messageTable } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
const MODEL_NAME = 'revenue-reactor'; // Define the model name

export async function GET(req: Request) {
  try {
    // 1. Auth (same as before)
    const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) return new Response('Unauthorized', { status: 401 });
    const { session } = await auth.validateSession(sessionId);
    if (!session) return new Response('Unauthorized', { status: 401 });
    const userId = session.userId;

    // 2. Find the chat for THIS model
    const chat = await db.query.chatTable.findFirst({
      where: and(
        eq(chatTable.userId, userId),
        eq(chatTable.modelName, MODEL_NAME) // Use new model name
      )
    });

    if (!chat) {
      return NextResponse.json([]); // No history yet
    }

    // 3. Get all messages for this chat
    const history = await db
      .select({
        id: messageTable.id,
        role: messageTable.role,
        content: messageTable.content,
      })
      .from(messageTable)
      .where(eq(messageTable.chatId, chat.id))
      .orderBy(messageTable.createdAt);
      
    // 4. Return simple history array
    return NextResponse.json(history);

  } catch (error) {
    console.error('History route error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred' }), { status: 500 });
  }
}