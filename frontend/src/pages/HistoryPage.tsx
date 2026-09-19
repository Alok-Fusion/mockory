import React, { useEffect, useState } from 'react';
import { useInterviewStore } from '../store/interviewStore';
import { api } from '../services/api';
import { History, Award, Calendar, ArrowRight, ArrowLeft, Layers } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { setView, loadFinalReport } = useInterviewStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getAllSessions()
      .then((data) => {
        setSessions(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load sessions:', err);
        setIsLoading(false);
      });
  }, []);

  const handleSelectSession = (sessionId: string) => {
    loadFinalReport(sessionId);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('setup')}
            className="p-2.5 rounded-2xl glass-card hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <History className="w-6 h-6 text-brand-400" />
              <span>Interview Session History</span>
            </h1>
            <p className="text-xs text-slate-400">Track your interview preparation progress and score progression over time.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading past sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center gap-3 glass-panel rounded-3xl p-8">
          <p className="text-sm text-slate-400">No past interview sessions found yet.</p>
          <button
            onClick={() => setView('setup')}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
          >
            Start Your First Mock Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((s) => (
            <div
              key={s.session_id}
              onClick={() => handleSelectSession(s.session_id)}
              className="p-5 rounded-3xl glass-panel hover:glass-panel-glow cursor-pointer transition-all border border-slate-800 hover:border-brand-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-100 text-base">{s.role}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase">
                    {s.difficulty} • {s.strictness}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {Array.isArray(s.rounds) ? s.rounds.join(', ') : 'Interview'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {s.overall_score > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-300">
                    <Award className="w-4 h-4 text-brand-400" />
                    <span className="font-bold font-mono text-sm">{s.overall_score}</span>
                    <span className="text-xs text-slate-400">/10</span>
                  </div>
                )}
                <div className="p-2 rounded-xl bg-slate-800/80 text-slate-400 group-hover:text-slate-100">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
