import OpenAI from 'openai';
import { STARTUP_ADVISOR_PROMPT } from '@/app/library/prompts/startup-advisor';

// 1. Configure the raw OpenAI client to point at NVIDIA
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let messages = [];
  try {
     const body = await req.json();
     messages = body.messages || [];
  } catch (e) { /* No body */ }

  const systemPrompt = {
    role: 'system',
    content: STARTUP_ADVISOR_PROMPT
  };

  try {
    // 2. Call NVIDIA using the exact parameters from your script
    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/deepseek-r1',
      messages: [systemPrompt, ...messages],
      temperature: 0.6,
      top_p: 0.7,
      max_tokens: 4096,
      stream: true,
    });

    // 3. Manually create a ReadableStream to parse the 'reasoning_content'
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          // This loop is the same as the `for await...` in your script
          for await (const chunk of response) {
            const delta = chunk.choices[0].delta as any;
            
            // This is the "Thinking" part
            const reasoning = delta.reasoning_content;
            if (reasoning) {
              console.log("AI REASONING:", reasoning);
            }

            // This is the main answer
            const content = delta.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (e) {
          console.error('Stream error:', e);
          controller.error(e);
        }
        controller.close();
      },
    });

    // 4. Return the custom raw stream
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