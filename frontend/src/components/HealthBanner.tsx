import React from 'react';
import { useInterviewStore } from '../store/interviewStore';
import { AlertCircle, Terminal, RefreshCw } from 'lucide-react';

export const HealthBanner: React.FC = () => {
  const { health, checkHealth } = useInterviewStore();

  if (!health || health.status === 'ok') return null;

  return (
    <div className="w-full bg-rose-950/80 border-b border-rose-500/40 px-4 py-3 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            {!health.ollama_connected
              ? 'Local Ollama is currently unreachable at http://localhost:11434.'
              : `Required LLM model '${health.interview_model}' is not installed.`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {health.fix_command && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              <span>{health.fix_command}</span>
            </div>
          )}

          <button
            onClick={() => checkHealth()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    </div>
  );
};
