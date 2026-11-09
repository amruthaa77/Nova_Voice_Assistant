import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Conversation } from '@elevenlabs/client';
import { api } from '../api/client';
import {
  HealthResponse,
  TranscriptSummary,
  VoiceItem,
  AssistantStatus,
  AssistantMode,
  ConversationTurn,
} from '../api/types';

// Temporary debug logging per instructions
const DEBUG = true;

const novaDebug = (category: string, ...args: any[]) => {
  if (DEBUG) {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(`[NOVA-DEBUG] [${timestamp}] [${category}]`, ...args);
  }
};

interface AssistantContextType {
  // Connectivity
  backendConnected: boolean;
  backendHealth: HealthResponse | null;
  latencyMs: number | null;
  pingBackend: () => Promise<void>;

  // Conversation State
  status: AssistantStatus;
  setStatus: (status: AssistantStatus) => void;
  isSessionActive: boolean;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  currentTurns: ConversationTurn[];
  addTurn: (turn: ConversationTurn) => void;
  clearTurns: () => void;
  sessionError: string | null;

  // Assistant Configuration
  mode: AssistantMode;
  setMode: (mode: AssistantMode) => void;
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  availableVoices: VoiceItem[];
  isLoadingVoices: boolean;
  reloadVoices: () => Promise<void>;

  // Transcripts
  transcripts: TranscriptSummary[];
  isLoadingTranscripts: boolean;
  reloadTranscripts: () => Promise<void>;

  // User UI Preferences
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
  soundEffects: boolean;
  setSoundEffects: (val: boolean) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Backend connectivity
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Conversation session state
  const [status, setStatusState] = useState<AssistantStatus>('idle');
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [currentTurns, setCurrentTurns] = useState<ConversationTurn[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const updateStatus = useCallback((newStatus: AssistantStatus, caller: string) => {
    setStatusState((prev) => {
      if (prev !== newStatus) {
        novaDebug('STATE', `Transition: "${prev}" -> "${newStatus}" (triggered by: ${caller})`);
      }
      return newStatus;
    });
  }, []);

  const setStatus = useCallback((newStatus: AssistantStatus) => {
    updateStatus(newStatus, 'manual');
  }, [updateStatus]);

  // Active session references
  const conversationRef = useRef<any>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const activeAgentIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<string | null>(null);
  const sessionStartTimeMsRef = useRef<number>(0);
  const turnsRef = useRef<ConversationTurn[]>([]);
  const isEndingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration settings (persisted to localStorage)
  const [mode, setModeState] = useState<AssistantMode>(() => {
    return (localStorage.getItem('assistant_mode') as AssistantMode) || 'agent';
  });

  const [selectedVoiceId, setSelectedVoiceIdState] = useState<string>(() => {
    return localStorage.getItem('assistant_voice_id') || 'JBFqnCBsd6RMkjVDRZzb'; // George default (supported across all tiers)
  });

  const [selectedLanguage, setSelectedLanguageState] = useState<string>(() => {
    return localStorage.getItem('assistant_language') || 'en';
  });

  // UI preferences
  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [soundEffects, setSoundEffectsState] = useState<boolean>(() => {
    return localStorage.getItem('assistant_sfx') === 'true';
  });

  // Data collections
  const [availableVoices, setAvailableVoices] = useState<VoiceItem[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptSummary[]>([]);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState<boolean>(false);

  // Persistence helpers
  const setMode = (newMode: AssistantMode) => {
    setModeState(newMode);
    localStorage.setItem('assistant_mode', newMode);
  };

  const setSelectedVoiceId = (id: string) => {
    setSelectedVoiceIdState(id);
    localStorage.setItem('assistant_voice_id', id);
  };

  const setSelectedLanguage = (lang: string) => {
    setSelectedLanguageState(lang);
    localStorage.setItem('assistant_language', lang);
  };

  const setReducedMotion = (val: boolean) => {
    setReducedMotionState(val);
  };

  const setSoundEffects = (val: boolean) => {
    setSoundEffectsState(val);
    localStorage.setItem('assistant_sfx', String(val));
  };

  // Ping backend health
  const pingBackend = useCallback(async () => {
    const startTime = performance.now();
    try {
      const data = await api.getHealth();
      const duration = Math.round(performance.now() - startTime);
      setBackendHealth(data);
      setBackendConnected(true);
      setLatencyMs(duration);
    } catch {
      setBackendConnected(false);
      setBackendHealth(null);
      setLatencyMs(null);
    }
  }, []);

  // Fetch voices
  const reloadVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    try {
      const data = await api.getVoices();
      setAvailableVoices(data.voices);
      if (data.voices.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(data.voices[0].voice_id);
      }
    } catch (err) {
      console.warn('[Nova Voice] Could not load voices from backend:', err);
    } finally {
      setIsLoadingVoices(false);
    }
  }, [selectedVoiceId]);

