import { create } from 'zustand';
import {
  SessionData,
  InterviewTurn,
  FullTurnEvaluation,
  FinalReport,
  HealthStatus,
} from '../types';
import { MouthShape } from '../services/audioAnalyser';
import { api } from '../services/api';
import { speechService } from '../services/speech';

interface InterviewState {
  view: 'setup' | 'interview' | 'report' | 'history';
  session: SessionData | null;
  turns: InterviewTurn[];
  currentTurn: InterviewTurn | null;
  avatarMode: '2d' | '3d';
  roryState: 'idle' | 'speaking' | 'listening' | 'thinking';
  currentMouthShape: MouthShape;
  currentMouthOpening: number;
  
  // Interaction state
  isRecording: boolean;
  isSubmitting: boolean;
  liveTranscript: string;
  currentTypedText: string;
  latestEvaluation: FullTurnEvaluation | null;
  finalReport: FinalReport | null;
  health: HealthStatus | null;
  currentCaption: string;
  
  // Actions
  setView: (view: 'setup' | 'interview' | 'report' | 'history') => void;
  setAvatarMode: (mode: '2d' | '3d') => void;
  setRoryState: (state: 'idle' | 'speaking' | 'listening' | 'thinking') => void;
  setMouthMetrics: (shape: MouthShape, opening: number) => void;
  setLiveTranscript: (text: string) => void;
  setCurrentTypedText: (text: string) => void;
  setIsRecording: (recording: boolean) => void;
  
  checkHealth: () => Promise<void>;
  startSession: (sessionData: SessionData) => Promise<void>;
  fetchNextQuestion: () => Promise<void>;
  submitAnswer: (audioBlob?: Blob | null) => Promise<void>;
  requestHint: () => Promise<string>;
  skipCurrentQuestion: () => Promise<void>;
  endInterviewSession: () => Promise<void>;
  loadFinalReport: (sessionId?: string) => Promise<void>;
  playRoryAudio: (text: string) => Promise<void>;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  view: 'setup',
  session: null,
  turns: [],
  currentTurn: null,
  avatarMode: (localStorage.getItem('rory_avatar_mode') as '2d' | '3d') || '2d',
  roryState: 'idle',
  currentMouthShape: 'closed',
  currentMouthOpening: 0,
  isRecording: false,
  isSubmitting: false,
  liveTranscript: '',
  currentTypedText: '',
  latestEvaluation: null,
  finalReport: null,
  health: null,
  currentCaption: '',

  setView: (view) => set({ view }),

  setAvatarMode: (mode) => {
    localStorage.setItem('rory_avatar_mode', mode);
    set({ avatarMode: mode });
  },

