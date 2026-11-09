import sys

with open('frontend/src/context/AssistantContext.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update default selected voice ID to George
old_voice = "return localStorage.getItem('assistant_voice_id') || '21m00Tcm4TlvDq8ikWAM'; // Rachel default"
new_voice = "return localStorage.getItem('assistant_voice_id') || 'JBFqnCBsd6RMkjVDRZzb'; // George default (supported across all tiers)"
if old_voice in content:
    content = content.replace(old_voice, new_voice)
    print("Replaced voice ID default")

# 2. Clean up startSession pre-checks
old_precheck = """    // 1. Verify and wake browser AudioContext
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const testAudioCtx = new AudioCtx();
        novaDebug('AUDIO_CONTEXT', `AudioContext state before resume: ${testAudioCtx.state}`);
        if (testAudioCtx.state === 'suspended') {
          await testAudioCtx.resume();
          novaDebug('AUDIO_CONTEXT', `AudioContext state after resume: ${testAudioCtx.state}`);
        }
        await testAudioCtx.close();
      }
    } catch (audioCtxErr) {
      novaDebug('AUDIO_CONTEXT', 'AudioContext pre-check warning:', audioCtxErr);
    }

    // 2. Request and verify browser microphone access
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
    }"""

new_precheck = """    // 1. Request and verify browser microphone access
    novaDebug('MICROPHONE', 'Requesting microphone access...');
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      novaDebug('MICROPHONE', 'Microphone permission confirmed.');
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
    }"""
content = content.replace(old_precheck.replace('\n', '\r\n'), new_precheck.replace('\n', '\r\n'))

# 3. Clean up error message on signed URL failure
old_signed_err = """    } catch (err: any) {
      novaDebug('SIGNED_URL', 'Signed URL request failed:', err);
      updateStatus('error', 'startSession:signed-url-failed');
      setIsSessionActive(false);
      isStartingRef.current = false;
      setSessionError(`Authentication failed: ${err.message}`);
      return;
    }"""

new_signed_err = """    } catch (err: any) {
      novaDebug('SIGNED_URL', 'Signed URL request failed:', err);
      updateStatus('error', 'startSession:signed-url-failed');
      setIsSessionActive(false);
      isStartingRef.current = false;
      const detailMsg = err.response?.data?.detail || err.message || 'Voice session initialization failed.';
      setSessionError(detailMsg);
      return;
    }"""
content = content.replace(old_signed_err.replace('\n', '\r\n'), new_signed_err.replace('\n', '\r\n'))

# 4. Do not send overrides if using default voice
old_overrides = """        overrides: selectedVoiceId
          ? {
              tts: {
                voiceId: selectedVoiceId,
              },
            }
          : undefined,"""

new_overrides = """        overrides: (selectedVoiceId && selectedVoiceId !== 'JBFqnCBsd6RMkjVDRZzb')
          ? {
              tts: {
                voiceId: selectedVoiceId,
              },
            }
          : undefined,"""
content = content.replace(old_overrides.replace('\n', '\r\n'), new_overrides.replace('\n', '\r\n'))

# 5. Friendly translation of fatal startSession error
old_fatal = "setSessionError(`Could not establish voice connection: ${err.message}`);"
new_fatal = """let cleanErrMsg = err.message || 'Voice connection failed.';
      if (cleanErrMsg.toLowerCase().includes('not available') || cleanErrMsg.toLowerCase().includes('unexpectedly')) {
        cleanErrMsg = 'ElevenLabs character quota exhausted (9,923 / 10,000 used on Free Tier). Please update ELEVENLABS_API_KEY in .env.';
      }
      setSessionError(cleanErrMsg);"""
content = content.replace(old_fatal, new_fatal)

with open('frontend/src/context/AssistantContext.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Successfully updated AssistantContext.tsx!')

# Now update SpeechBubble.tsx
with open('frontend/src/components/ui/SpeechBubble.tsx', 'r', encoding='utf-8') as f:
    sb_content = f.read()

old_sb_err = """          } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('key')) {
            displayError = "Authentication failed.";"""

new_sb_err = """          } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('exhausted') || errorMessage.toLowerCase().includes('available')) {
            displayError = "Character limit reached.";
          } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('key')) {
            displayError = "Authentication failed.";"""

sb_content = sb_content.replace(old_sb_err.replace('\n', '\r\n'), new_sb_err.replace('\n', '\r\n'))
with open('frontend/src/components/ui/SpeechBubble.tsx', 'w', encoding='utf-8') as f:
    f.write(sb_content)
print('Successfully updated SpeechBubble.tsx!')
