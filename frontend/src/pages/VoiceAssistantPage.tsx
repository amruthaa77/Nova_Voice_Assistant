import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Loader2,
  MessageSquare,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { NovaCanvas } from '../components/3d/NovaCanvas';
import { SpeechBubble } from '../components/ui/SpeechBubble';
import { AssistantStatus } from '../api/types';

export const VoiceAssistantPage: React.FC = () => {
  const {
    backendConnected,
    status,
    setStatus,
    isSessionActive,
    startSession,
    endSession,
    sessionError,
    currentTurns,
    reducedMotion,
  } = useAssistant();

  const [isMuted, setIsMuted] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  // Set page tab title
  useEffect(() => {
    document.title = 'Nova';
  }, []);

  // Auto-scroll transcript when turns update
  useEffect(() => {
    if (showTranscripts && transcriptsEndRef.current) {
      transcriptsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTurns, showTranscripts]);

  // Check URL query for preview state (e.g. ?state=listening)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryState = params.get('state') as AssistantStatus;
      if (queryState && ['idle', 'connecting', 'listening', 'thinking', 'speaking', 'error'].includes(queryState)) {
        setStatus(queryState);
      }
    }
  }, [setStatus]);

  // Once first speech turn arrives, show transcript option
  const hasTurns = currentTurns.length > 0;

  // Single unified session toggle for both Nova mascot click and Main Button click
  const handleToggleSession = () => {
    if (status === 'connecting') {
      // Ignore clicks while connecting (strictly idempotent)
      return;
    }
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  };

  // State-based headline copy (Section 2)
  const getHeadline = () => {
    switch (status) {
      case 'connecting':
        return 'Getting ready...';
      case 'listening':
        return "I'm listening.";
      case 'thinking':
        return 'Let me think...';
      case 'speaking':
        return "Here's what I've got.";
      case 'error':
        return 'Something went wrong.';
      case 'idle':
      default:
        return "Hi, I'm Nova.";
    }
  };

  // Sound-bar animation icon for listening & speaking
  const SoundBars = () => (
    <div className="flex items-center gap-1 h-4 select-none">
      <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2.5" />
      <span className="w-1 bg-white rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.1s] h-4" />
      <span className="w-1 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s] h-3" />
      <span className="w-1 bg-white rounded-full animate-[pulse_0.35s_ease-in-out_infinite_0.15s] h-4" />
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between max-w-3xl mx-auto py-2 sm:py-4 px-3 select-none overflow-hidden">
      {/* 1. TOP: Dynamic Headline + Subline */}
      <div className="text-center pt-2 sm:pt-4 z-10 flex-shrink-0">
        <h1 className="text-3xl sm:text-4xl md:text-[44px] font-extrabold tracking-tight text-white font-display leading-[1.12] drop-shadow-[0_4px_20px_rgba(10,10,18,0.5)] transition-all duration-300">
          {getHeadline()}
        </h1>
        {status === 'idle' && (
          <p className="mt-1.5 sm:mt-2 text-[16px] text-white/80 font-normal tracking-wide drop-shadow-sm">
            Your helpful assistant. Just say the word.
          </p>
        )}
      </div>

      {/* 2. CENTER: 3D Nova Mascot (Accessible Button) with Speech Bubble */}
      <div className="relative w-full flex-1 flex items-center justify-center my-auto min-h-[280px] sm:min-h-[340px] md:min-h-[380px]">
        {/* Speech Bubble positioned to Upper-Right of Mascot */}
        <div className="absolute right-[4%] sm:right-[12%] md:right-[16%] top-[8%] sm:top-[12%] z-20 pointer-events-auto">
          <SpeechBubble
            status={status}
            errorMessage={sessionError}
            onRetry={startSession}
            onBubbleClick={handleToggleSession}
          />
        </div>

        {/* 3D Nova Mascot (Accessible Clickable Control) */}
        <div className="w-full max-w-[460px] h-[280px] sm:h-[340px] md:h-[370px] flex items-center justify-center scale-90 sm:scale-100 transition-transform">
          <NovaCanvas
            status={status}
            isSessionActive={isSessionActive}
            reducedMotion={reducedMotion}
            onToggleSession={handleToggleSession}
            onEndSession={endSession}
          />
        </div>
      </div>

      {/* 3. BOTTOM: Primary Pill Button + Controls + Hint Line */}
      <div className="w-full max-w-[420px] flex flex-col items-center gap-2.5 z-20 pb-3 sm:pb-6 flex-shrink-0">
        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
          {/* Active-Session: End-Call Button (Left, >=44px) */}
          {isSessionActive && (
            <button
              onClick={endSession}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
              title="End conversation with Nova"
              aria-label="End conversation with Nova"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Primary Pill Button (56px tall, min-w 220px, Lavender-to-Peach Gradient) */}
          <button
            onClick={handleToggleSession}
            disabled={!backendConnected || status === 'connecting'}
            className={`h-14 min-w-[210px] sm:min-w-[230px] px-8 rounded-full flex items-center justify-center gap-3 text-[15px] sm:text-base font-semibold text-white transition-all duration-200 select-none shadow-active-pill ${
              status === 'connecting'
                ? 'opacity-60 cursor-not-allowed bg-white/20'
                : 'active-nav-pill hover:brightness-105 active:scale-[0.98] cursor-pointer'
            }`}
            aria-label={
              status === 'connecting'
                ? 'Connecting'
                : isSessionActive
                ? 'End conversation with Nova'
                : 'Talk to Nova'
            }
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span>Connecting...</span>
              </>
            ) : status === 'listening' ? (
              <>
                <SoundBars />
                <span>Listening...</span>
              </>
            ) : status === 'thinking' ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span>Thinking...</span>
              </>
            ) : status === 'speaking' ? (
              <>
                <SoundBars />
                <span>Speaking...</span>
              </>
            ) : status === 'error' ? (
              <>
                <RotateCcw className="w-5 h-5 text-white" />
                <span>Try again</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-white" />
                <span>Tap to talk</span>
              </>
            )}
          </button>

          {/* Active-Session: Mute Mic Toggle (Right, >=44px) */}
          {isSessionActive && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 ${
                isMuted
                  ? 'bg-amber-500/80 text-white shadow-lg'
                  : 'aurora-glass hover:bg-white/15 text-white border border-white/20'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
          )}
        </div>

        {/* Short Hint Line */}
        <p className="text-[13px] font-medium text-white/70 text-center tracking-tight">
          {isSessionActive ? 'Tap Nova to end' : 'Or tap Nova'}
        </p>

        {/* Floating Transcript Pill Button (Appears only once speech turns exist) */}
        {hasTurns && (
          <button
            onClick={() => setShowTranscripts(!showTranscripts)}
            className="mt-1 px-3.5 py-1.5 rounded-full aurora-glass-subtle hover:bg-white/15 text-white/80 hover:text-white flex items-center gap-1.5 text-xs transition-colors cursor-pointer border border-white/15"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#FFA566]" />
            <span>{showTranscripts ? 'Hide Transcript' : `View Transcript (${currentTurns.length})`}</span>
          </button>
        )}
      </div>

      {/* --- SLIDE-IN LIVE TRANSCRIPT PANEL (Does not overlap Nova) --- */}
      {showTranscripts && (
        <aside
          className="fixed z-40 aurora-glass shadow-2xl border border-white/20 flex flex-col justify-between
          /* Desktop: Docks neatly to right edge */
          hidden md:flex inset-y-4 right-4 w-80 lg:w-96 rounded-[30px] p-5 animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#D4F23A]" />
              <h2 className="text-sm font-bold text-white font-display">Live Conversation</h2>
            </div>
            <button
              onClick={() => setShowTranscripts(false)}
              className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close transcript"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Turns List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {currentTurns.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6 text-white/50 text-xs">
                Your conversation with Nova will appear here.
              </div>
            ) : (
              currentTurns.map((turn, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${turn.speaker === 'You' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-semibold text-white/40 mb-1 px-1">
                    {turn.speaker === 'Assistant' ? 'Nova' : turn.speaker}
                  </span>
                  <div
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                      turn.speaker === 'You'
                        ? 'active-nav-pill text-white rounded-br-xs font-medium'
                        : 'bg-white/15 text-white/95 border border-white/15 rounded-bl-xs'
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptsEndRef} />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <span>Status: <strong className="text-white capitalize">{status}</strong></span>
            <span>{isSessionActive ? '● Active' : 'Standby'}</span>
          </div>
        </aside>
      )}

      {/* Mobile Bottom Sheet Transcript (<= 768px) */}
      {showTranscripts && (
        <aside className="fixed inset-x-3 bottom-3 max-h-[48vh] rounded-[26px] aurora-glass border border-white/20 p-4 z-50 shadow-2xl flex flex-col md:hidden animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-white font-display">Conversation Transcript</span>
            <button
              onClick={() => setShowTranscripts(false)}
              className="p-1 rounded-full text-white/60 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2.5 space-y-2">
            {currentTurns.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-4 text-white/50 text-xs">
                Your conversation with Nova will appear here.
              </div>
            ) : (
              currentTurns.map((turn, idx) => (
                <div key={idx} className={`flex flex-col ${turn.speaker === 'You' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-white/40">
                    {turn.speaker === 'Assistant' ? 'Nova' : turn.speaker}
                  </span>
                  <p className="text-xs text-white bg-white/15 px-3 py-1.5 rounded-xl max-w-[85%]">{turn.text}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default VoiceAssistantPage;
