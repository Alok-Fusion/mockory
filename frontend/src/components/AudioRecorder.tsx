import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, HelpCircle, SkipForward, Sparkles, Loader2 } from 'lucide-react';
import { useInterviewStore } from '../store/interviewStore';
import { speechService } from '../services/speech';

export const AudioRecorder: React.FC = () => {
  const {
    currentTurn,
    currentCaption,
    isRecording,
    isSubmitting,
    currentTypedText,
    liveTranscript,
    setCurrentTypedText,
    setLiveTranscript,
    setIsRecording,
    submitAnswer,
    requestHint,
    skipCurrentQuestion,
    playRoryAudio,
  } = useInterviewStore();

  const [hintText, setHintText] = useState<string | null>(null);
  const [hintPenalty, setHintPenalty] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Setup Keyboard Shortcuts (Space for mic when textarea not focused, Ctrl+Enter to submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTypedText, liveTranscript, audioBlob]);

  // Start / Stop Recording Handler
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio Analyser for live waveform
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;

      drawWaveform();

      // Setup MediaRecorder
      audioChunksRef.current = [];
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Optional Browser Web Speech API for live transcription preview
      speechRecognitionRef.current = speechService.createSpeechRecognition(
        (transcript) => {
          setLiveTranscript(transcript);
        },
        (err) => console.log('Speech recognition note:', err)
      );
      try {
        speechRecognitionRef.current?.start();
      } catch {
        // Web Speech API already active or not supported
      }
    } catch (err) {
      alert('Microphone permission was denied or is unavailable. You can still type your answers directly!');
      console.warn('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    try {
      speechRecognitionRef.current?.stop();
    } catch {
      // recognition stopped
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecording(false);
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyserRef.current?.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(99, 102, 241, ${0.4 + (dataArray[i] / 255) * 0.6})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    render();
  };

  const handleSubmit = async () => {
    if (isRecording) {
      stopRecording();
    }
    if (!currentTypedText.trim() && !liveTranscript.trim() && !audioBlob) {
      alert('Please speak or type your answer before submitting.');
      return;
    }
    await submitAnswer(audioBlob);
    setAudioBlob(null);
    setHintText(null);
  };

  const handleHintClick = async () => {
    const hint = await requestHint();
    setHintText(hint);
    setHintPenalty('(-1 Point penalty applied to this answer)');
  };

  const handleReplayClick = () => {
    if (currentCaption) {
      playRoryAudio(currentCaption);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Question Action Bar */}
      <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-2xl glass-card">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReplayClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            title="Replay Rory's question audio"
          >
            <Volume2 className="w-3.5 h-3.5 text-brand-400" />
            <span>Replay</span>
          </button>

          <button
            onClick={handleHintClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-colors border border-amber-500/30"
            title="Request a coaching hint (-1 point)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Hint</span>
          </button>
        </div>

        <button
          onClick={skipCurrentQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
          title="Skip this question"
        >
          <span>Skip</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hint Alert if requested */}
      {hintText && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex flex-col gap-1 shadow-lg shadow-amber-950/20 animate-fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rory's Hint:</span>
          </div>
          <p className="text-slate-200">{hintText}</p>
          {hintPenalty && <span className="text-[10px] text-amber-400/80 italic">{hintPenalty}</span>}
        </div>
      )}

      {/* Answer Composition Box */}
      <div className="relative rounded-3xl glass-panel-glow p-5 flex flex-col gap-3 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">Your Response</span>
            <span className="text-[11px] text-slate-500">• Speak, type, or both</span>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-medium text-rose-400 font-mono">{formatTime(recordingDuration)}</span>
            </div>
          )}
        </div>

        {/* Live Audio Waveform Canvas */}
        {isRecording && (
          <div className="w-full h-8 bg-slate-950/60 rounded-xl overflow-hidden border border-brand-500/20 p-1">
            <canvas ref={canvasRef} width={400} height={32} className="w-full h-full" />
          </div>
        )}

        {/* Live Speech Transcript Box (editable) */}
        {liveTranscript && (
          <div className="p-3 rounded-xl bg-brand-950/30 border border-brand-500/20 text-xs text-brand-200 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-brand-400">Live Voice Transcript:</span>
              <button
                onClick={() => setLiveTranscript('')}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            <p className="italic text-slate-200">{liveTranscript}</p>
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          value={currentTypedText}
          onChange={(e) => setCurrentTypedText(e.target.value)}
          placeholder={
            isRecording
              ? "Speaking... You can also type supplementary details or code notes here..."
              : "Type your answer here, or click the microphone to speak your response..."
          }
          rows={5}
          className="w-full bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none transition-all"
        />

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between pt-2">
          {/* Mic Button */}
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-medium text-sm transition-all shadow-lg ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/50'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-brand-400" />}
            <span>{isRecording ? 'Stop Recording' : 'Record Voice'}</span>
          </button>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>Submit Answer</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-4">
          <span>Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Ctrl + Enter</kbd> to submit</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Space</kbd> toggles mic</span>
        </div>
      </div>
    </div>
  );
};
