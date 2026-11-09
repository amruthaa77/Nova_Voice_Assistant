with open('frontend/src/components/ui/SpeechBubble.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_target = """          if (errorMessage.toLowerCase().includes('mic') || errorMessage.toLowerCase().includes('permission')) {
            displayError = "Check your microphone.";
          } else if (errorMessage.toLowerCase().includes('backend') || errorMessage.toLowerCase().includes('offline')) {
            displayError = "Backend server offline.";
          } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('key')) {
            displayError = "Authentication failed.";"""

new_replacement = """          if (errorMessage.toLowerCase().includes('mic') || errorMessage.toLowerCase().includes('permission')) {
            displayError = "Check your microphone.";
          } else if (errorMessage.toLowerCase().includes('backend') || errorMessage.toLowerCase().includes('offline')) {
            displayError = "Backend server offline.";
          } else if (
            errorMessage.toLowerCase().includes('quota') ||
            errorMessage.toLowerCase().includes('exhausted') ||
            errorMessage.toLowerCase().includes('limit') ||
            errorMessage.toLowerCase().includes('402')
          ) {
            displayError = "Character quota reached.";
          } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('invalid api key')) {
            displayError = "Authentication failed.";"""

text = text.replace(old_target.replace('\n', '\r\n'), new_replacement.replace('\n', '\r\n'))

with open('frontend/src/components/ui/SpeechBubble.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated SpeechBubble.tsx error matching!')
