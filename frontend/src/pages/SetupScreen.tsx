import React, { useState } from 'react';
import { useInterviewStore } from '../store/interviewStore';
import { api } from '../services/api';
import {
  Briefcase,
  FileText,
  Upload,
  Sparkles,
  Sliders,
  Layers,
  ChevronRight,
  UserCheck,
  Zap,
  Loader2,
  Box,
  Image as ImageIcon
} from 'lucide-react';

const SAMPLE_JD = `Role: Senior Backend Engineer
Company: CloudScale Systems

About the Role:
We are looking for a Senior Backend Engineer to architect, build, and scale our core high-throughput distributed transaction platform. You will lead the design of mission-critical services handling over 50,000 requests per second with strict latency SLAs.

Key Responsibilities:
- Design and maintain low-latency REST and gRPC microservices in Python / Go.
- Optimize high-volume PostgreSQL databases, query performance, and indexing strategies.
- Implement distributed caching (Redis) and event-driven pipelines (Kafka).
- Ensure 99.99% system availability, reliability, and robust fault-tolerance.

Requirements:
- 5+ years of experience in backend distributed systems.
- Strong knowledge of database concurrency, caching trade-offs, and microservices architecture.
- Demonstrated experience resolving production outages and scale bottlenecks.`;

const SAMPLE_RESUME = `Alex Morgan
Software Engineer | alex.morgan@example.com | linkedin.com/in/alexmorgan

Professional Summary:
Backend Engineer with 4 years of experience building resilient microservices in Python (FastAPI) and Go. Proven track record in database optimization, distributed caching, and cloud infrastructure.

Experience:
Software Engineer | DataFlow Tech (2022 - Present)
- Engineered event-driven streaming pipeline using FastAPI and Kafka, ingesting 15M records daily.
- Optimized slow PostgreSQL queries and created compound B-Tree indexes, reducing p95 latency from 950ms to 85ms.
- Implemented multi-layer Redis caching with adaptive TTLs, reducing database load by 45%.

Software Developer | NextGen Solutions (2020 - 2022)
- Built user authentication and RBAC authorization microservice with OAuth2 and JWT.
- Integrated automated CI/CD deployment pipelines on Kubernetes cluster.

Technical Skills:
- Languages & Frameworks: Python, FastAPI, Go, PostgreSQL, Redis, Docker, Kafka, Kubernetes.
- Methodologies: Distributed Systems, System Design, REST APIs, Microservices.`;

const ALL_ROUNDS = [
  { id: 'technical', label: 'Technical Concepts & Deep Dive', desc: 'Architecture, trade-offs, failure modes, resume projects' },
  { id: 'coding', label: 'Coding / Problem Solving Discussion', desc: 'Algorithmic reasoning, time/space complexity, edge cases' },
  { id: 'system_design', label: 'System Design', desc: 'Scale estimations, databases, caching, bottlenecks' },
  { id: 'hr', label: 'HR & Motivation', desc: 'Notice period, salary handling, career goals, culture' },
  { id: 'manager', label: 'Team & Engineering Manager', desc: 'Ownership, conflicts, mentoring, deadlines, ambiguity' },
  { id: 'behavioral', label: 'Behavioral (STAR)', desc: 'Situation, Task, Action, Result structured stories' },
  { id: 'culture', label: 'Culture Fit & Values', desc: 'Team collaboration, constructive feedback, agility' },
  { id: 'case', label: 'Case & Product Thinking', desc: 'Product metrics, user empathy, business trade-offs' },
];

