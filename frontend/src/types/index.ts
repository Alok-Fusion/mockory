export interface DeliveryMetrics {
  wpm: number;
  fillers_count: number;
  fillers_list: Array<{ word: string; count: number }>;
  pauses_over_2s: number[];
  total_duration_sec: number;
  false_starts: number;
}

export interface MistakeItem {
  type: string;
  quote_from_my_answer: string;
  why_it_hurts: string;
}

export interface STARCheck {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  notes: string;
}

export interface EvalScores {
  relevance: number;
  correctness: number;
  depth: number;
  structure: number;
  communication: number;
  confidence: number;
  overall: number;
  verdict: string;
}

export interface FullTurnEvaluation {
  scores: EvalScores;
  what_was_good: string[];
  mistakes: MistakeItem[];
  missing_points: string[];
  star_completeness?: STARCheck | null;
  improved_answer: string;
  tip: string;
}

export interface NextActionDecision {
  action: 'followup' | 'new_question' | 'wrap_up_round';
  reason: string;
  topic: string;
}

export interface InterviewTurn {
  id: string;
  turn_index: number;
  round_type: string;
  question_text: string;
  acknowledgement: string;
  topic: string;
  is_followup: boolean;
  typed_text?: string;
  voice_transcript?: string;
  merged_answer?: string;
  delivery_metrics?: DeliveryMetrics;
  evaluation?: FullTurnEvaluation;
}

export interface InterviewPlan {
  role: string;
  seniority: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  resume_projects: string[];
  skill_gaps: string[];
  red_flags: string[];
}

export interface SessionData {
  session_id: string;
  candidate_name: string;
  role: string;
  jd_brief: string;
  resume_brief: string;
  plan: InterviewPlan;
  rounds: string[];
  status: string;
  difficulty?: string;
  strictness?: string;
  avatar_mode?: '2d' | '3d';
  questions_per_round?: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  ollama_connected: boolean;
  models_available: string[];
  interview_model: string;
  eval_model: string;
  whisper_ready: boolean;
  kokoro_ready: boolean;
  fix_command?: string | null;
}

export interface FinalReport {
  session_id: string;
  overall_score: number;
  round_scores: Record<string, number>;
  skill_radar: Record<string, number>;
  top_strengths: string[];
  top_mistakes: string[];
  skill_gaps_study: Array<{
    skill: string;
    topic: string;
    resource_type: string;
    action: string;
  }>;
  delivery_summary: {
    avg_wpm: number;
    total_fillers: number;
    total_pauses_over_2s: number;
    pacing_verdict: string;
  };
  practice_plan: Array<{
    step: string;
    timeline: string;
    action: string;
  }>;
  qa_review: Array<{
    turn_index: number;
    round_type: string;
    question: string;
    answer: string;
    scores: EvalScores;
    mistakes: MistakeItem[];
    what_was_good: string[];
    improved_answer: string;
    tip: string;
  }>;
}
