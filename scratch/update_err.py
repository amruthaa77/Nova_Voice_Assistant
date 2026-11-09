with open('frontend/src/context/AssistantContext.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_snippet = "setSessionError(`Authentication failed: ${err.message}`);"
new_snippet = "const detailMsg = err.response?.data?.detail || err.message || 'Voice session initialization failed.';\n      setSessionError(detailMsg);"

assert old_snippet in text, 'old_snippet not found'
text = text.replace(old_snippet, new_snippet)

with open('frontend/src/context/AssistantContext.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated signed URL error extraction!')
