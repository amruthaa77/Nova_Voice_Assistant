import React, { useState } from 'react';
import {
  Volume2,
  Globe,
  Cpu,
  Eye,
  RefreshCw,
  Sparkles,
  Zap,
  Check,
  Shield,
  Play,
  Pause,
} from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const {
    mode,
    setMode,
    selectedVoiceId,
    setSelectedVoiceId,
    selectedLanguage,
    setSelectedLanguage,
    availableVoices,
    isLoadingVoices,
    reloadVoices,
    reducedMotion,
    setReducedMotion,
    soundEffects,
    setSoundEffects,
  } = useAssistant();

  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Play / pause voice audio sample preview
  const handleTogglePreview = (previewUrl?: string | null) => {
    if (!previewUrl) return;

    if (playingPreviewUrl === previewUrl && audioElement) {
      audioElement.pause();
      setPlayingPreviewUrl(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(previewUrl);
    audio.play();
    audio.onended = () => setPlayingPreviewUrl(null);
    setAudioElement(audio);
    setPlayingPreviewUrl(previewUrl);
  };

  const handleSaveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const languages = [
    { code: 'en', name: 'English (US / UK)' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'it', name: 'Italian (Italiano)' },
    { code: 'ja', name: 'Japanese (日本語)' },
    { code: 'zh', name: 'Chinese (Mandarin)' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Voice Model Selection */}
      <GlassCard className="p-6 space-y-5" glow="cyan">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Voice Model Selection</h3>
              <p className="text-xs text-slate-400">
                Choose the synthetic persona powered by ElevenLabs.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={reloadVoices}
            isLoading={isLoadingVoices}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Voices
          </Button>
        </div>

        {isLoadingVoices ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-cyan-400" />
            <p className="mt-2 text-xs">Querying ElevenLabs Voice Catalog...</p>
          </div>
        ) : availableVoices.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-midnight-950/60 rounded-xl border border-white/5 space-y-2">
            <p className="text-xs">No voices returned from the backend.</p>
            <p className="text-[11px] text-slate-500">
              Ensure your ELEVENLABS_API_KEY is properly configured in your backend .env file.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {availableVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.voice_id;
              const isPlaying = playingPreviewUrl === voice.preview_url;

              return (
                <div
                  key={voice.voice_id}
                  onClick={() => setSelectedVoiceId(voice.voice_id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-glow-subtle'
                      : 'bg-midnight-950/60 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200 truncate">
                          {voice.name}
                        </span>
                        {isSelected && (
                          <span className="p-0.5 rounded-full bg-cyan-400 text-slate-950">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {voice.description || voice.category || 'Standard AI Voice'}
                      </p>
                    </div>

                    {voice.preview_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePreview(voice.preview_url);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          isPlaying
                            ? 'bg-cyan-400 text-slate-950 shadow-glow-cyan'
                            : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                        title={isPlaying ? 'Pause preview' : 'Play audio sample'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {voice.labels && Object.keys(voice.labels).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(voice.labels)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-midnight-900 border border-white/5 text-slate-400"
                          >
                            {v}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* 2. Language & Personality Preferences */}
      <GlassCard className="p-6 space-y-5" glow="none">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
          <Globe className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-base font-bold text-white">Language & Regional Preferences</h3>
            <p className="text-xs text-slate-400">
              Set the primary language code for speech recognition and conversational generation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Spoken Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-midnight-950 text-xs sm:text-sm text-slate-200 rounded-xl p-3 border border-white/10 focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Default Execution Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('agent')}
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  mode === 'agent'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-subtle'
                    : 'bg-midnight-950 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Agent Mode
              </button>
              <button
                type="button"
                onClick={() => setMode('pipeline')}
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  mode === 'pipeline'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-glow-subtle'
                    : 'bg-midnight-950 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Pipeline Mode
              </button>
            </div>
          </div>
        </div>

        {/* System Prompt Tail Preview */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            Active Conversational Guardrail Prompt
          </label>
          <div className="p-3.5 rounded-xl bg-midnight-950/80 border border-white/5 font-mono text-xs text-slate-400 leading-relaxed">
            "Never check in on the user or say 'are you still there' during silence. Only speak
            when the user speaks. If the input is empty or just noise, stay silent. When the user
            says goodbye or indicates they are done, give a one-sentence farewell and call the
            end_call tool."
          </div>
        </div>
      </GlassCard>

      {/* 3. Interface & Accessibility Settings */}
      <GlassCard className="p-6 space-y-5" glow="none">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
          <Eye className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-white">Interface & Visual Accessibility</h3>
            <p className="text-xs text-slate-400">
              Customize 3D rendering dynamics and UI preferences.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Reduced Motion Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-midnight-950/60 border border-white/5">
            <div>
              <span className="text-xs sm:text-sm font-medium text-slate-200">
                Reduced Motion Mode
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Replaces high-frequency 3D animations with gentle CSS glows for accessibility.
              </p>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-midnight-950 border-white/20"
            />
          </div>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-midnight-950/60 border border-white/5">
            <div>
              <span className="text-xs sm:text-sm font-medium text-slate-200">
                Interface Sound Effects
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Play subtle auditory chimes upon connection and state transitions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => setSoundEffects(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-midnight-950 border-white/20"
            />
          </div>

          {/* Security Guarantee Banner */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-3">
            <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-cyan-200/90 leading-relaxed">
              <strong>Security Guarantee:</strong> Your ElevenLabs and Anthropic API keys are stored
              securely on the backend and are never exposed to the browser.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={handleSaveSettings}
          leftIcon={<Check className="w-4 h-4 text-slate-950" />}
        >
          {savedSuccess ? 'Preferences Saved!' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};
