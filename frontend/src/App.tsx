import React, { useEffect } from 'react';
import { useInterviewStore } from './store/interviewStore';
import { SetupScreen } from './pages/SetupScreen';
import { InterviewRoom } from './pages/InterviewRoom';
import { ReportPage } from './pages/ReportPage';
import { HistoryPage } from './pages/HistoryPage';
import { HealthBanner } from './components/HealthBanner';
import { Bot, History, PlusCircle, Box, Image as ImageIcon } from 'lucide-react';

export const App: React.FC = () => {
  const { view, setView, avatarMode, setAvatarMode, checkHealth, health } = useInterviewStore();

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between">
      {/* Top Global Health Banner */}
      <HealthBanner />

      {/* Main Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => setView('setup')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-950/50 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-100 tracking-tight flex items-center gap-1.5">
                Rory <span className="text-brand-400 font-extrabold text-xs px-2 py-0.5 rounded-full bg-brand-500/20">AI</span>
              </span>
              <p className="text-[10px] text-slate-400 leading-none">Self Mock Interview Platform</p>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex items-center gap-3">
            {/* Avatar Mode Quick Switch */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setAvatarMode('2d')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
                  avatarMode === '2d' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="2D Vector Animated Avatar"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>2D</span>
              </button>
              <button
                onClick={() => setAvatarMode('3d')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
                  avatarMode === '3d' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="3D VRM Interactive Avatar"
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D</span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <button
              onClick={() => setView('setup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-colors ${
                view === 'setup'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-brand-400" />
              <span>New Session</span>
            </button>

            <button
              onClick={() => setView('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-colors ${
                view === 'history'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>History</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        {view === 'setup' && <SetupScreen />}
        {view === 'interview' && <InterviewRoom />}
        {view === 'report' && <ReportPage />}
        {view === 'history' && <HistoryPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Rory Mock Interview • Offline &amp; Local First (Ollama + Whisper + Kokoro)</span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Interview Model: <code className="text-brand-300">{health?.interview_model || 'qwen2.5:3b'}</code></span>
            <span>•</span>
            <span>Eval Model: <code className="text-indigo-300">{health?.eval_model || 'qwen2.5:3b'}</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
