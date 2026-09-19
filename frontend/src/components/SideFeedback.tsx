import React from 'react';
import { useInterviewStore } from '../store/interviewStore';
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Award,
  Activity,
  Sparkles,
} from 'lucide-react';

export const SideFeedback: React.FC = () => {
  const { latestEvaluation, turns } = useInterviewStore();

  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const delivery = lastTurn?.delivery_metrics;

  if (!latestEvaluation) {
    return (
      <div className="h-full rounded-3xl glass-panel p-6 flex flex-col items-center justify-center text-center gap-3 border border-slate-800 text-slate-400">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-brand-400">
          <Activity className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="font-semibold text-slate-200 text-sm">Real-time Coaching Panel</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          Submit your answer to receive instantaneous scoring, identified mistakes with quotes, delivery metrics, and improved first-person answers.
        </p>
      </div>
    );
  }

  const { scores, what_was_good, mistakes, missing_points, star_completeness, improved_answer, tip } = latestEvaluation;

  return (
    <div className="h-full rounded-3xl glass-panel p-5 flex flex-col gap-4 overflow-y-auto border border-brand-500/20 shadow-2xl">
      {/* Header & Overall Score */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">Turn Evaluation</span>
          <h3 className="text-sm font-semibold text-slate-100">{scores.verdict || 'Answer Evaluated'}</h3>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-300">
          <Award className="w-4 h-4 text-brand-400" />
          <span className="text-base font-bold font-mono">{scores.overall}</span>
          <span className="text-xs text-slate-400">/10</span>
        </div>
      </div>

      {/* Delivery Metrics Bar (if voice recorded) */}
      {delivery && delivery.wpm > 0 && (
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] uppercase">Speech Pace</span>
            <span className="font-semibold text-slate-200 font-mono">{delivery.wpm} WPM</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] uppercase">Fillers Count</span>
            <span className={`font-semibold font-mono ${delivery.fillers_count > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {delivery.fillers_count} ({delivery.fillers_list.map((f) => f.word).join(', ') || 'None'})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] uppercase">Pauses &gt;2s</span>
            <span className="font-semibold text-slate-200 font-mono">{delivery.pauses_over_2s.length}</span>
          </div>
        </div>
      )}

      {/* Score Dimensions Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <span className="text-[10px] text-slate-400 uppercase">Relevance</span>
          <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{scores.relevance}/10</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <span className="text-[10px] text-slate-400 uppercase">Correctness</span>
          <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{scores.correctness}/10</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <span className="text-[10px] text-slate-400 uppercase">Depth</span>
          <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{scores.depth}/10</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <span className="text-[10px] text-slate-400 uppercase">Structure</span>
          <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{scores.structure}/10</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <span className="text-[10px] text-slate-400 uppercase">Comm.</span>
          <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{scores.communication}/10</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <span className="text-[10px] text-slate-400 uppercase">Confidence</span>
          <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{scores.confidence}/10</p>
        </div>
      </div>

      {/* STAR Framework Checklist (if behavioral/HR) */}
      {star_completeness && (
        <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col gap-1.5 text-xs">
          <span className="text-[10px] font-bold uppercase text-indigo-400">STAR Completeness Check:</span>
          <div className="grid grid-cols-4 gap-1 text-[11px]">
            <span className={star_completeness.situation ? 'text-emerald-400' : 'text-rose-400'}>
              {star_completeness.situation ? '✓' : '✗'} Situation
            </span>
            <span className={star_completeness.task ? 'text-emerald-400' : 'text-rose-400'}>
              {star_completeness.task ? '✓' : '✗'} Task
            </span>
            <span className={star_completeness.action ? 'text-emerald-400' : 'text-rose-400'}>
              {star_completeness.action ? '✓' : '✗'} Action
            </span>
            <span className={star_completeness.result ? 'text-emerald-400' : 'text-rose-400'}>
              {star_completeness.result ? '✓' : '✗'} Result
            </span>
          </div>
          {star_completeness.notes && <p className="text-slate-400 text-[11px] mt-1">{star_completeness.notes}</p>}
        </div>
      )}

      {/* What Was Good */}
      {what_was_good && what_was_good.length > 0 && (
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> What Was Good
          </span>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            {what_was_good.map((g, idx) => (
              <li key={idx}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Identified Mistakes */}
      {mistakes && mistakes.length > 0 && (
        <div className="flex flex-col gap-2 text-xs">
          <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Specific Mistakes &amp; Fixes
          </span>
          <div className="space-y-2">
            {mistakes.map((m, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase">
                    {m.type}
                  </span>
                </div>
                {m.quote_from_my_answer && (
                  <p className="italic text-slate-300 text-[11px]">"{m.quote_from_my_answer}"</p>
                )}
                <p className="text-slate-400 text-[11px]"><span className="text-slate-300 font-medium">Why it hurts:</span> {m.why_it_hurts}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Points for this JD */}
      {missing_points && missing_points.length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5" /> Missing Points for this JD
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
            {missing_points.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* First-person Improved Answer */}
      {improved_answer && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-brand-500/30 flex flex-col gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-brand-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Improved Model Answer (In Your Voice)
          </span>
          <p className="text-slate-200 leading-relaxed text-[11.5px] italic">{improved_answer}</p>
        </div>
      )}

      {/* Single Actionable Tip */}
      {tip && (
        <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2 text-xs">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-400 block">Pro Tip for Next Turn</span>
            <p className="text-slate-200 text-[11.5px]">{tip}</p>
          </div>
        </div>
      )}
    </div>
  );
};
