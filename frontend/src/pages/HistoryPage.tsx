import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  User,
  Bot,
  X,
  RefreshCw,
  FileText,
  Calendar,
} from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { api } from '../api/client';
import { TranscriptSummary, TranscriptDetail } from '../api/types';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const HistoryPage: React.FC = () => {
  const { transcripts, isLoadingTranscripts, reloadTranscripts } = useAssistant();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<'all' | 'agent' | 'pipeline'>('all');

  // Selected transcript detail for the slideover modal
  const [selectedSummary, setSelectedSummary] = useState<TranscriptSummary | null>(null);
  const [activeDetail, setActiveDetail] = useState<TranscriptDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Fetch full transcript details when a summary item is clicked
  const handleSelectTranscript = async (summary: TranscriptSummary) => {
    setSelectedSummary(summary);
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const data = await api.getTranscript(summary.filename);
      setActiveDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedSummary(null);
    setActiveDetail(null);
    setDetailError(null);
  };

  // Filter & search transcripts
  const filteredTranscripts = useMemo(() => {
    return transcripts.filter((t) => {
      const matchesSearch =
        t.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.start_time && t.start_time.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesMode = selectedModeFilter === 'all' || t.mode === selectedModeFilter;
      return matchesSearch && matchesMode;
    });
  }, [transcripts, searchTerm, selectedModeFilter]);

  const formatDuration = (secs: number | null) => {
    if (secs == null) return '--';
    if (secs < 60) return `${Math.round(secs)}s`;
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <GlassCard className="p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transcripts by name or date..."
            className="w-full bg-midnight-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Filter buttons & Reload */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center p-1 rounded-xl bg-midnight-950/80 border border-white/10">
            {(['all', 'agent', 'pipeline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedModeFilter(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                  selectedModeFilter === mode
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={reloadTranscripts}
            isLoading={isLoadingTranscripts}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </GlassCard>

      {/* Main Content Layout: Transcripts List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Section */}
        <div className={`${selectedSummary ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
          {isLoadingTranscripts && transcripts.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-cyan-400" />
              <p className="mt-3 text-sm">Loading conversation archives from backend...</p>
            </GlassCard>
          ) : filteredTranscripts.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-400 space-y-3">
              <History className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-base font-semibold text-slate-200">No transcripts found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm
                  ? `No transcripts match "${searchTerm}". Clear search to view all.`
                  : 'Start conversations in the Voice Assistant tab to log transcripts.'}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-2.5">
              {filteredTranscripts.map((t) => {
                const isSelected = selectedSummary?.filename === t.filename;

                return (
                  <GlassCard
                    key={t.filename}
                    onClick={() => handleSelectTranscript(t)}
                    className={`p-4 cursor-pointer transition-all duration-200 flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-cyan-500/50 bg-midnight-900/90 shadow-glow-subtle'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl flex-shrink-0 ${
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
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {t.start_time
                              ? new Date(t.start_time).toLocaleString()
                              : 'Session Archive'}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{t.total_turns} turns</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant={t.mode === 'agent' ? 'cyan' : 'violet'} size="sm">
                        {t.mode}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatDuration(t.duration_seconds)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Pane */}
        {selectedSummary && (
          <div className="lg:col-span-6 sticky top-6">
            <GlassCard className="p-5 flex flex-col max-h-[80vh] overflow-hidden" glow="cyan">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white truncate">
                      {selectedSummary.filename}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedSummary.mode === 'agent' ? 'cyan' : 'violet'} size="sm">
                      {selectedSummary.mode}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">
                      {formatDuration(selectedSummary.duration_seconds)} total duration
                    </span>
                  </div>
                </div>

                <button
                  onClick={closeDetail}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Turn-by-Turn Transcript Content */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {isLoadingDetail ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin text-cyan-400" />
                    <p className="mt-2 text-xs">Loading turns from backend...</p>
                  </div>
                ) : detailError ? (
                  <div className="p-6 text-center text-rose-300 bg-rose-500/10 rounded-xl">
                    <p className="text-xs">{detailError}</p>
                  </div>
                ) : !activeDetail || activeDetail.turns.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p className="text-xs">No speech turns recorded in this session.</p>
                  </div>
                ) : (
                  activeDetail.turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        turn.speaker === 'You' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {turn.speaker !== 'You' && (
                        <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-300 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                          turn.speaker === 'You'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-none shadow-md'
                            : 'bg-midnight-950/80 text-slate-200 border border-white/10 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300/80">
                            {turn.speaker === 'Assistant' ? 'Nova' : turn.speaker}
                          </span>
                          {turn.latency_ms && (
                            <span className="text-[10px] font-mono text-cyan-200">
                              {turn.latency_ms}ms
                            </span>
                          )}
                        </div>
                        <p>{turn.text}</p>
                      </div>

                      {turn.speaker === 'You' && (
                        <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer Metadata */}
              <div className="pt-3 border-t border-white/10 text-[11px] font-mono text-slate-500 flex justify-between">
                <span>Total Turns: {activeDetail?.turns.length ?? selectedSummary.total_turns}</span>
                <span>Format: ElevenLabs JSON</span>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
