import React from 'react';
import {
  Mic2,
  Clock,
  MessageSquare,
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { NavigationPage } from '../components/layout/Sidebar';

interface OverviewPageProps {
  onNavigate: (page: NavigationPage) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const {
    backendConnected,
    backendHealth,
    latencyMs,
    transcripts,
    isLoadingTranscripts,
    mode,
    availableVoices,
    selectedVoiceId,
  } = useAssistant();

  // Aggregate stats from actual backend transcripts
  const totalConversations = transcripts.length;
  const totalDurationSeconds = transcripts.reduce(
    (acc, curr) => acc + (curr.duration_seconds ?? 0),
    0
  );
  const totalTurns = transcripts.reduce((acc, curr) => acc + curr.total_turns, 0);

  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}m ${seconds}s`;
  };

  const selectedVoice = availableVoices.find((v) => v.voice_id === selectedVoiceId);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <GlassCard className="p-6 sm:p-8 overflow-hidden relative" glow="cyan">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="cyan" pulse size="sm">
                System Ready
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                Mode: <strong className="text-cyan-300 uppercase">{mode}</strong>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Next-Gen Real-Time Voice Assistant
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Powered by ElevenLabs Conversational AI with ultra-low latency audio, natural
              barge-in interruption, and deep conversational intelligence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('assistant')}
              leftIcon={<Mic2 className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
            >
              Launch Voice Assistant
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: System Status */}
        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              API Status
            </span>
            <div
              className={`p-2 rounded-xl ${
                backendConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {backendConnected ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white">
              {backendConnected ? 'Online' : 'Disconnected'}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendConnected ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              {backendConnected
                ? `FastAPI v${backendHealth?.version ?? '1.0.0'} (${latencyMs ?? 0}ms ping)`
                : 'Server unreachable at port 8000'}
            </p>
          </div>
        </GlassCard>

        {/* Metric 2: Total Conversations */}
        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Recorded Sessions
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white font-mono">
              {isLoadingTranscripts ? '...' : totalConversations}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {totalTurns} total speech turns logged
            </p>
          </div>
        </GlassCard>

        {/* Metric 3: Total Spoken Duration */}
        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Airtime
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white font-mono">
              {isLoadingTranscripts ? '...' : formatDuration(totalDurationSeconds)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Across all recorded sessions
            </p>
          </div>
        </GlassCard>

        {/* Metric 4: Active Voice Profile */}
        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Selected Voice
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white truncate">
              {selectedVoice?.name ?? 'Rachel'}
            </div>
            <p className="text-xs text-slate-400 mt-1 truncate">
              {selectedVoice?.category ?? 'ElevenLabs Premade'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Two-Column Lower Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Recent Conversation History
            </h3>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              View all ({transcripts.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <GlassCard className="divide-y divide-white/5 overflow-hidden">
            {transcripts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm font-medium">No recorded conversations yet.</p>
                <p className="text-xs text-slate-500">
                  Start a session in the Voice Assistant tab to create your first transcript.
                </p>
              </div>
            ) : (
              transcripts.slice(0, 5).map((t) => (
                <div
                  key={t.filename}
                  onClick={() => onNavigate('history')}
                  className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl ${
                        t.mode === 'agent'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'bg-purple-500/10 text-purple-400'
                      }`}
                    >
                      {t.mode === 'agent' ? (
                        <Sparkles className="w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-200 truncate">
                        {t.filename}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{t.start_time ? new Date(t.start_time).toLocaleString() : 'Recent session'}</span>
                        <span>•</span>
                        <span>{t.total_turns} turns</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={t.mode === 'agent' ? 'cyan' : 'violet'} size="sm">
                      {t.mode}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">
                      {t.duration_seconds ? `${Math.round(t.duration_seconds)}s` : '--'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </GlassCard>
        </div>

        {/* Right Column: Engine Architecture Overview */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            System Architecture
          </h3>

          <GlassCard className="p-5 space-y-4">
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-midnight-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300">Agent Mode</span>
                  <Badge variant="cyan" size="sm">
                    Default
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Direct WebSocket to ElevenLabs Conversational AI with native interruption
                  handling and server-side turn coordination.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-midnight-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300">Pipeline Mode</span>
                  <Badge variant="violet" size="sm">
                    Modular
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Decoupled voice loop: Scribe STT → Claude LLM → ElevenLabs TTS with
                  custom Voice Activity Detection (VAD).
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="text-xs font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Backend Port:</span>
                  <span className="text-slate-200">8000</span>
                </div>
                <div className="flex justify-between">
                  <span>Frontend Port:</span>
                  <span className="text-slate-200">5173</span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Sample Rate:</span>
                  <span className="text-slate-200">16,000 Hz</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
