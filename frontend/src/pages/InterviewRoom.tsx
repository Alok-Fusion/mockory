import React from 'react';
import { useInterviewStore } from '../store/interviewStore';
import { Avatar2D } from '../components/Avatar2D';
import { Avatar3D } from '../components/Avatar3D';
import { AudioRecorder } from '../components/AudioRecorder';
import { SideFeedback } from '../components/SideFeedback';
import { StopCircle, Award, Layers, Sparkles, MessageSquare } from 'lucide-react';

export const InterviewRoom: React.FC = () => {
  const {
    session,
    turns,
    currentTurn,
    avatarMode,
    currentCaption,
    roryState,
    endInterviewSession,
  } = useInterviewStore();

  const currentRoundName = currentTurn?.round_type || 'Interview';
  const turnsCount = turns.length;
  const maxQs = session?.questions_per_round || 6;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 min-h-[90vh]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-4 rounded-3xl glass-panel border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase">
            <Layers className="w-3.5 h-3.5" />
            <span>Round: {currentRoundName}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Turn {turnsCount}</span>
            <span>•</span>
            <span className="capitalize">{session?.difficulty} Level</span>
            <span>•</span>
            <span className="capitalize">{session?.strictness} Strictness</span>
          </div>
        </div>

        <button
          onClick={endInterviewSession}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold transition-colors border border-rose-500/40"
        >
          <StopCircle className="w-4 h-4 text-rose-400" />
          <span>End Interview &amp; Generate Report</span>
        </button>
      </div>

      {/* Main Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Rory Avatar & Live Captions (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Avatar Window */}
          <div className="w-full">
            {avatarMode === '3d' ? <Avatar3D /> : <Avatar2D />}
          </div>

          {/* Subtitle / Question Caption Box */}
          <div className="p-4 rounded-3xl glass-panel-glow border border-brand-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Rory
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono">
                {roryState === 'speaking' ? 'Speaking...' : roryState === 'thinking' ? 'Thinking...' : 'Listening'}
              </span>
            </div>
            <p className="text-sm md:text-base font-medium text-slate-100 leading-relaxed">
              {currentCaption || 'Rory is preparing the question...'}
            </p>
          </div>
        </div>

        {/* Right Column: Interaction & Side Feedback (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Candidate Answer Input Panel */}
          <AudioRecorder />

          {/* Real-time Turn Evaluation Side Panel */}
          <SideFeedback />
        </div>
      </div>
    </div>
  );
};
