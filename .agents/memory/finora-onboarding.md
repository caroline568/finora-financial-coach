---
name: Finora onboarding flow
description: 5-screen mobile-first onboarding replacing the old landing page; PhoneFrame wraps children for desktop card view
---

## Architecture
home.tsx is a single component with `screen` state (0-4). Each screen renders inside a PhoneFrame.
Screens: 0=Hero (mama mboga), 1=Features (conductor), 2=AI demo (boda rider), 3=Persona picker, 4=Welcome (group).
PhoneFrame: full-screen on mobile, 390px×820px centered card on desktop (lg:).

## Persona picker (screen 3)
Selection required to advance. Persona ID stored in local state, encoded in conversation title on creation.
PERSONAS array in home.tsx holds id, emoji, label, desc, image.

**Why:** User wants "unatumia kama nani" selection before opening chat; persona drives conversation title for context.

## Images (all in artifacts/finora/src/assets/)
- hero-mama-mboga.jpg — hero screen (screen 0)
- hero-conductor.jpg — features screen (screen 1)
- persona-boda-rider.jpg — AI demo screen (screen 2)
- persona-student.jpg — persona picker list
- persona-mjengo.jpg — persona picker list (Biashara Ndogo)
- persona-welcome-group.jpg — welcome screen group shot (screen 4)
