with open('frontend/src/components/ui/SpeechBubble.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "errorMessage.toLowerCase().includes('auth')" in line:
        new_lines.append("""          } else if (
            errorMessage.toLowerCase().includes('quota') ||
            errorMessage.toLowerCase().includes('exhausted') ||
            errorMessage.toLowerCase().includes('limit') ||
            errorMessage.toLowerCase().includes('402')
          ) {
            displayError = "Character limit reached.";
          } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('invalid api key')) {\n""")
    else:
        new_lines.append(line)

with open('frontend/src/components/ui/SpeechBubble.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Updated SpeechBubble line!')
