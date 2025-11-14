import OpenAI from 'openai';
import { REVENUE_REACTOR_PROMPT } from '@/app/library/prompts/revenue-reactor';
import { auth } from '@/lib/auth';
import { db, chatTable, messageTable } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const dynamic = 'force-dynamic';
const MODEL_NAME = 'revenue-reactor'; // Define the model name

export async function POST(req: Request) {
  try {
    // 2. Auth (same as before)
    const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) return new Response('Unauthorized', { status: 401 });
    const { session } = await auth.validateSession(sessionId);
    if (!session) return new Response('Unauthorized', { status: 401 });
    const userId = session.userId;

    const { messages: currentMessages } = await req.json();

    // 3. Find or create a chat (now specific to this model)
    let chat = await db.query.chatTable.findFirst({
      where: and(
        eq(chatTable.userId, userId),
        eq(chatTable.modelName, MODEL_NAME) // Use the new model name
      )
    });
    if (!chat) {
      chat = (await db.insert(chatTable).values({
        userId: userId,
        modelName: MODEL_NAME, // Save with the new model name
      }).returning())[0];
    }
    const chatId = chat.id;

    // 4. Save user message (same as before)
    const userMessage = currentMessages[currentMessages.length - 1];
    await db.insert(messageTable).values({
      chatId: chatId,
      role: 'user',
      content: userMessage.content,
    });

    // 5. Use the new prompt
    const systemPrompt = { role: 'system', content: REVENUE_REACTOR_PROMPT };

    // 6. Call NVIDIA with the FAST model (Llama 3.1)
    const response = await openai.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct', // The fast model
      messages: [systemPrompt, ...currentMessages],
      stream: true,
      temperature: 0.7, // A bit more creative
      top_p: 1.0,
      max_tokens: 4096,
    });

    let fullReply = "";

    // 7. Create the stream (This model does NOT have 'reasoning_content')
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response) {
            const delta = chunk.choices[0].delta as any;
            
            // Llama 3.1 only has 'content'
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
          console.error('Stream error:', e);
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
      headers: { 'Content-Type': 'application/json' }
    });
  }
}