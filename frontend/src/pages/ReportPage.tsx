import React from 'react';
import { useInterviewStore } from '../store/interviewStore';
import {
  Award,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Activity,
  Calendar,
  Layers,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

export const ReportPage: React.FC = () => {
  const { finalReport, setView } = useInterviewStore();

  if (!finalReport) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
        <Activity className="w-10 h-10 text-brand-400 animate-spin" />
        <h2 className="text-xl font-bold text-slate-100">Generating Comprehensive Report...</h2>
        <p className="text-sm text-slate-400">Assembling scoring dimensions, mistake retrospectives, and study guides.</p>
      </div>
    );
  }

  const {
    session_id,
    overall_score,
    round_scores,
    skill_radar,
    top_strengths,
    top_mistakes,
    skill_gaps_study,
    delivery_summary,
    practice_plan,
    qa_review,
  } = finalReport;

  // Radar Chart Calculations (SVG polygon)
  const radarDimensions = [
    { key: 'relevance', label: 'Relevance', val: skill_radar.relevance || 7.0 },
    { key: 'correctness', label: 'Correctness', val: skill_radar.correctness || 7.0 },
    { key: 'depth', label: 'Depth', val: skill_radar.depth || 7.0 },
    { key: 'structure', label: 'Structure', val: skill_radar.structure || 7.0 },
    { key: 'communication', label: 'Communication', val: skill_radar.communication || 7.0 },
    { key: 'confidence', label: 'Confidence', val: skill_radar.confidence || 7.0 },
  ];

  const size = 300;
  const center = size / 2;
  const radius = 105;
  const total = radarDimensions.length;

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const r = (value / 10.0) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = radarDimensions
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.val);
      return `${x},${y}`;
    })
    .join(' ');

  const handleExportPDF = () => {
    window.open(`/api/session/${session_id}/export/pdf`, '_blank');
  };

  const handleExportMD = () => {
    window.open(`/api/session/${session_id}/export/md`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('setup')}
            className="p-2.5 rounded-2xl glass-card hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Performance Retrospective</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Interview Evaluation Report</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMD}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl glass-card hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <FileText className="w-4 h-4 text-brand-400" />
            <span>Export Markdown</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-950/40 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Stats Row: Overall Score, Radar Chart, Delivery Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Overall Score Badge & Round Breakdown (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-6 flex flex-col justify-between gap-6 shadow-xl">
          <div>
            <span className="text-xs font-semibold uppercase text-brand-400 tracking-wider">Overall Assessment</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-extrabold text-slate-100 font-mono">{overall_score}</span>
              <span className="text-lg text-slate-400 font-semibold">/ 10.0</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {overall_score >= 8.0 ? 'Strong Hire level competency' : overall_score >= 6.5 ? 'Solid competency with targetable areas for improvement' : 'Requires dedicated practice before on-site'}
            </p>
          </div>

          {/* Round Scores */}
          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4">
            <span className="text-xs font-bold uppercase text-slate-400">Round Breakdown</span>
            <div className="space-y-2">
              {Object.entries(round_scores).map(([round, score]) => (
                <div key={round} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-slate-300">{round}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full"
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-200">{score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skill Dimensions Radar Chart (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-4 flex flex-col items-center justify-center shadow-xl">
          <span className="text-xs font-semibold uppercase text-brand-400 tracking-wider self-start px-2">
            Skill Radar Dimensions
          </span>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] h-auto my-2">
            {/* Background Grid Circles */}
            {[0.25, 0.5, 0.75, 1.0].map((level, idx) => (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius * level}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="3 3"
              />
            ))}

            {/* Axis Lines */}
            {radarDimensions.map((_, i) => {
              const { x, y } = getCoordinates(i, 10.0);
              return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255, 255, 255, 0.1)" />;
            })}

            {/* Polygon Area */}
            <polygon
              points={polygonPoints}
              fill="rgba(99, 102, 241, 0.35)"
              stroke="#818cf8"
              strokeWidth="2.5"
            />

            {/* Point Markers & Labels */}
            {radarDimensions.map((d, i) => {
              const pt = getCoordinates(i, d.val);
              const labelPt = getCoordinates(i, 12.0);
              return (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x={labelPt.x}
                    y={labelPt.y}
                    fill="#cbd5e1"
                    fontSize="9.5"
                    fontWeight="600"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {d.label} ({d.val})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Delivery Analytics Summary (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-6 flex flex-col justify-between gap-4 shadow-xl">
          <div>
            <span className="text-xs font-semibold uppercase text-brand-400 tracking-wider">Delivery Summary</span>
            <h3 className="text-base font-semibold text-slate-100 mt-1">Vocal &amp; Delivery Pacing</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Avg Speech Pace</span>
              <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">{delivery_summary.avg_wpm} WPM</p>
              <span className="text-[10px] text-brand-400">{delivery_summary.pacing_verdict}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Total Fillers</span>
              <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">{delivery_summary.total_fillers}</p>
              <span className="text-[10px] text-slate-400">across session</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 col-span-2">
              <span className="text-[10px] text-slate-400 uppercase">Long Pauses (&gt;2s)</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">{delivery_summary.total_pauses_over_2s} pauses observed</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Computed deterministically from word timestamps and audio waveforms.
          </p>
        </div>
      </div>

      {/* Strengths & Mistakes Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Strengths */}
        <div className="rounded-3xl glass-panel p-6 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Key Strengths Observed</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-200">
            {top_strengths.map((s, idx) => (
              <li key={idx} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Recurring Mistakes */}
        <div className="rounded-3xl glass-panel p-6 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>Top Recurring Improvement Areas</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-200">
            {top_mistakes.map((m, idx) => (
              <li key={idx} className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Skill Gaps Study Guide & Practice Plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skill Gaps Against JD */}
        <div className="rounded-3xl glass-panel p-6 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <BookOpen className="w-5 h-5" />
            <span>Skill Gaps Against Target JD (Study Guide)</span>
          </div>
          <div className="space-y-2 text-xs">
            {skill_gaps_study.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{item.skill}</span>
                  <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    {item.resource_type}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]"><span className="text-slate-400">Core Topic:</span> {item.topic}</p>
                <p className="text-slate-400 text-[11px]"><span className="text-slate-300 font-medium">Recommended Action:</span> {item.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prioritized Practice Plan */}
        <div className="rounded-3xl glass-panel p-6 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
            <Calendar className="w-5 h-5" />
            <span>Prioritized Practice Plan</span>
          </div>
          <div className="space-y-2 text-xs">
            {practice_plan.map((p, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-indigo-950/20 border border-brand-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{p.step}</span>
                  <span className="text-[10px] text-brand-300 font-mono">{p.timeline}</span>
                </div>
                <p className="text-slate-300 text-[11.5px] leading-relaxed">{p.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question-by-Question Retrospective */}
      <div className="rounded-3xl glass-panel p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <Layers className="w-5 h-5 text-brand-400" />
            <span>Turn-by-Turn Question Retrospective</span>
          </div>
          <span className="text-xs text-slate-400">{qa_review.length} Questions Reviewed</span>
        </div>

        <div className="space-y-4">
          {qa_review.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 text-[10px] font-bold uppercase">
                    Turn {item.turn_index + 1} • {item.round_type}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-200">
                  Score: {item.scores.overall || 7}/10
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-100">{item.question}</p>
              
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Your Answer:</span>
                <p className="italic">{item.answer || '[No answer recorded]'}</p>
              </div>

              {item.improved_answer && (
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-brand-500/30 text-xs text-slate-200">
                  <span className="text-[10px] uppercase font-bold text-brand-400 block mb-1">Improved Version:</span>
                  <p>{item.improved_answer}</p>
                </div>
              )}

              {item.tip && (
                <p className="text-[11px] text-emerald-400">
                  <span className="font-bold">Tip:</span> {item.tip}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
