'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// 1. Updated Icons
import { Bot, User, Send, Sparkles, Brain, Loader2, LogOut, DollarSign } from 'lucide-react'; 
import { useRouter } from 'next/navigation';

interface Message {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
}

// 2. Define new API endpoints
const CHAT_API_ENDPOINT = '/api/chat/revenue-reactor';
const HISTORY_API_ENDPOINT = '/api/chat/history/revenue-reactor';

export default function RevenueReactorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  // 3. Load history from new endpoint
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(HISTORY_API_ENDPOINT); // Use new endpoint
        if (!res.ok) {
          throw new Error('Failed to fetch history');
        }
        const history: Message[] = await res.json();
        setMessages(history);
      } catch (err) {
        if (err instanceof Error) console.error(err.message);
        router.push('/login');
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [router]);

  // (Auto-scroll and Logout are identical)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // 4. Handle submit to new endpoint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(CHAT_API_ENDPOINT, { // Use new endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!response.ok || !response.body) throw new Error(`Connection failed: ${response.statusText}`);

      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages(prev => [ ...prev, { id: assistantMessageId, role: 'assistant', content: '' } ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg));
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* --- 5. Header (Updated Title) --- */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-green-500" /> {/* New Icon */}
          <div>
            <h1 className="text-lg font-semibold">Revenue Reactor</h1>
            <div className="flex items-center gap-2 text-xs text-green-400"> {/* New Color */}
              <span className="flex h-2 w-2 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
              Llama 3.1 70B (Fast Insights)
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </header>

      {/* --- 6. Main Chat Area (Updated Empty State) --- */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {isLoadingHistory && <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}
          {!isLoadingHistory && messages.length === 0 && (
            <div className="text-center mt-20 space-y-4">
              <Sparkles className="w-10 h-10 mx-auto text-green-500 opacity-50" />
              <h2 className="text-2xl font-bold">Welcome!</h2>
              <p className="text-slate-400">Describe your business to get 3 immediate revenue ideas.</p>
              {/* No 2-minute warning here */}
            </div>
          )}

          {/* 7. Message Loop (Updated Icon, No 'blockquote' style) */}
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && (
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-5 py-4 ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 text-slate-100'}`}>
                {m.role === 'user' ? <div className="whitespace-pre-wrap">{m.content}</div> : (
                  <div className="prose prose-invert max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // This model has no 'Thinking' block, so no 'blockquote' style needed
                        table: ({node, ...props}) => <div className="my-4 w-full overflow-y-auto border border-slate-700 rounded"><table className="w-full" {...props} /></div>,
                        th: ({node, ...props}) => <th className="bg-slate-700 px-3 py-2 text-left font-semibold" {...props} />,
                        td: ({node, ...props}) => <td className="border-t border-slate-700 px-3 py-2" {...props} />,
                      }}
                    >{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-600">
                  <User className="w-5 h-5 text-slate-300" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 ..."><DollarSign className="w-5 h-5 text-green-500" /></div>
              <div className="max-w-[75%] rounded-2xl px-5 py-4 bg-slate-800 text-slate-100">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          {error && <div className="p-4 bg-red-950/50 ..."><strong>Error:</strong> {error}</div>}
          <div ref={bottomRef} />
        </div>
      </main>
      
      {/* 8. Input Area (Identical) */}
      <footer className="p-4 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <input
              className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-800 pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your business..."
              disabled={isLoading || isLoadingHistory}
            />
            <button type="submit" disabled={isLoading || isLoadingHistory || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-all">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}