'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Send, Sparkles, Brain, Loader2 } from 'lucide-react';

// Define the shape of a message
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setError(null); // Clear previous errors
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
      }

      // Create the AI assistant message shell
      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { id: assistantMessageId, role: 'assistant', content: '' }
      ]);

      // Read the raw stream from our custom backend
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Live-update the last message in state with the new content
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* --- Header --- */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-500" />
          <div>
            <h1 className="text-lg font-semibold">Startup Blueprint Advisor</h1>
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <span className="flex h-2 w-2 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>
              DeepSeek R1 Active
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Chat Area --- */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <div className="text-center mt-20 space-y-4">
              <Sparkles className="w-10 h-10 mx-auto text-blue-500 opacity-50" />
              <h2 className="text-2xl font-bold">Ready to build?</h2>
              <p className="text-slate-400">Tell me your business idea for a full analysis.</p>

              <div className="max-w-md mx-auto mt-6 p-4 bg-amber-950/50 border border-amber-800/50 rounded-xl text-amber-300 text-sm">
                🧠 <strong>Deep Analysis Mode:</strong> This expert uses our most powerful reasoning model. Please allow <strong>~1-3 minutes</strong> for it to generate its comprehensive response.
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && <Bot className="w-8 h-8 text-blue-500 flex-shrink-0 mt-2" />}
              <div className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                m.role === 'user' ? 'bg-blue-600' : 'bg-slate-900 border border-slate-800'
              }`}>
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                   <div className="prose prose-invert max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      /* No className prop here */
                      components={{
                        // This styling detects the "> 🧠 *Thinking:*" string
                        blockquote: ({node, ...props}) => (
                          <div className="flex gap-2 bg-slate-950/50 p-3 rounded border border-slate-800 text-slate-400 italic text-sm my-4">
                            <Brain className="w-4 h-4 flex-shrink-0 mt-1" />
                            <blockquote {...props} className="border-none pl-0 my-0" />
                          </div>
                        ),
                        table: ({node, ...props}) => <div className="my-4 w-full overflow-y-auto border border-slate-700 rounded"><table className="w-full" {...props} /></div>,
                        th: ({node, ...props}) => <th className="bg-slate-800 px-3 py-2 text-left font-semibold" {...props} />,
                        td: ({node, ...props}) => <td className="border-t border-slate-700 px-3 py-2" {...props} />,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
  
                
                {/* UPSELL BUTTON */}
                {m.role === 'assistant' && !isLoading && m.content.length > 50 && (
                  <div className="mt-8 pt-4 border-t border-slate-800/50">
                    <button 
                      onClick={() => alert("Redirect to booking link!")}
                      className="group flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-all shadow-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      Need an AI Agent to execute this plan?
                    </button>
                  </div>
                )}
              </div>
              {m.role === 'user' && <User className="w-8 h-8 text-slate-300 flex-shrink-0 mt-2" />}
            </div>
          ))}
          {isLoading && messages[messages.length-1]?.role === 'user' && (
            <div className="flex justify-center"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
          )}
          {error && (
            <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-200 text-center text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* --- Input Area --- */}
      <footer className="p-4 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <input
              className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-800 pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e);
        }
      }}
              placeholder="Describe your business idea..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}