export const SetupScreen: React.FC = () => {
  const { avatarMode, setAvatarMode, startSession } = useInterviewStore();

  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [selectedRounds, setSelectedRounds] = useState<string[]>(['technical', 'behavioral']);
  const [difficulty, setDifficulty] = useState('Mid');
  const [strictness, setStrictness] = useState('Realistic');
  const [questionsPerRound, setQuestionsPerRound] = useState(6);
  const [isPlanning, setIsPlanning] = useState(false);

  const handleRoundToggle = (id: string) => {
    if (selectedRounds.includes(id)) {
      if (selectedRounds.length > 1) {
        setSelectedRounds(selectedRounds.filter((r) => r !== id));
      }
    } else {
      setSelectedRounds([...selectedRounds, id]);
    }
  };

  const selectFullLoop = () => {
    setSelectedRounds(ALL_ROUNDS.map((r) => r.id));
  };

  const fillSampleData = () => {
    setJdText(SAMPLE_JD);
    setResumeText(SAMPLE_RESUME);
  };

  const handleStart = async () => {
    if (!jdText.trim() && !jdFile) {
      alert('Please paste a Job Description or upload a file.');
      return;
    }
    if (!resumeText.trim() && !resumeFile) {
      alert('Please paste your Resume or upload a file.');
      return;
    }

    setIsPlanning(true);
    try {
      const sessionData = await api.createSession({
        jdText,
        resumeText,
        rounds: selectedRounds,
        difficulty,
        strictness,
        avatarMode,
        questionsPerRound,
        jdFile,
        resumeFile,
      });

      await startSession(sessionData);
    } catch (err) {
      console.error('Session initialization error:', err);
      alert('Failed to initialize interview planning. Please ensure Ollama is running.');
      setIsPlanning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider">
              Local-First AI Interviewer
            </span>
            <span className="text-xs text-slate-400">• Powered by Ollama</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight mt-1">
            Mockory
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Simulate realistic interview rounds with Rory. Get spoken questions, live delivery analytics, instant per-turn feedback, and a personalized study roadmap.
          </p>
        </div>

        <button
          onClick={fillSampleData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-card hover:bg-slate-800 text-brand-300 hover:text-brand-200 text-xs font-semibold transition-all border border-brand-500/30"
        >
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>Fill Sample JD &amp; Resume</span>
        </button>
      </div>

      {/* Main Grid: JD + Resume Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Job Description Card */}
        <div className="rounded-3xl glass-panel p-6 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-400">
              <Briefcase className="w-5 h-5" />
              <h2 className="font-semibold text-slate-100 text-base">Job Description (JD)</h2>
            </div>
            {jdFile && (
              <span className="text-xs text-brand-300 truncate max-w-[150px]">
                {jdFile.name}
              </span>
            )}
          </div>

          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the target job description here..."
            rows={8}
            className="w-full bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
          />

          <label className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium cursor-pointer border border-slate-700 transition-colors">
            <Upload className="w-3.5 h-3.5 text-brand-400" />
            <span>{jdFile ? 'Replace JD File (PDF, DOCX, TXT)' : 'Upload JD Document (PDF, DOCX, TXT)'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => setJdFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {/* Candidate Resume Card */}
        <div className="rounded-3xl glass-panel p-6 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <FileText className="w-5 h-5" />
              <h2 className="font-semibold text-slate-100 text-base">Your Resume</h2>
            </div>
            {resumeFile && (
              <span className="text-xs text-indigo-300 truncate max-w-[150px]">
                {resumeFile.name}
              </span>
            )}
          </div>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume or CV summary here..."
            rows={8}
            className="w-full bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />

          <label className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium cursor-pointer border border-slate-700 transition-colors">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>{resumeFile ? 'Replace Resume (PDF, DOCX, TXT)' : 'Upload Resume Document (PDF, DOCX, TXT)'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>

      {/* Configuration Settings */}
      <div className="rounded-3xl glass-panel p-6 flex flex-col gap-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <Sliders className="w-5 h-5 text-brand-400" />
            <span>Interview Rounds &amp; Parameters</span>
          </div>

          <button
            onClick={selectFullLoop}
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Select Full Loop (All Rounds)</span>
          </button>
        </div>

        {/* Round Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ALL_ROUNDS.map((round) => {
            const isSelected = selectedRounds.includes(round.id);
            return (
              <button
                key={round.id}
                type="button"
                onClick={() => handleRoundToggle(round.id)}
                className={`p-4 rounded-2xl text-left flex flex-col justify-between transition-all border ${
                  isSelected
                    ? 'bg-brand-950/40 border-brand-500 shadow-md shadow-brand-950/30'
                    : 'bg-slate-900/60 border-slate-800/80 opacity-70 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100 text-xs">{round.label}</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                      isSelected ? 'bg-brand-500 border-brand-400 text-white' : 'border-slate-600'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{round.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Controls Row: Difficulty, Strictness, Avatar, Question Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Target Seniority</label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              {['Junior', 'Mid', 'Senior'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    difficulty === lvl
                      ? 'bg-brand-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Strictness */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Interviewer Strictness</label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              {['Friendly', 'Realistic', 'Tough'].map((str) => (
                <button
                  key={str}
                  onClick={() => setStrictness(str)}
                  className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    strictness === str
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {str}
                </button>
              ))}
            </div>
          </div>

          {/* Questions per Round */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Questions per Round</label>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
              {[3, 6, 9].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => setQuestionsPerRound(cnt)}
                  className={`flex-1 py-1 text-xs font-semibold rounded-xl transition-all ${
                    questionsPerRound === cnt
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cnt} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Avatar Representation</label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setAvatarMode('2d')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  avatarMode === '2d'
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>2D Vector</span>
              </button>
              <button
                onClick={() => setAvatarMode('3d')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  avatarMode === '3d'
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D VRM</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Start Interview CTA */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleStart}
          disabled={isPlanning}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bold text-base transition-all shadow-xl shadow-brand-950/60 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isPlanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing JD &amp; Preparing Interview Plan...</span>
            </>
          ) : (
            <>
              <span>Begin Mock Interview</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
