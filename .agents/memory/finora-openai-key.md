---
name: Finora OpenAI key issue
description: OPENAI_API_KEY must have billing credits; invalid or quota-exceeded key gives silent error in chat
---

## Root cause
If OPENAI_API_KEY has no credits (429 insufficient_quota), the API server catches the error and streams
`{"error":"AI service error. Please try again."}`. Now surfaced as a visible red dismissible banner
(sendError state in chat.tsx).

## Fix path
Go to https://platform.openai.com/settings/billing and add credits. No code change needed once key has credits.

**Why:** User initially set key to placeholder text, then provided a zero-credit key. Both produce the same 429.
