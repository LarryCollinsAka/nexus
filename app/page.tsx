'use client';

import { LogOut, Bot, DollarSign, SearchCheck, Languages, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

// This is a small helper component for the cards
const ExpertCard = ({ icon, title, description, href, colorClass, tag }) => (
  <a
    href={href}
    className="relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-blue-900/50"
  >
    <div>
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg border ${colorClass}-border ${colorClass}-bg`}>
        {icon}
      </div>
      <h2 className="mb-2 text-xl font-semibold text-slate-100">{title}</h2>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
    <div className="mt-6 flex items-center justify-between">
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${colorClass}-bg-dark ${colorClass}-text`}>
        {tag}
      </span>
      <ArrowRight className="h-5 w-5 text-slate-500" />
    </div>
    {/* These styles are needed to make the custom colors work */}
    <style jsx>{`
      .text-amber-400 { color: #facc15; }
      .border-amber-400-30 { border-color: rgba(250, 204, 21, 0.3); }
      .bg-amber-400-10 { background-color: rgba(250, 204, 21, 0.1); }
      .bg-amber-400-20 { background-color: rgba(250, 204, 21, 0.2); }
      .text-amber-100 { color: #fef9c3; }

      .text-green-500 { color: #22c55e; }
      .border-green-500-30 { border-color: rgba(34, 197, 94, 0.3); }
      .bg-green-500-10 { background-color: rgba(34, 197, 94, 0.1); }
      .bg-green-500-20 { background-color: rgba(34, 197, 94, 0.2); }
      .text-green-100 { color: #dcfce7; }

      .text-purple-400 { color: #c084fc; }
      .border-purple-400-30 { border-color: rgba(192, 132, 252, 0.3); }
      .bg-purple-400-10 { background-color: rgba(192, 132, 252, 0.1); }
      .bg-purple-400-20 { background-color: rgba(192, 132, 252, 0.2); }
      .text-purple-100 { color: #f3e8ff; }

      .text-cyan-400 { color: #22d3ee; }
      .border-cyan-400-30 { border-color: rgba(34, 211, 238, 0.3); }
      .bg-cyan-400-10 { background-color: rgba(34, 211, 238, 0.1); }
      .bg-cyan-400-20 { background-color: rgba(34, 211, 238, 0.2); }
      .text-cyan-100 { color: #cffafe; }
    `}</style>
  </a>
);

export default function ChatDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* --- Header --- */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-blue-500" />
          </div>
          <h1 className="text-xl font-semibold">Nexus AI Dashboard</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </header>

      {/* --- Main Grid --- */}
      <main className="flex-1 p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Select an Expert</h2>
          <p className="text-slate-400 mb-8">
            Choose the AI expert best suited for your current task.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ExpertCard
              title="Startup Blueprint Advisor"
              description="Full-stack business analysis. Turns a raw idea into a complete execution roadmap."
              href="/chat/startup-advisor"
              tag="Deep Analysis"
              colorClass="text-amber-400 border-amber-400-30 bg-amber-400-10 bg-amber-400-20 text-amber-100"
              icon={<Bot className="h-6 w-6 text-amber-400" />}
            />
            <ExpertCard
              title="Revenue Reactor"
              description="Finds 3 immediate, actionable opportunities to increase your revenue this week."
              href="/chat/revenue-reactor"
              tag="Fast Insights"
              colorClass="text-green-500 border-green-500-30 bg-green-500-10 bg-green-500-20 text-green-100"
              icon={<DollarSign className="h-6 w-6 text-green-500" />}
            />
            <ExpertCard
              title="Business Pattern Decoder"
              description="Diagnoses your business to find the #1 bottleneck that is costing you time and money."
              href="/chat/pattern-decoder"
              tag="Fast Analysis"
              colorClass="text-purple-400 border-purple-400-30 bg-purple-400-10 bg-purple-400-20 text-purple-100"
              icon={<SearchCheck className="h-6 w-6 text-purple-400" />}
            />
            <ExpertCard
              title="Translation & Interpretation"
              description="Expert linguistic analysis and translation, with a focus on theory and nuance."
              href="/chat/translation-expert"
              tag="Specialized"
              colorClass="text-cyan-400 border-cyan-400-30 bg-cyan-400-10 bg-cyan-400-20 text-cyan-100"
      icon={<Languages className="h-6 w-6 text-cyan-400" />}
            />
          </div>
        </div>
      </main>
    </div>
  );
}