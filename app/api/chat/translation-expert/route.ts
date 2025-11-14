import OpenAI from 'openai';
import { TRANSLATION_EXPERT_PROMPT } from '@/app/library/prompts/translation-expert';
import { auth } from '@/lib/auth';
import { db, chatTable, messageTable } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

// 1. Configure the OpenAI client (for both models)
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const dynamic = 'force-dynamic';
const MODEL_NAME = 'translation-expert';

export async function POST(req: Request) {
  try {
    // 2. Auth & DB setup
    const sessionId = (await cookies()).get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) return new Response('Unauthorized', { status: 401 });
    const { session } = await auth.validateSession(sessionId);
    if (!session) return new Response('Unauthorized', { status: 401 });
    const userId = session.userId;

    const { messages: currentMessages } = await req.json();

    let chat = await db.query.chatTable.findFirst({
      where: and( eq(chatTable.userId, userId), eq(chatTable.modelName, MODEL_NAME) )
    });
    if (!chat) {
      chat = (await db.insert(chatTable).values({ userId: userId, modelName: MODEL_NAME }).returning())[0];
    }
    const chatId = chat.id;

    // 3. Save the user's message
    const userMessage = currentMessages[currentMessages.length - 1];
    await db.insert(messageTable).values({
      chatId: chatId,
      role: 'user',
      content: userMessage.content,
    });
    
    // --- START OF AI CHAIN ---

    // 4. STEP 1: Get the direct translation from RIVA
    const translationResponse = await openai.chat.completions.create({
      model: 'nvidia/riva-translate-4b-instruct',
      messages: [
        { role: "user", content: `Please provide only the translation for the following text, auto-detecting the source and target language. Do not add any other text.\n\n${userMessage.content}` }
      ],
      stream: false, 
      temperature: 0.1,
    });
    
    const translatedText = translationResponse.choices[0].message.content || "[Translation Failed]";

    // 5. STEP 2: Get the "Professor's" analysis
    
    // --- FIX FOR ERROR 1: Explicitly cast message types ---
    const systemPrompt: OpenAI.Chat.ChatCompletionMessageParam = { 
      role: 'system', 
      content: TRANSLATION_EXPERT_PROMPT 
    };
    
    const analysisPrompt: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'user',
      content: `Please analyze the following translation:
Source Text (ST): "${userMessage.content}"
Recommended Translation (TT): "${translatedText}"
`
    };
    // --- END FIX ---

    const analysisResponse = await openai.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct', // The "Professor" brain
      messages: [systemPrompt, analysisPrompt],
      stream: true, 
      temperature: 0.5,
      max_tokens: 4096,
    });

    // --- END OF AI CHAIN ---

    let fullReply = "";

    // 6. Create the stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          // Add the "Recommended Translation" to the top of the stream
          const formattedTranslation = `### Recommended Translation (Target Text)\n> ${translatedText}\n\n---\n`;
          controller.enqueue(encoder.encode(formattedTranslation));
          fullReply += formattedTranslation; // Add to our reply for the database

          // Now, stream the "Professor's Notes"
          for await (const chunk of analysisResponse) {
            const content = chunk.choices[0].delta.content;
            if (content) {
              fullReply += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          // 7. Save the final, combined reply to the DB
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
    });
  }
}