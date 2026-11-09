with open('frontend/src/components/ui/SpeechBubble.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """          } else if (errorMessage.toLowerCase().includes('backend') || errorMessage.toLowerCase().includes('offline')) {
            displayError = "Backend server offline.";"""

replacement = """          } else if (errorMessage.toLowerCase().includes('waking up') || errorMessage.toLowerCase().includes('render')) {
            displayError = "Waking up server (~50s)...";
          } else if (errorMessage.toLowerCase().includes('backend') || errorMessage.toLowerCase().includes('offline')) {
            displayError = "Backend server offline.";"""

text = text.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'))

with open('frontend/src/components/ui/SpeechBubble.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated SpeechBubble!')

# Now update VoiceAssistantPage.tsx
with open('frontend/src/pages/VoiceAssistantPage.tsx', 'r', encoding='utf-8') as f:
    vap = f.read()

target_toggle = """  const handleToggleSession = () => {
    if (status === 'connecting') {
      // Ignore clicks while connecting (strictly idempotent)
      return;
    }
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  };"""

replacement_toggle = """  const handleToggleSession = () => {
    if (status === 'connecting') {
      // Ignore clicks while connecting (strictly idempotent)
      return;
    }
    if (!backendConnected) {
      pingBackend();
      setStatus('error');
      setSessionError('FastAPI backend is offline or waking up on Render (~50s). Please wait a moment and try again.');
      return;
    }
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  };"""

vap = vap.replace(target_toggle.replace('\n', '\r\n'), replacement_toggle.replace('\n', '\r\n'))

# Update button disabled & UI state
target_btn = """          {/* Primary Pill Button (56px tall, min-w 220px, Lavender-to-Peach Gradient) */}
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
            ) : status === 'listening' ? ("""

replacement_btn = """          {/* Primary Pill Button (56px tall, min-w 220px, Lavender-to-Peach Gradient) */}
          <button
            onClick={handleToggleSession}
            disabled={status === 'connecting'}
            className={`h-14 min-w-[210px] sm:min-w-[230px] px-8 rounded-full flex items-center justify-center gap-3 text-[15px] sm:text-base font-semibold text-white transition-all duration-200 select-none shadow-active-pill ${
              status === 'connecting'
                ? 'opacity-60 cursor-not-allowed bg-white/20'
                : !backendConnected
                ? 'aurora-glass border border-white/25 hover:bg-white/15 active:scale-[0.98] cursor-pointer'
                : 'active-nav-pill hover:brightness-105 active:scale-[0.98] cursor-pointer'
            }`}
            aria-label={
              status === 'connecting'
                ? 'Connecting'
                : !backendConnected
                ? 'Connect to server'
                : isSessionActive
                ? 'End conversation with Nova'
                : 'Talk to Nova'
            }
          >
            {!backendConnected ? (
              <>
                <Loader2 className="w-5 h-5 text-white/80 animate-spin" />
                <span>Waking up server...</span>
              </>
            ) : status === 'connecting' ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span>Connecting...</span>
              </>
            ) : status === 'listening' ? ("""

vap = vap.replace(target_btn.replace('\n', '\r\n'), replacement_btn.replace('\n', '\r\n'))

with open('frontend/src/pages/VoiceAssistantPage.tsx', 'w', encoding='utf-8') as f:
    f.write(vap)

print('Updated VoiceAssistantPage!')
