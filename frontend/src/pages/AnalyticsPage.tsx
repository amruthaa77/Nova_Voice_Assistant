import React from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Clock,
  MessageSquare,
  Activity,
  Zap,
  Sparkles,
  Server,
  Cpu,
} from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';

export const AnalyticsPage: React.FC = () => {
  const { transcripts, backendConnected, latencyMs } = useAssistant();

  // Aggregate metrics from real backend transcripts
  const totalSessions = transcripts.length;
  const agentCount = transcripts.filter((t) => t.mode === 'agent').length;
  const pipelineCount = transcripts.filter((t) => t.mode === 'pipeline').length;

  const totalDuration = transcripts.reduce(
    (acc, curr) => acc + (curr.duration_seconds ?? 0),
    0
  );
  const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

  const totalTurns = transcripts.reduce((acc, curr) => acc + curr.total_turns, 0);
  const avgTurns = totalSessions > 0 ? (totalTurns / totalSessions).toFixed(1) : '0';

  const agentPct = totalSessions > 0 ? Math.round((agentCount / totalSessions) * 100) : 0;
  const pipelinePct = totalSessions > 0 ? Math.round((pipelineCount / totalSessions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
            <span>Total Sessions</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white font-mono">{totalSessions}</div>
            <p className="text-xs text-slate-400 mt-1">Archived in transcripts/</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
            <span>Avg Session Length</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white font-mono">
              {Math.round(avgDuration)}s
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Total spoken: {Math.round(totalDuration)}s
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
            <span>Avg Turns / Session</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white font-mono">{avgTurns}</div>
            <p className="text-xs text-slate-400 mt-1">{totalTurns} total dialog turns</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5" hoverEffect>
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
            <span>API Latency</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white font-mono">
              {backendConnected ? `${latencyMs ?? 0}ms` : '--'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {backendConnected ? 'FastAPI live telemetry' : 'Backend offline'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Analytics Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mode Distribution Breakdown */}
        <GlassCard className="p-6 space-y-5" glow="cyan">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Engine Mode Distribution</h3>
            </div>
            <Badge variant="cyan" size="sm">
              Real Data
            </Badge>
          </div>

          <div className="space-y-4 pt-2">
            {/* Agent Mode Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Agent Mode (Conversational AI)
                </span>
                <span className="font-mono text-slate-300">
                  {agentCount} sessions ({agentPct}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-midnight-950 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${agentPct}%` }}
                />
              </div>
            </div>

            {/* Pipeline Mode Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-purple-300">
                  <Zap className="w-3.5 h-3.5" />
                  Pipeline Mode (Scribe + Claude + TTS)
                </span>
                <span className="font-mono text-slate-300">
                  {pipelineCount} sessions ({pipelinePct}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-midnight-950 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700"
                  style={{ width: `${pipelinePct}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 pt-2 leading-relaxed">
            Data aggregated across your local transcript files. Agent Mode leverages native
            ElevenLabs WebSocket turn management, while Pipeline Mode utilizes Anthropic
            Claude with custom local VAD.
          </p>
        </GlassCard>

        {/* System & Architecture Telemetry */}
        <GlassCard className="p-6 space-y-5" glow="violet">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">System Architecture Telemetry</h3>
            </div>
            <Badge variant="emerald" pulse size="sm">
              Live
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-midnight-950/60 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Backend REST Endpoint
              </span>
              <span className="text-xs font-mono text-cyan-300">http://127.0.0.1:8000</span>
            </div>

            <div className="p-3 rounded-xl bg-midnight-950/60 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Web Application Port
              </span>
              <span className="text-xs font-mono text-purple-300">http://localhost:5173</span>
            </div>

            <div className="p-3 rounded-xl bg-midnight-950/60 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Audio Buffer Size
              </span>
              <span className="text-xs font-mono text-emerald-300">512 samples / frame</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
