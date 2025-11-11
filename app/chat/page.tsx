'use client';

import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useRef } from 'react';
import { Bot, User, Send, Sparkles, Brain, Loader2 } from 'lucide-react';

export default function ChatPage() {
  // STANDARD VERCEL SDK IMPLEMENTATION
  // We let the hook manage all form state.
  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat({
    api: '/api/chat',
    onError: (err) => {
      console.error("SDK Error:", err);
      // Optional: Add visible toast notification here
    },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* --- Header --- */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Bot className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Startup Blueprint Advisor</h1>
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              DeepSeek R1 Active
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Chat Area --- */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <div className="text-center mt-20 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="inline-flex p-4 bg-slate-900 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold">Ready to build?</h2>
              <p className="text-slate-400">Tell me your business idea for a full analysis.</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30 mt-1">
                  <Bot className="w-5 h-5 text-blue-500" />
                </div>
              )}

              <div className={`max-w-[85%] md:max-w-2xl rounded-2xl px-6 py-4 ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-900 border border-slate-800'
              }`}>
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-invert max-w-none prose-p:leading-relaxed"
                    components={{
                      // Styling for DeepSeek's thinking process (if we caught it in backend)
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
                )}
              </div>
            </div>
          ))}
          
          {error && (
             <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-200 text-center text-sm">
               Connection error. Please try again.
             </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* --- Input Area --- */}
      <footer className="p-4 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          {/* Standard Vercel SDK Form Handlers */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-800 pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
              value={input}
              onChange={handleInputChange}
              placeholder="Describe your business idea..."
              disabled={isLoading}
            />
            <button
              type="submit"
              // The ? is the critical fix for the crash you just saw
              disabled={isLoading || !input?.trim()}
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