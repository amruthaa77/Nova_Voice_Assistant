import React from 'react';
import { RefreshCw, Radio, Sparkles, Volume2, AlertTriangle } from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const {
    backendConnected,
    backendHealth,
    latencyMs,
    pingBackend,
    mode,
    setMode,
    availableVoices,
    selectedVoiceId,
  } = useAssistant();

  const selectedVoice = availableVoices.find((v) => v.voice_id === selectedVoiceId);

  return (
    <header className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 sm:px-8 py-4 rounded-[26px] aurora-glass shadow-lg">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
          {title}
        </h1>
        {subtitle && <p className="text-xs sm:text-sm text-white/60 mt-0.5">{subtitle}</p>}
      </div>

      {/* Status & Control Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Backend Warning Banner if Offline */}
        {!backendConnected && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Server Offline</span>
            <button
              onClick={pingBackend}
              className="p-1 rounded-full text-rose-200 hover:text-white hover:bg-rose-500/30 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Selected Voice Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full aurora-glass-subtle text-xs text-white/80 border border-white/10">
          <Volume2 className="w-3.5 h-3.5 text-[#FFA566]" />
          <span className="text-white/50">Voice:</span>
          <span className="font-semibold text-white">
            {selectedVoice?.name ?? 'Rachel'}
          </span>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center p-1 rounded-full aurora-glass-subtle border border-white/10">
          <button
            onClick={() => setMode('agent')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              mode === 'agent'
                ? 'active-nav-pill text-white shadow-active-pill'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Agent
          </button>
          <button
            onClick={() => setMode('pipeline')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              mode === 'pipeline'
                ? 'active-nav-pill text-white shadow-active-pill'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            Pipeline
          </button>
        </div>

        {/* Backend Online Health Pill */}
        {backendConnected && (
          <Badge variant="emerald" pulse size="md">
            API v{backendHealth?.version ?? '1.0.0'} ({latencyMs ?? 0}ms)
          </Badge>
        )}
      </div>
    </header>
  );
};
