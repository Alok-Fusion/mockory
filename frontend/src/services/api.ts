import {
  HealthStatus,
  SessionData,
  InterviewTurn,
  FullTurnEvaluation,
  NextActionDecision,
  FinalReport,
} from '../types';

const API_BASE = '/api';

export const api = {
  async checkHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      return {
        status: 'error',
        ollama_connected: false,
        models_available: [],
        interview_model: 'qwen2.5:3b',
        eval_model: 'qwen2.5:3b',
        whisper_ready: false,
        kokoro_ready: false,
        fix_command: 'ollama serve',
      };
    }
    return res.json();
  },

  async createSession(params: {
    jdText: string;
    resumeText: string;
    rounds: string[];
    difficulty: string;
    strictness: string;
    avatarMode: string;
    questionsPerRound: number;
    jdFile?: File | null;
    resumeFile?: File | null;
  }): Promise<SessionData> {
    const formData = new FormData();
    formData.append('jd_text', params.jdText);
    formData.append('resume_text', params.resumeText);
    formData.append('rounds_json', JSON.stringify(params.rounds));
    formData.append('difficulty', params.difficulty);
    formData.append('strictness', params.strictness);
    formData.append('avatar_mode', params.avatarMode);
    formData.append('questions_per_round', params.questionsPerRound.toString());

    if (params.jdFile) formData.append('jd_file', params.jdFile);
    if (params.resumeFile) formData.append('resume_file', params.resumeFile);

    const res = await fetch(`${API_BASE}/session`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to create interview session');
    return res.json();
  },

  async getNextQuestion(sessionId: string): Promise<{
    turn_id: string;
    turn_index: number;
    round_type: string;
    acknowledgement: string;
    question_text: string;
    topic: string;
    is_followup: boolean;
    is_complete: boolean;
  }> {
    const res = await fetch(`${API_BASE}/session/${sessionId}/next`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to get next question');
    return res.json();
  },

  async submitAnswer(params: {
    sessionId: string;
    turnId: string;
    typedText?: string;
    voiceTranscript?: string;
    audioBlob?: Blob | null;
  }): Promise<{
    turn_id: string;
    transcript: string;
    merged_answer: string;
    delivery_metrics: any;
    evaluation: FullTurnEvaluation;
    next_action: NextActionDecision;
    is_complete: boolean;
  }> {
    const formData = new FormData();
    formData.append('turn_id', params.turnId);
    if (params.typedText) formData.append('typed_text', params.typedText);
    if (params.voiceTranscript) formData.append('voice_transcript_client', params.voiceTranscript);
    if (params.audioBlob) {
      formData.append('audio_file', params.audioBlob, 'answer.webm');
    }

    const res = await fetch(`${API_BASE}/session/${params.sessionId}/answer`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to submit answer');
    return res.json();
  },

  async requestHint(sessionId: string): Promise<{ hint: string; penalty: string }> {
    const res = await fetch(`${API_BASE}/session/${sessionId}/hint`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to request hint');
    return res.json();
  },

  async skipQuestion(sessionId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/session/${sessionId}/skip`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to skip question');
    return res.json();
  },

  async endInterview(sessionId: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/session/${sessionId}/end`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to end interview');
    return res.json();
  },

  async getSessionReport(sessionId: string): Promise<FinalReport> {
    const res = await fetch(`${API_BASE}/session/${sessionId}/report`);
    if (!res.ok) throw new Error('Failed to fetch session report');
    return res.json();
  },

  async getAllSessions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async synthesizeSpeech(text: string): Promise<Blob | null> {
    try {
      const res = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.status === 204 || res.headers.get('X-TTS-Fallback') === 'browser') {
        return null;
      }
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  },
};
