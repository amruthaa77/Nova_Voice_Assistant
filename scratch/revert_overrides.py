import re

file_path = "frontend/src/context/AssistantContext.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = r"overrides:\s*\{\s*agent:\s*\{\s*firstMessage:[^}]+},\s*\.\.\.\(selectedVoiceId \? \{ tts: \{ voiceId: selectedVoiceId \} \} : \{\}\),\s*\},"

replacement = """overrides: selectedVoiceId
          ? {
              tts: {
                voiceId: selectedVoiceId,
              },
            }
          : undefined,"""

new_content, count = re.subn(pattern, replacement, content)
print(f"Replaced {count} occurrences")
if count > 0:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