  setRoryState: (roryState) => set({ roryState }),
  setMouthMetrics: (currentMouthShape, currentMouthOpening) => set({ currentMouthShape, currentMouthOpening }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setCurrentTypedText: (currentTypedText) => set({ currentTypedText }),
  setIsRecording: (isRecording) => set({ isRecording }),

  checkHealth: async () => {
    try {
      const health = await api.checkHealth();
      set({ health });
    } catch {
      set({
        health: {
          status: 'error',
          ollama_connected: false,
          models_available: [],
          interview_model: 'qwen2.5:3b',
          eval_model: 'qwen2.5:3b',
          whisper_ready: false,
          kokoro_ready: false,
          fix_command: 'ollama serve',
        },
      });
    }
  },

  startSession: async (sessionData) => {
    set({
      session: sessionData,
      turns: [],
      currentTurn: null,
      latestEvaluation: null,
      finalReport: null,
      currentTypedText: '',
      liveTranscript: '',
      view: 'interview',
    });
    await get().fetchNextQuestion();
  },

  fetchNextQuestion: async () => {
    const { session, playRoryAudio } = get();
    if (!session) return;

    set({ roryState: 'thinking', currentCaption: 'Rory is preparing the question...' });

    try {
      const nextQ = await api.getNextQuestion(session.session_id);
      if (nextQ.is_complete) {
        await get().endInterviewSession();
        return;
      }

      const turnObj: InterviewTurn = {
        id: nextQ.turn_id,
        turn_index: nextQ.turn_index,
        round_type: nextQ.round_type,
        question_text: nextQ.question_text,
        acknowledgement: nextQ.acknowledgement,
        topic: nextQ.topic,
        is_followup: nextQ.is_followup,
      };

      set((state) => ({
        turns: [...state.turns, turnObj],
        currentTurn: turnObj,
        currentTypedText: '',
        liveTranscript: '',
        currentCaption: `${nextQ.acknowledgement ? nextQ.acknowledgement + ' ' : ''}${nextQ.question_text}`,
      }));

      // Speak Rory's line
      const fullSpeech = `${nextQ.acknowledgement ? nextQ.acknowledgement + ' ' : ''}${nextQ.question_text}`;
      await playRoryAudio(fullSpeech);
    } catch (err) {
      console.error('Failed to get next question:', err);
      set({ roryState: 'idle' });
    }
  },

  playRoryAudio: async (text: string) => {
    set({ roryState: 'speaking' });

    // Attempt Kokoro TTS audio blob first
    const wavBlob = await api.synthesizeSpeech(text);
    if (wavBlob) {
      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);

      // Attach to window for lip sync analyser
      (window as any).__currentRoryAudio = audio;

      audio.onended = () => {
        set({ roryState: 'listening', currentMouthShape: 'closed', currentMouthOpening: 0 });
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        // Fallback to browser speech
        speechService.speak(
          text,
          () => set({ roryState: 'speaking' }),
          () => set({ roryState: 'listening', currentMouthShape: 'closed', currentMouthOpening: 0 })
        );
      };

      await audio.play();
    } else {
      // Direct browser speech synthesis fallback
      speechService.speak(
        text,
        () => set({ roryState: 'speaking' }),
        () => set({ roryState: 'listening', currentMouthShape: 'closed', currentMouthOpening: 0 })
      );
    }
  },

  submitAnswer: async (audioBlob) => {
    const { session, currentTurn, currentTypedText, liveTranscript, fetchNextQuestion } = get();
    if (!session || !currentTurn) return;

    set({ isSubmitting: true, roryState: 'thinking' });

    try {
      const res = await api.submitAnswer({
        sessionId: session.session_id,
        turnId: currentTurn.id,
        typedText: currentTypedText,
        voiceTranscript: liveTranscript,
        audioBlob,
      });

      // Update current turn with evaluation and metrics
      const updatedTurn: InterviewTurn = {
        ...currentTurn,
        typed_text: currentTypedText,
        voice_transcript: res.transcript || liveTranscript,
        merged_answer: res.merged_answer,
        delivery_metrics: res.delivery_metrics,
        evaluation: res.evaluation,
      };

      set((state) => ({
        turns: state.turns.map((t) => (t.id === currentTurn.id ? updatedTurn : t)),
        currentTurn: updatedTurn,
        latestEvaluation: res.evaluation,
        isSubmitting: false,
      }));

      // Immediately fetch next question while user reviews feedback
      if (res.is_complete) {
        await get().endInterviewSession();
      } else {
        await fetchNextQuestion();
      }
    } catch (err) {
      console.error('Answer submission failed:', err);
      set({ isSubmitting: false, roryState: 'idle' });
    }
  },

  requestHint: async () => {
    const { session } = get();
    if (!session) return 'No active session';
    const res = await api.requestHint(session.session_id);
    return res.hint;
  },

  skipCurrentQuestion: async () => {
    const { session, fetchNextQuestion } = get();
    if (!session) return;
    await api.skipQuestion(session.session_id);
    await fetchNextQuestion();
  },

  endInterviewSession: async () => {
    const { session, loadFinalReport } = get();
    if (session) {
      await api.endInterview(session.session_id);
      await loadFinalReport(session.session_id);
    }
  },

  loadFinalReport: async (sessionId) => {
    const sId = sessionId || get().session?.session_id;
    if (!sId) return;

    set({ view: 'report' });
    try {
      const report = await api.getSessionReport(sId);
      set({ finalReport: report });
    } catch (err) {
      console.error('Failed to load final report:', err);
    }
  },
}));
