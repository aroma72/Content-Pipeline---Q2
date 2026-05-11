import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import anthropic
from config import MODEL_SONNET

client = anthropic.Anthropic()

response = client.messages.create(
    model=MODEL_SONNET,
    max_tokens=200,
    messages=[{
        "role": "user",
        "content": "Write a simple React component that says hello. Just the code, nothing else."
    }]
)

print("Claude Response:")
print(response.content[0].text)
