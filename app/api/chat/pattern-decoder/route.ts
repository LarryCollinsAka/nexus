import OpenAI from 'openai';
import { PATTERN_DECODER_PROMPT } from '@/app/library/prompts/pattern-decoder';
import { auth } from '@/lib/auth';
import { db, chatTable, messageTable } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const dynamic = 'force-dynamic';
const MODEL_NAME = 'pattern-decoder'; // Define the model name

export async function POST(req: Request) {
  try {
    // 2. Auth
    const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) return new Response('Unauthorized', { status: 401 });
    const { session } = await auth.validateSession(sessionId);
    if (!session) return new Response('Unauthorized', { status: 401 });
    const userId = session.userId;

    const { messages: currentMessages } = await req.json();

    // 3. Find or create chat for THIS model
    let chat = await db.query.chatTable.findFirst({
      where: and(
        eq(chatTable.userId, userId),
        eq(chatTable.modelName, MODEL_NAME) 
      )
    });
    if (!chat) {
      chat = (await db.insert(chatTable).values({
        userId: userId,
        modelName: MODEL_NAME,
      }).returning())[0];
    }
    const chatId = chat.id;

    // 4. Save user message
    const userMessage = currentMessages[currentMessages.length - 1];
    await db.insert(messageTable).values({
      chatId: chatId,
      role: 'user',
      content: userMessage.content,
    });

    // 5. Use the new prompt
    const systemPrompt = { role: 'system', content: PATTERN_DECODER_PROMPT };

    // 6. Call NVIDIA with the FAST model
    const response = await openai.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [systemPrompt, ...currentMessages],
      stream: true,
      temperature: 0.5, // More analytical
      top_p: 1.0,
      max_tokens: 4096,
    });

    let fullReply = "";

    // 7. Create the stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response) {
            const delta = chunk.choices[0].delta as any;
            const content = delta.content;
            if (content) {
              fullReply += content;
              controller.enqueue(encoder.encode(content));
            }
          }
          // 8. Save the full reply to the DB
          await db.insert(messageTable).values({
            chatId: chatId,
            role: 'assistant',
            content: fullReply,
          });
        } catch (e) {
          controller.error(e);
        }
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'AI connection failed' }), { 
      status: 500,
    });
  }
}