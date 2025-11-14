import OpenAI from 'openai';
import { STARTUP_ADVISOR_PROMPT } from '@/app/library/prompts/startup-advisor';
import { auth } from '@/lib/auth';
import { db, chatTable, messageTable } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Get user session
    const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) return new Response('Unauthorized', { status: 401 });
    const { session } = await auth.validateSession(sessionId);
    if (!session) return new Response('Unauthorized', { status: 401 });
    const userId = session.userId;

    // 2. Get messages and find chat
    const { messages: currentMessages } = await req.json();
    let chat = await db.query.chatTable.findFirst({
      where: and(
        eq(chatTable.userId, userId),
        eq(chatTable.modelName, 'startup-advisor')
      )
    });
    if (!chat) {
      chat = (await db.insert(chatTable).values({
        userId: userId,
        modelName: 'startup-advisor',
      }).returning())[0];
    }
    const chatId = chat.id;

    // 3. Save the new user message
    const userMessage = currentMessages[currentMessages.length - 1];
    await db.insert(messageTable).values({
      chatId: chatId,
      role: 'user',
      content: userMessage.content,
    });

    const systemPrompt = { role: 'system', content: STARTUP_ADVISOR_PROMPT };

    // 4. Call NVIDIA
    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/deepseek-r1',
      messages: [systemPrompt, ...currentMessages],
      stream: true,
      temperature: 0.6,
      top_p: 0.7,
      max_tokens: 4096,
    });

    let fullReply = ""; 

    // 5. Create the stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response) {
            const delta = chunk.choices[0].delta as any;
            
            const reasoning = delta.reasoning_content;
            if (reasoning) {
              console.log("AI REASONING:", reasoning);
              controller.enqueue(encoder.encode(`> 🧠 *Thinking...*\n`));
            }

            const content = delta.content;
            if (content) {
              fullReply += content; // Add to the full reply
              controller.enqueue(encoder.encode(content));
            }
          }

          // After the loop is done, we save the full reply to the DB
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