  // Fetch transcripts
  const reloadTranscripts = useCallback(async () => {
    setIsLoadingTranscripts(true);
    try {
      const data = await api.getTranscripts();
      setTranscripts(data);
    } catch (err) {
      console.warn('[Nova Voice] Could not load transcripts from backend:', err);
    } finally {
      setIsLoadingTranscripts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    pingBackend();
    reloadVoices();
    reloadTranscripts();

    // Periodic heartbeat every 15 seconds
    const interval = setInterval(pingBackend, 15000);
    return () => clearInterval(interval);
  }, [pingBackend, reloadVoices, reloadTranscripts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {});
        conversationRef.current = null;
      }
    };
  }, []);

  // Turn management
  const addTurn = (turn: ConversationTurn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setCurrentTurns([...turnsRef.current]);
  };

  const clearTurns = () => {
    turnsRef.current = [];
    setCurrentTurns([]);
  };

  // Internal session termination & transcript persistence
  const handleSessionEnded = useCallback(
    async (endedBy: string = 'user', errorMessage?: string) => {
      if (isEndingRef.current) return;
      isEndingRef.current = true;

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      novaDebug('SESSION_END', `Session ended. Triggered by: ${endedBy}${errorMessage ? ` | Error: ${errorMessage}` : ''}`);

      // End SDK connection if still open
      if (conversationRef.current) {
        try {
          await conversationRef.current.endSession();
        } catch {
          // May already be closed
        }
        conversationRef.current = null;
      }

      setIsSessionActive(false);
      if (errorMessage) {
        setSessionError(errorMessage);
        updateStatus('error', 'handleSessionEnded');
      } else {
        updateStatus('idle', 'handleSessionEnded');
      }

      // Persist transcript to backend if speech turns were logged
      const turnsToSave = [...turnsRef.current];
      if (turnsToSave.length > 0 && sessionStartTimeRef.current) {
        const endTimeIso = new Date().toISOString();
        const durationSecs = Math.max(
          0,
          (Date.now() - sessionStartTimeMsRef.current) / 1000
        );

        novaDebug('TRANSCRIPT', `Saving transcript (${turnsToSave.length} turns, ${durationSecs.toFixed(1)}s)...`);

        try {
          const saveRes = await api.saveTranscript({
            session_id: activeSessionIdRef.current || `web_${Date.now()}`,
            mode: 'agent',
            start_time: sessionStartTimeRef.current,
            end_time: endTimeIso,
            duration_seconds: Math.round(durationSecs * 100) / 100,
            agent_id: activeAgentIdRef.current || undefined,
            ended_by: endedBy,
            turns: turnsToSave,
          });

          novaDebug('TRANSCRIPT', `Transcript saved successfully as ${saveRes.filename}.`);
          await reloadTranscripts();
        } catch (saveError) {
          console.warn('[Nova Voice] Failed to save conversation transcript:', saveError);
        }
      }
    },
    [reloadTranscripts, updateStatus]
  );

  // Start real browser voice session (strictly idempotent)
  const startSession = async () => {
    if (isSessionActive || status === 'connecting' || isStartingRef.current) {
      novaDebug('SESSION_START', `Start ignored: already in active/connecting state (status: ${status}, active: ${isSessionActive})`);
      return;
    }
    isStartingRef.current = true;

    novaDebug('SESSION_START', 'Start Conversation initiated.');
    setSessionError(null);

    // Enforce scope boundary: Pipeline Mode is dedicated to CLI in Phase 4
    if (mode === 'pipeline') {
      setSessionError(
        'Pipeline Mode runs locally via Python CLI (python main.py --mode pipeline). Browser voice uses ElevenLabs Agent Mode.'
      );
      isStartingRef.current = false;
      return;
    }

    if (!backendConnected) {
      setSessionError('FastAPI backend is offline. Ensure server is running on port 8000.');
      isStartingRef.current = false;
      return;
    }

    updateStatus('connecting', 'startSession');

    // 1. Request and verify browser microphone access
    novaDebug('MICROPHONE', 'Requesting microphone access...');
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      novaDebug('MICROPHONE', 'Microphone permission confirmed.');
      // Immediately stop the test stream tracks to release microphone hardware for SDK
      testStream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      novaDebug('MICROPHONE', 'Microphone check failed:', err);
      updateStatus('error', 'startSession:mic-failed');
      setIsSessionActive(false);
      isStartingRef.current = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setSessionError(
          'Microphone permission denied. Please allow microphone access in your browser to speak with the assistant.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setSessionError('No microphone device was detected on your system.');
      } else {
        setSessionError(`Microphone access error: ${err.message || err.name}`);
      }
      return;
    }

    // 3. Obtain temporary signed URL from backend (never leaks credentials)
    novaDebug('SIGNED_URL', 'Requesting temporary signed URL from backend...');
    let signedUrl = '';
    let agentId = '';
    try {
      const signedRes = await api.getAgentSignedUrl();
      signedUrl = signedRes.signed_url;
      agentId = signedRes.agent_id;
      activeAgentIdRef.current = agentId;
      novaDebug('SIGNED_URL', `Success: signed URL received for agent ${agentId} (length: ${signedUrl.length} chars)`);
    } catch (err: any) {
      novaDebug('SIGNED_URL', 'Signed URL request failed:', err);
      updateStatus('error', 'startSession:signed-url-failed');
      setIsSessionActive(false);
      isStartingRef.current = false;
      const detailMsg = err.response?.data?.detail || err.message || 'Voice session initialization failed.';
      setSessionError(detailMsg);
      return;
    }

    // 4. Set up connection watchdog timeout (15 seconds)
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    connectionTimeoutRef.current = setTimeout(() => {
      novaDebug('TIMEOUT', 'Connection timed out after 15 seconds without response.');
      updateStatus('error', 'watchdog:timeout');
      setIsSessionActive(false);
      isStartingRef.current = false;
      setSessionError('Connection timed out while establishing session with ElevenLabs. Please verify your network connection and try again.');
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {});
        conversationRef.current = null;
      }
    }, 15000);

    // 5. Initialize real Conversation session with ElevenLabs client SDK
    novaDebug('SDK', 'Initializing ElevenLabs Conversation.startSession()...');
    sessionStartTimeRef.current = new Date().toISOString();
    sessionStartTimeMsRef.current = Date.now();
    isEndingRef.current = false;
    clearTurns();

    try {
      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: ({ conversationId }) => {
          novaDebug('WS_CONNECT', `WebSocket connected! Conversation ID: ${conversationId}`);
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          activeSessionIdRef.current = conversationId;
          setIsSessionActive(true);
          isStartingRef.current = false;
          updateStatus('listening', 'onConnect');
        },
        onDisconnect: (details: any) => {
          novaDebug('WS_DISCONNECT', 'SDK onDisconnect event received with payload:', details);
          const isAbnormalClose = details?.reason === 'error' || (details?.closeCode && details?.closeCode !== 1000);
          if (isAbnormalClose) {
            const code = details?.closeCode ?? 'unknown';
            const reason = details?.closeReason || details?.message || 'Server terminated socket connection.';
            novaDebug('WS_CLOSE_ABNORMAL', `Abnormal socket closure: code=${code}, reason="${reason}"`);
            handleSessionEnded('error', `Voice connection terminated (${code}): ${reason}`);
          } else {
            const endedBy = details?.reason === 'agent' ? 'agent' : 'user';
            handleSessionEnded(endedBy);
          }
        },
        onError: (errorMessage: string, info?: any) => {
          novaDebug('WS_ERROR', `SDK onError event: ${errorMessage}`, info);
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          setSessionError(`ElevenLabs connection error: ${errorMessage}`);
          updateStatus('error', 'onError');
          setIsSessionActive(false);
          isStartingRef.current = false;
        },
        onMessage: (payload) => {
          const speaker = payload.role === 'user' ? 'You' : 'Nova';
          const text = (payload.message || '').trim();

          novaDebug('MESSAGE', `[${speaker}]: "${text}"`);

          // Filter empty noise or lone punctuation
          if (!text || text === '...') {
            return;
          }

          // Prevent exact duplicate turns from repeated event delivery
          const lastTurn = turnsRef.current[turnsRef.current.length - 1];
          if (lastTurn && lastTurn.speaker === speaker && lastTurn.text === text) {
            return;
          }

          const newTurn: ConversationTurn = {
            speaker,
            text,
            timestamp: new Date().toISOString(),
          };

          addTurn(newTurn);
        },
        onModeChange: ({ mode: agentMode }) => {
          novaDebug('MODE_CHANGE', `SDK mode changed to: ${agentMode}`);
          if (agentMode === 'speaking') {
            updateStatus('speaking', 'onModeChange');
          } else if (agentMode === 'listening') {
            updateStatus('listening', 'onModeChange');
          }
        },
        onStatusChange: ({ status: connStatus }) => {
          novaDebug('STATUS_CHANGE', `SDK status changed to: ${connStatus}`);
          if (connStatus === 'connecting') {
            updateStatus('connecting', 'onStatusChange');
          } else if (connStatus === 'connected') {
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            setIsSessionActive(true);
            isStartingRef.current = false;
            updateStatus('listening', 'onStatusChange');
          }
          // Disconnections are handled with exact details inside onDisconnect
        },
        onInterruption: () => {
          novaDebug('INTERRUPTION', 'Barge-in interruption detected. Reverting orb to listening.');
          updateStatus('listening', 'onInterruption');
        },
        overrides: selectedVoiceId
          ? {
              tts: {
                voiceId: selectedVoiceId,
              },
            }
          : undefined,
      });

      conversationRef.current = conversation;
      isStartingRef.current = false;
      novaDebug('SDK', 'startSession returned active conversation instance.');
    } catch (err: any) {
      novaDebug('SDK', 'Fatal startSession error:', err);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      isStartingRef.current = false;
      updateStatus('error', 'startSession:fatal');
      setIsSessionActive(false);
      let cleanErrMsg = err.message || 'Voice connection failed.';
      if (cleanErrMsg.toLowerCase().includes('not available') || cleanErrMsg.toLowerCase().includes('unexpectedly')) {
        cleanErrMsg = 'ElevenLabs character quota exhausted (9,923 / 10,000 used on Free Tier). Please update ELEVENLABS_API_KEY in .env.';
      }
      setSessionError(cleanErrMsg);
    }
  };

  // User-initiated end session
  const endSession = async () => {
    novaDebug('SESSION_END', 'User requested session end.');
    await handleSessionEnded('user');
  };

  return (
    <AssistantContext.Provider
      value={{
        backendConnected,
        backendHealth,
        latencyMs,
        pingBackend,
        status,
        setStatus,
        isSessionActive,
        startSession,
        endSession,
        currentTurns,
        addTurn,
        clearTurns,
        sessionError,
        mode,
        setMode,
        selectedVoiceId,
        setSelectedVoiceId,
        selectedLanguage,
        setSelectedLanguage,
        availableVoices,
        isLoadingVoices,
        reloadVoices,
        transcripts,
        isLoadingTranscripts,
        reloadTranscripts,
        reducedMotion,
        setReducedMotion,
        soundEffects,
        setSoundEffects,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
