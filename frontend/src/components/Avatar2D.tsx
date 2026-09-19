import React, { useEffect, useRef, useState } from 'react';
import { useInterviewStore } from '../store/interviewStore';
import { AudioLipSyncAnalyser, MouthShape } from '../services/audioAnalyser';

export const Avatar2D: React.FC = () => {
  const { roryState, currentMouthShape, currentMouthOpening, setMouthMetrics } = useInterviewStore();
  
  // Animation states
  const [isBlinking, setIsBlinking] = useState(false);
  const [headTilt, setHeadTilt] = useState({ x: 0, y: 0, rot: 0 });
  const [breathingPhase, setBreathingPhase] = useState(0);
  const [customImageAvailable, setCustomImageAvailable] = useState<boolean | null>(null);

  const analyserRef = useRef<AudioLipSyncAnalyser | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check if custom png exists in /public/avatar2d/rory_idle.png
  useEffect(() => {
    const img = new Image();
    img.src = '/avatar2d/rory_idle.png';
    img.onload = () => setCustomImageAvailable(true);
    img.onerror = () => setCustomImageAvailable(false);
  }, []);

  // Setup Web Audio Analyser on Rory's audio playback
  useEffect(() => {
    analyserRef.current = new AudioLipSyncAnalyser();

    const loop = () => {
      const audioEl = (window as any).__currentRoryAudio as HTMLAudioElement;
      if (audioEl && analyserRef.current) {
        if (!audioEl.paused) {
          analyserRef.current.initAudioElement(audioEl);
          const { mouthShape, opening } = analyserRef.current.getAudioMetrics();
          setMouthMetrics(mouthShape, opening);
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      analyserRef.current?.destroy();
    };
  }, [setMouthMetrics]);

  // Natural Blinking timer
  useEffect(() => {
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      const nextInterval = 2500 + Math.random() * 4000;
      blinkTimeout = setTimeout(triggerBlink, nextInterval);
    };
    let blinkTimeout = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Natural Breathing & Posture animation loop
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      setBreathingPhase(Math.sin(t));

      if (roryState === 'thinking') {
        // Gaze upward, slight head tilt
        setHeadTilt({ x: 4, y: -6, rot: 3 });
      } else if (roryState === 'listening') {
        // Attentive subtle nod
        setHeadTilt({ x: 0, y: Math.sin(t * 1.5) * 3, rot: -1.5 });
      } else if (roryState === 'speaking') {
        // Natural micro head movement while articulating
        setHeadTilt({ x: Math.sin(t * 2) * 2, y: Math.cos(t * 2) * 2, rot: Math.sin(t * 1.5) * 1.5 });
      } else {
        // Idle gentle sway
        setHeadTilt({ x: Math.sin(t * 0.5) * 1.5, y: Math.cos(t * 0.5) * 1, rot: Math.sin(t * 0.4) * 0.8 });
      }
    }, 40);

    return () => clearInterval(interval);
  }, [roryState]);

  // Custom PNG Avatar rendering
  if (customImageAvailable) {
    let mouthSrc = '/avatar2d/mouth_closed.png';
    if (currentMouthShape === 'open') mouthSrc = '/avatar2d/mouth_open.png';
    else if (currentMouthShape === 'wide') mouthSrc = '/avatar2d/mouth_wide.png';
    else if (currentMouthShape === 'round') mouthSrc = '/avatar2d/mouth_round.png';
    else if (currentMouthShape === 'small') mouthSrc = '/avatar2d/mouth_small.png';

    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-dark-800 to-dark-900 border border-slate-700/50 shadow-2xl">
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${headTilt.x}px, ${headTilt.y + breathingPhase * 2}px) rotate(${headTilt.rot}deg)`,
          }}
        >
          <img src="/avatar2d/rory_idle.png" alt="Rory Interviewer" className="w-80 h-auto rounded-xl object-contain" />
          {roryState === 'speaking' && (
            <img src={mouthSrc} alt="Mouth LipSync" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-auto" />
          )}
        </div>
      </div>
    );
  }

  // High-Polish Layered Vector SVG Avatar
  const eyeHeight = isBlinking ? 1 : 12;
  const eyebrowY = roryState === 'thinking' ? -5 : (roryState === 'listening' ? -2 : 0);

  return (
    <div className="relative w-full h-[420px] lg:h-[480px] flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-[#0d1424] to-[#070a12] border border-brand-500/20 shadow-2xl shadow-indigo-950/40">
      {/* Background Lighting & Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
        <div className={`w-2.5 h-2.5 rounded-full ${roryState === 'speaking' ? 'bg-emerald-400 animate-ping' : roryState === 'thinking' ? 'bg-amber-400 animate-pulse' : 'bg-brand-400'}`} />
        <span className="text-xs font-medium text-slate-300 capitalize tracking-wide">
          Rory • {roryState}
        </span>
      </div>

      {/* Character Group */}
      <svg
        viewBox="0 0 400 450"
        className="w-full h-full max-w-[420px] drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
        style={{
          transform: `translate(${headTilt.x}px, ${headTilt.y + breathingPhase * 3}px) rotate(${headTilt.rot}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <defs>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="50%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#291102" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
          <linearGradient id="blazerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="60%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Back Hair Layer */}
        <path
          d="M 120 180 C 100 240 90 320 110 380 C 130 390 160 385 170 340 Z"
          fill="url(#hairGrad)"
        />
        <path
          d="M 280 180 C 300 240 310 320 290 380 C 270 390 240 385 230 340 Z"
          fill="url(#hairGrad)"
        />

        {/* Shoulders & Professional Blazer */}
        <path
          d="M 80 440 C 90 360 130 330 200 330 C 270 330 310 360 320 440 Z"
          fill="url(#blazerGrad)"
          stroke="#4f46e5"
          strokeWidth="1.5"
        />
        {/* Inner Shirt Collar */}
        <polygon points="175,330 225,330 200,380" fill="url(#shirtGrad)" />
        <polygon points="160,330 185,385 170,390 145,335" fill="#4338ca" />
        <polygon points="240,330 215,385 230,390 255,335" fill="#4338ca" />

        {/* Neck */}
        <rect x="180" y="270" width="40" height="65" rx="6" fill="#fbcfe8" fillOpacity="0.4" />
        <rect x="180" y="260" width="40" height="75" rx="6" fill="url(#skinGrad)" />

        {/* Head Base */}
        <ellipse cx="200" cy="200" rx="68" ry="78" fill="url(#skinGrad)" />

        {/* Cheeks Blush */}
        <ellipse cx="155" cy="225" rx="14" ry="7" fill="#f43f5e" fillOpacity="0.22" />
        <ellipse cx="245" cy="225" rx="14" ry="7" fill="#f43f5e" fillOpacity="0.22" />

        {/* Eyebrows */}
        <path
          d={`M 148 ${162 + eyebrowY} Q 165 ${156 + eyebrowY} 182 ${164 + eyebrowY}`}
          stroke="#451a03"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M 218 ${164 + eyebrowY} Q 235 ${156 + eyebrowY} 252 ${162 + eyebrowY}`}
          stroke="#451a03"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyes & Blinking */}
        <g id="eyes">
          {/* Left Eye */}
          <ellipse cx="165" cy="186" rx="12" ry={eyeHeight} fill="#ffffff" stroke="#334155" strokeWidth="0.8" />
          {!isBlinking && (
            <>
              <circle cx="166" cy="186" r="6.5" fill="#0284c7" />
              <circle cx="166" cy="186" r="3.5" fill="#0f172a" />
              <circle cx="164" cy="183" r="2" fill="#ffffff" />
            </>
          )}
          {/* Right Eye */}
          <ellipse cx="235" cy="186" rx="12" ry={eyeHeight} fill="#ffffff" stroke="#334155" strokeWidth="0.8" />
          {!isBlinking && (
            <>
              <circle cx="234" cy="186" r="6.5" fill="#0284c7" />
              <circle cx="234" cy="186" r="3.5" fill="#0f172a" />
              <circle cx="232" cy="183" r="2" fill="#ffffff" />
            </>
          )}
        </g>

        {/* Nose */}
        <path d="M 200 188 L 196 215 L 204 215" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.6" />

        {/* Lip Sync Mouth Shapes */}
        <g id="mouth">
          {currentMouthShape === 'closed' && (
            <path d="M 185 242 Q 200 246 215 242" stroke="#be123c" strokeWidth="3" strokeLinecap="round" fill="none" />
          )}

          {currentMouthShape === 'small' && (
            <ellipse cx="200" cy="243" rx="9" ry={5 * (1 + currentMouthOpening)} fill="#881337" stroke="#be123c" strokeWidth="2" />
          )}

          {currentMouthShape === 'wide' && (
            <path
              d={`M 180 241 Q 200 ${238 - currentMouthOpening * 4} 220 241 Q 200 ${248 + currentMouthOpening * 6} 180 241 Z`}
              fill="#881337"
              stroke="#be123c"
              strokeWidth="2"
            />
          )}

          {currentMouthShape === 'round' && (
            <ellipse cx="200" cy="244" rx="8" ry={10 * (0.8 + currentMouthOpening)} fill="#881337" stroke="#be123c" strokeWidth="2.5" />
          )}

          {currentMouthShape === 'open' && (
            <path
              d={`M 182 238 Q 200 234 218 238 Q 214 ${254 + currentMouthOpening * 8} 200 ${255 + currentMouthOpening * 8} Q 186 ${254 + currentMouthOpening * 8} 182 238 Z`}
              fill="#4c0519"
              stroke="#be123c"
              strokeWidth="2.5"
            />
          )}
        </g>

        {/* Front Hair & Styling */}
        <path
          d="M 130 190 C 130 110 270 110 270 190 C 255 140 230 145 200 150 C 170 145 145 140 130 190 Z"
          fill="url(#hairGrad)"
        />
        {/* Hair Strands */}
        <path
          d="M 135 180 C 120 220 125 270 135 300 C 145 270 142 220 150 180 Z"
          fill="url(#hairGrad)"
        />
        <path
          d="M 265 180 C 280 220 275 270 265 300 C 255 270 258 220 250 180 Z"
          fill="url(#hairGrad)"
        />
      </svg>
    </div>
  );
};
