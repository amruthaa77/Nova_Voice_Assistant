/**
 * TypeScript interface definitions matching the FastAPI backend schemas.
 */

export interface HealthResponse {
  application: string;
  status: string;
  version: string;
}

export interface TranscriptSummary {
  filename: string;
  mode: 'agent' | 'pipeline' | string;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  total_turns: number;
}

export interface ConversationTurn {
  speaker: 'You' | 'Assistant' | 'Nova' | string;
  text: string;
  timestamp?: string;
  latency_ms?: number;
}

export interface TranscriptDetail {
  session_id?: string;
  mode: 'agent' | 'pipeline' | string;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  total_turns?: number;
  voice_id?: string;
  language?: string;
  turns: ConversationTurn[];
}

export interface VoiceItem {
  voice_id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  labels?: Record<string, string>;
  preview_url?: string | null;
}

export interface VoicesResponse {
  total: number;
  voices: VoiceItem[];
}

export interface SignedUrlResponse {
  signed_url: string;
  agent_id: string;
}

export interface SaveTranscriptRequest {
  session_id?: string;
  mode: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  agent_id?: string;
  ended_by?: string;
  turns: ConversationTurn[];
}

export interface SaveTranscriptResponse {
  status: string;
  filename: string;
  total_turns: number;
}

export type AssistantStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export type AssistantMode = 'agent' | 'pipeline';
