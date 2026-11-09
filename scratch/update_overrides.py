import re

file_path = "frontend/src/context/AssistantContext.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = r"overrides:\s*selectedVoiceId\s*\?\s*\{\s*tts:\s*\{\s*voiceId:\s*selectedVoiceId,\s*\},?\s*\}\s*:\s*undefined,"

replacement = """overrides: {
          agent: {
            firstMessage: "Hi, I'm Nova, your helpful assistant! How can I help you today?",
          },
          ...(selectedVoiceId ? { tts: { voiceId: selectedVoiceId } } : {}),
        },"""

new_content, count = re.subn(pattern, replacement, content)
print(f"Replaced {count} occurrences")
if count > 0:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
