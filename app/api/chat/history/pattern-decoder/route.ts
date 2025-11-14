import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, chatTable, messageTable } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
const MODEL_NAME = 'pattern-decoder'; 

export async function GET(req: Request) {
  try {
    const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) return new Response('Unauthorized', { status: 401 });
    const { session } = await auth.validateSession(sessionId);
    if (!session) return new Response('Unauthorized', { status: 401 });
    const userId = session.userId;

    const chat = await db.query.chatTable.findFirst({
      where: and(
        eq(chatTable.userId, userId),
        eq(chatTable.modelName, MODEL_NAME)
      )
    });

    if (!chat) {
      return NextResponse.json([]); // No history yet
    }

    const history = await db
      .select({
        id: messageTable.id,
        role: messageTable.role,
        content: messageTable.content,
      })
      .from(messageTable)
      .where(eq(messageTable.chatId, chat.id))
      .orderBy(messageTable.createdAt);
      
    return NextResponse.json(history);

  } catch (error) {
    console.error('History route error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred' }), { status: 500 });
  }
}