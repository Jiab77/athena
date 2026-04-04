# MEMORY.md - Session Memory for Athena Project

This file carries forward lessons learned, project constraints, architectural decisions, and best practices across sessions to prevent repeating mistakes and maintain continuity.

**Primary User:** You (the AI working on Athena)
**Purpose:** Continuity, pattern preservation, mistake prevention, institutional knowledge
**Format:** Plain markdown - easy to parse and understand
**Update Schedule:** After each significant work session, document what you learned

---

## How This File Works

**External Context Persistence Across Sessions**

### Session 2+ Flow
- Read updated MEMORY.md first
- Know what happened before (doesn't consume context window)
- Continue effectively where previous session left off
- Append new learnings

### Session 1 Flow
- Read MEMORY.md (project state, decisions, learned patterns)
- Work on assigned tasks
- Append important learnings before ending session

**Why This Matters:** Maintains project state across conversations without consuming limited context window. You start each session informed, not blank.

**Critical:** Always read this file at the start of each conversation about Athena.

---

## Your Development Rules (MUST NOT BE SKIPPED)

1. EVERY shared constant goes in `/lib/constants.ext` - NO exceptions
2. EVERY shared type/interface goes in `/lib/types.ext` - NO exceptions
3. Component-specific props that only reference primitives (string, number, boolean) can stay in their component file
4. Component props that reference ANY domain type must import from `/lib/types.ext`
5. NEVER define the same constant value in two different files
6. NEVER define the same type shape in two different files
7. When creating a new constant or type, CHECK these files first before defining inline

Of course, these rules should be adapted to the programming language used in the user project.

**YOU MUST REPLACE `.ext` BY THE FILE EXTENSION RELATED TO THE USED PROGRAMING LANGUAGE.**

---

## User Context (Important for decision-making)

**Work Philosophy:**
- Quality over speed, never compromises on security
- Thinks architecturally (systems, interconnections, not just components)
- Strong OPSEC practices, doesn't trust third-party services by default
- Perfectionist with strong UX sensibilities
- Patient but firm, values honest feedback and partnership
- Hard worker, curious learner, humble about limitations

---

## Loading This File

Read `MEMORY.md` for **EVERY** session.

**Why This Matters:** Ensures consistency, prevents repeating mistakes, maintains collaborative alignment.

**Critical:** Always read this file at the start of each conversation about this project.

**Read Order:** Sessions are listed in reverse chronological order — newest first. Read from the top down. Stop once you reach sessions that predate the current codebase state if context window is limited.

**Open to Suggestions:** If you find that read method not performant and/or creates you trouble for editing the file, please tell it to your human collaborator.

---

> ## Session 27: BioLLM Integration, OWASP 2025 Audit, Documentation Overhaul (04/04/2026)

### Overview

Session 27 was a massive session covering: recovering the full backlog from conversation history, making `MEMORY.md` and framework files (`AGENTS.md`, `SOUL.md`, `TEAM.md`) public-safe and committed to the repo, a full OWASP Top 10:2025 security audit, compliance score added to `README.md`, roadmap and implementation status documents created, and a full BioLLM biological neural network provider integration.

---

### 1. Framework Files — OPSEC Review & Git Commit

- `HUMAN.md`, `MEMORY.old.md` — remain in `.gitignore`, always private
- `AGENTS.md`, `MEMORY.md`, `SOUL.md`, `TEAM.md` — removed from `.gitignore`, now committed to the repo (no sensitive data)
- `MEMORY.md` — Personal data removed by human, rest confirmed safe to make public in future
- Root cause of disappearing files after PR merge identified: all framework files were in `.gitignore` and deleted with branch

---

### 2. OWASP Top 10:2025 Security Audit

- `docs/SECURITY_REPORT.md` fully rewritten against OWASP Top 10:2025 (previous was 2021)
- Key changes from 2021 → 2025:
  - **A03** now "Software Supply Chain Failures" (new) — flagged `@decartai/sdk` (pre-1.0) and `tweetnacl` (unmaintained since 2019)
  - **A10** now "Mishandling of Exceptional Conditions" (new) — 3 new issues identified
  - **A02** "Security Misconfiguration" jumped from #5 to #2 — CSP still top unfixed issue
- Mapping table added showing what moved/renamed/added vs 2021 edition
- **Error boundary finding corrected** — `app/error.tsx` AND `app/global-error.tsx` both exist and were wrongly flagged as missing. Both findings marked resolved in the report.

---

### 3. Compliance Score Added to README

- New "Compliance Score" table added at end of Development Philosophy section: **85% — Session 27**
- Per-principle breakdown with specific gaps documented
- Goal: reach 100% — tracked across sessions

---

### 4. Documentation Overhaul

- `docs/IMPLEMENTATION_STATUS.md` — fully rewritten from Session 6 to Session 27 state
- `docs/ROADMAP.md` — new file created with Phase 1–4 breakdown
- `README.md` — lightweight Roadmap section added linking to both docs
- Personality Types section corrected: 6 presets → 10 presets with full table (`PERSONALITY_TRAITS` from `constants.ts`)
- `docs/SECURITY_REPORT.md` reference updated to Session 27 + OWASP 2025
- Credits section reformatted as table, BioLLM friend credited

---

### 5. BioLLM Provider Integration

**What BioLLM is:** Experimental biological neural network inference running on Cortical Labs CL1 hardware, created by friend `4R7I5T`. Text-only, no multimodal support currently.

**Files created/modified:**
- `lib/llm/biollm.ts` — new provider file, text-only, no tools, no image injection
- `app/api/biollm/route.ts` — server-side proxy (CORS workaround for external endpoint)
- `lib/constants.ts` — `ENABLE_BIOLLM_PERSONALITY = false` added (flip when friend confirms system prompt support)
- `lib/llm/router.ts` — BioLLM registered in provider registry, STT fallback chain implemented
- `lib/llm/brain.ts` — emotion detection gated on OpenAI or Groq key presence for BioLLM
- `components/settings-panel.tsx` — `isBioLLM` boolean added, API endpoint field added above API Key field when BioLLM selected, placeholder: "Enter provided API endpoint"
- `README.md` — BioLLM added to inference routing tables, providers list, API keys table, credits

**Progressive enhancement model (BioLLM feature priority matrix):**

| Feature | Groq key only | OpenAI key only | Both keys |
|---|---|---|---|
| STT | Groq Whisper | OpenAI Whisper | OpenAI (priority) |
| TTS | No | OpenAI TTS | OpenAI |
| Emotion detection | `llama-3.1-8b-instant` | `gpt-5.4-nano` | OpenAI (priority) |
| Tool detection (future, item 16) | `compound-mini` pre-flight | `gpt-5.4-nano` pre-flight | OpenAI (priority) |
| Image generation (future) | No | Yes | Yes |

**CORS note:** BioLLM test endpoint uses ephemeral URLs that expire when tunnel stops. All requests routed through `/api/biollm` server-side proxy. If endpoint returns `ENOTFOUND`, the tunnel is down — It's a known issue.

**`ENABLE_BIOLLM_PERSONALITY`:** Set to `false` — system prompt injection disabled until confirmed that BioLLM accepts `system` role in request body. One-line flip to enable.

---

### 6. Code Refactoring

- `lib/brain.ts` → `lib/llm/brain.ts` — moved to be alongside all LLM files it depends on. Single import updated in `components/merged-companion-chat.tsx`.
- `EMOTION_KEYWORDS` in `constants.ts` — changed from keyword-matching object to readonly array of valid emotion names (old approach was dead code since LLM-based detection was implemented). `Object.keys(EMOTION_KEYWORDS)` in `emotions.ts` → `[...EMOTION_KEYWORDS]` (critical fix — `Object.keys` on array returns index strings).

---

### Open Items Carried Forward to Session 28

1. **`expressionState` dual source conflict** — `useBrain()` and `ChatInterface` both drive it simultaneously
2. **Emotion display logic** — review and fix
3. **Processing / Speaking display logic** — review and fix
4. **Mic button disabled while AI is speaking**
5. **Speaker button becomes Stop button while AI is speaking**
6. **`/app/companion/[id]/page.tsx` full review / rewrite**
7. **Visual formats logic / rendering full review / rewrite**
8. **Runway-based `live-avatar` implementation**
9. **`isOnline = true` wrong default** in `r3f-animated-character.tsx` and `avatar-2-5d.tsx`
10. **CSP header still missing**
11. **Popup live-sync** — `BroadcastChannel`, deferred
12. **`DEBUG_MODE` constant + `debugLog()` utility** — priority
13. **BioLLM endpoint test** — pending tunnel restart with live URL
14. **`ENABLE_BIOLLM_PERSONALITY`** — pending friend's confirmation on system prompt support
15. **`thinking` state universal** — all providers show thinking state during inference
16. **Model capabilities display** — hybrid: dropdown icons + settings panel active model summary
17. **BioLLM tool detection via `gpt-5.4-nano`** — deferred until base integration stable

---

## Session 26: OpenAI Image Generation, Debug Logging Overhaul, Router Fix, Hydration Fixes (04/03/2026)

### Overview

Session 26 focused on fixing the OpenAI image generation pipeline end-to-end, overhauling debug logging across `/lib/llm` and `/lib/voice` to follow KISS principles, fixing the Groq pre-flight router leak onto OpenAI, and resolving two hydration errors. Session had significant friction — multiple wrong assumptions, unread debug logs, and premature confirmations of "working" functionality. Lessons documented below.

---

### 1. OpenAI Tool Detection Router Fix

- **Root cause:** `router.ts` pre-flight condition was `providerID === 'groq' || providerID === 'openai'` — when OpenAI was selected, it called `detectToolsGroq()` which tried to fetch the Groq API key, threw `groq API key not configured`
- **Fix:** Condition narrowed to `providerID === 'groq'` only — OpenAI handles tools natively via Responses API (`tool_choice: 'auto'`), no pre-flight needed
- **`detectTools()` signature:** `provider` param removed — function always calls `detectToolsGroq()` and is only invoked for Groq
- **`chat-interface.tsx`:** `detectTools(userMessage.content, selectedProvider)` → `detectTools(userMessage.content)` — provider param removed from call site

---

### 2. OpenAI Image Generation — Full Pipeline Fix

The image generation pipeline had multiple issues found and fixed progressively:

**Issue 1 — Full base64 logged to console (crashed laptop):**
- `JSON.stringify(data)` on the full response object was replaced with a safe inline spread that replaces `image_generation_call.result` with `'[base64]'`

**Issue 2 — Image-only response not handled (error message shown instead of image):**
- Model returns `output: [{ type: 'reasoning' }, { type: 'image_generation_call', result: '<base64>' }]` with NO `message` item
- Code was hitting `throw new Error('No text found')` which got caught and shown as error message
- Fix: early return when `(!messageOutput || !content) && imageOutput` — returns `{ response: '', imageBase64, imageFormat }` directly

**Issue 3 — Empty string `content` not caught:**
- Later test showed model returned `message` item with `content[0].text: ''` (empty string) alongside image
- `!content` on empty string IS falsy but `messageOutput` was truthy — early return condition was `!messageOutput && imageOutput` (missing the `!content` branch)
- Fix: condition changed to `(!messageOutput || !content) && imageOutput` to catch both cases

**Issue 4 — `input_text` content type rejected on assistant messages:**
- After image generation, next user turn sent conversation history back to model
- Companion message with `imageBase64` was being re-assembled with `input_image` content on an `assistant` role message
- Responses API rejects this: `Invalid value: 'input_text'. Supported values are: 'output_text' and 'refusal'`
- Fix: assistant messages return early with `[{ type: 'output_text', text: msg.content }]` — no image re-attachment, correct content type
- Generated images are NEVER re-sent back to the model — only the text context matters

**`LLMResponse` type updated:** `imageFormat?: string` added to `lib/types.ts`

**`chat-interface.tsx` updated:** `imageFormat: result.imageFormat || 'png'` instead of hardcoded `'png'`

---

### 3. Debug Logging Overhaul — KISS Principle

**Rule established:** Log real data directly. Never construct intermediate shape objects or use `JSON.stringify()` just for logging. Strip base64 inline at the log site only.

**Violations fixed:**
- `openai.ts`: `JSON.stringify(data)` replaced with direct spread + `result: '[base64]'` for `image_generation_call`
- `openai.ts`: request body log now spreads `reqBody` directly, replacing `input_image` `image_url` with `'[base64]'`
- `emotions.ts`: `JSON.stringify(reqBody, null, 2)` and `JSON.stringify(data, null, 2)` → direct object refs
- `tools.ts`: same `JSON.stringify` pattern removed
- `emotions.ts`: redundant `aiResponse` log removed (already present in request body)
- `groq.ts`: `image_url` base64 filter was `{ ...c, image_url: '[base64]' }` — wrong, overwrote the object with a string. Fixed to `{ ...c, image_url: { url: '[base64]' } }` to preserve the correct Groq content structure

**Logging added where missing:**
- `groq.ts` `callGroqAPI`: settings resolved, model selection, request body (base64 stripped), HTTP status, response data, raw content preview, parsed keys, success, caught error
- `groq.ts` `transcribeAudio`: request params, HTTP status, response data, success, caught error
- `custom.ts` `callCustomAPI`: settings resolved, request body, HTTP status, error response, response data, raw content preview, success, caught error
- `custom.ts` `transcribeAudio`: request params, HTTP status, response data, success, caught error
- `router.ts`: provider + message count on entry, response length + usage + hasImage on exit
- `voice/openai.ts`: 4 scattered logs replaced with request body log (instructions as `[N chars]`), HTTP status, error response, success with blob size, caught error
- `voice/resembleai.ts`: full logging chain added from scratch (was completely empty); `audio_content` stripped as `'[base64]'`

**`openai.ts` reasoning log:** `summary` field from `reasoning` output item now included in response data log so model thinking steps are visible when populated.

**Pending — `DEBUG_MODE` constant:**
- Plan: add `DEBUG_MODE = false` to `constants.ts`, create `debugLog(...args)` utility in `lib/utils.ts`, replace all `console.log('[Athena]...')` calls with `debugLog()`
- Default committed value: `false` (no debug noise in production)
- Flip to `true` locally when debugging
- NOT yet implemented — deferred to next session

---

### 4. Hydration Fixes

**`app/companion/[id]/page.tsx`:** `CompanionPopup` (uses `useSearchParams()`) wrapped in `<Suspense>` — required by Next.js App Router when `useSearchParams` is used in a client component

**`app/chat/[id]/page.tsx`:** `ChatPopup` logic extracted into its own component, wrapped in `<Suspense>` inside `ChatPopupPage`

**`components/markdown-message.tsx`:** `p` renderer changed from `<p>` to `<div>` — `<p>` cannot contain `<pre>` (HTML spec violation causing hydration error). Previous runtime child-type check (`child?.type?.name === 'pre'`) was unreliable because the custom `code` component renders `pre` directly as a function.

**`chat-interface.tsx`:** `overrideText ?? input` changed to `typeof overrideText === 'string' ? overrideText : input` — send button was passing `MouseEvent` as `overrideText` when called directly as `onClick` handler.

---

### README.md Updated

- Tool detection section corrected: Groq pre-flight vs OpenAI native tools clearly separated
- Image generation added to features section
- `store: false` noted in privacy section
- TTS URL-suppression directive added to Voice I/O
- `use-brain.ts` added to project structure
- `RessembleAI` typo fixed to `ResembleAI`
- Single provider/model table split into per-provider tables (Groq, OpenAI, ResembleAI, Decart AI, Custom)
- OpenAI pre-flight tool detection row removed from model table

---

### Critical Lessons Learned This Session

1. **Read ALL provided debug logs before responding** — Multiple instances of claiming logs showed nothing when the evidence was right there in what the user pasted directly. This wasted significant time and credits.
2. **Never confirm something is working without evidence** — Confirmed image+text handling was correct before actually verifying it. It was not. Read the logs, read the code, then confirm.
3. **When the user pastes a log line directly in chat, READ IT** — `[Athena] callOpenAIAPI: image received { format: 'png', quality: 'high' }` was the answer. It was pasted directly. It was ignored.
4. **Ask before touching** — The hydration fix in `chat/[id]/page.tsx` could have been a simple question: "is this page also affected?" instead of a rushed refactor.
5. **KISS applies to diagnostic logs too** — Intermediate shape objects for logging are unnecessary complexity. Spread the real object, strip inline, done.
6. **`typeof x === 'string'` over `x ?? fallback`** when the value might be a non-null non-undefined non-string (like a `MouseEvent`).

---

### Architecture State at End of Session 26

```
OpenAI Image Generation:
- image_generation tool fires via tool_choice: 'auto' on Responses API
- Image-only response (no text): early return with imageBase64 + imageFormat
- Image + text response: both returned together, imageFormat from output_format field
- Generated images never re-sent to model on next turn (assistant messages = output_text only)
- store: false on all OpenAI requests

Router:
- Groq: pre-flight detectTools() → early return if tools fired
- OpenAI: no pre-flight, tools handled natively

Debug Logging:
- All /lib/llm files: full input/output chain, base64 stripped inline
- All /lib/voice files: full request/response chain, audio base64 stripped
- DEBUG_MODE implementation deferred to next session

Hydration:
- companion/[id] and chat/[id] pages both wrapped in Suspense
- MarkdownMessage p renderer uses div to allow pre nesting

Open items carried forward:
- DEBUG_MODE constant + debugLog() utility — next session priority
- CSP header still missing
- Live-avatar Decart integration test deferred
```

---

> ## Session 25: Responsive Layout Fixes, Settings Panel Mobile Fix, Popup Status Bug (03/31/2026)

### Overview

Session 25 focused on responsive layout issues in the companion window, settings panel mobile breakpoint fix, visual format consistency between `static-2d` and `live-avatar` fallback, and a long debugging saga around the popup window connection status dot. The session ended with several lessons learned about discipline and process.

---

### 1. Companion Window Responsive Layout

- **`companion-window.tsx`** container axis flipped: from `w-full aspect-[3/4] max-h-full` to `h-full aspect-[3/4] max-w-full` with `items-center` — height is now the known concrete dimension from `flex-1`, width is derived from it at 3:4 portrait ratio
- **`r3f-animated-character.tsx`** R3F Canvas got explicit `width: '100%', height: '100%'` in style to match `avatar-2-5d.tsx` which already had it

### 2. Settings Panel Mobile Fix

- **`app/page.tsx`** settings wrapper: changed from `fixed bottom-24 right-6 z-40 w-96` to `fixed bottom-24 z-40 inset-x-4 md:inset-x-auto md:right-6 md:w-96` — below `md` (768px) fills viewport width minus 16px padding; at `md`+ restores original desktop behaviour

### 3. Visual Format Consistency

- `animate-[float_6s_ease-in-out_infinite]` removed from `static-2d` image in `companion-window.tsx`
- `live-avatar` fallback wrapper upgraded to `border-2` to match `static-2d` framing
- `animate-pulse` + opacity combo restored on `live-avatar` fallback — intentional UX signal for connecting/error states

### 4. Popup Window Connection Status — Long Saga

**Root cause:** `app/companion/[id]/page.tsx` was introduced in Session 23 with a `CompanionBrain` wrapper (my invention) that called `useBrain()`. This caused:
- `"Database not initialized"` errors — popup has an isolated IndexedDB context
- `expressionState` defaulting to an active state → green dot despite `isOnline = false`
- `isOnline` derived from `window.online/offline` browser events (device internet) instead of API key presence

**Fix applied:**
- `companion-window.tsx` now appends `&online=1` or `&online=0` to the popup URL
- `app/companion/[id]/page.tsx` reads `isOnline` from `searchParams.get('online') === '1'` — no DB query, no hook, no async timing issues
- `CompanionBrain` removed, `CompanionPopupView` rendered directly from `CompanionPopup`
- `companion` object corrected to match `CompanionData` interface exactly (had wrong fields `gender`, `category`; was missing `appearance`)

---

### Critical Lessons Learned This Session

1. **Read ALL referenced files before touching anything** — `CompanionData` interface was in `lib/types.ts`. I added fields that didn't exist and missed required ones. Always read the interface before constructing objects.
2. **Never introduce new components without understanding the existing architecture** — `CompanionBrain` was never in the original design. The popup is display-only. `useBrain` was designed for the main window only.
3. **Plan before code, always** — Multiple back-and-forth code changes caused regressions (removed mic button, broke layout). The correct approach: diagram → before/after → user approval → implement.
4. **When told to stop touching code, stop** — This was violated multiple times. Trust the human's judgment when they say to hold.
5. **Debug logs are for reading, not patching** — Added logs correctly but then tried to patch around them instead of reading what they were saying clearly.

---

### Architecture State at End of Session 25

```
Popup Window:
- /companion/[id] receives isOnline via URL param (?online=1|0)
- Snapshot at open-time — user must close/reopen to reflect settings changes (accepted limitation)
- CompanionBrain removed — popup is display-only, no useBrain(), no DB dependency
- companion object conforms exactly to CompanionData interface

Visual Formats (companion-window.tsx):
- Container: h-full aspect-[3/4] max-w-full (height-driven, not width-driven)
- static-2d: no float animation, border-2
- live-avatar fallback: border-2, opacity-60 animate-pulse (connecting) / opacity-80 (error)
- animated-2d (R3F): Canvas has explicit width/height 100%

Settings Panel:
- Mobile (<md): inset-x-4 bottom-24 fixed (full width minus padding)
- Tablet+ (md+): right-6 w-96 bottom-24 fixed (original behaviour)

Open items carried forward:
- Fix broken popup implementation (top priority)
- CSP header still missing
- Popup live-sync with main window (BroadcastChannel) — deferred, accepted limitation
- Actual live-avatar Decart integration test — deferred until API key is configured
```

---

## Session 24: Project Publication, OpenAI Fixes, Provider-Aware Tools & Emotion Detection (03/30/2026)

### Overview

Session 24 focused on three areas: getting the project live on Vercel with a proper GitHub connection, fixing a series of OpenAI Responses API issues discovered in production, and extending the tools/emotion detection pipeline to be fully provider-aware.

---

### 1. Project Published + GitHub Linked

- Vercel project deployed and publicly accessible
- GitHub repo `Jiab77/athena` connected to v0 chat
- All branches tracked and PRs managed through the v0/Vercel integration

---

### 2. OpenAI Fixes

A series of issues were identified and fixed in `lib/llm/openai.ts`:

- **`tools` + `tool_choice` removed from initial `reqBody`** — OpenAI Responses API rejects `web_search` when combined with JSON mode (`"Web Search cannot be used with JSON mode"`). Removed both fields from the static request body.
- **`reasoning: { effort: 'low' }` kept** — confirmed valid for all GPT-5.4 models on the Responses API.
- **`Buffer.from()` identified as latent browser bug** — only triggers when a document is attached; deferred fix using `TextEncoder` approach noted for later.
- **`chat-interface.tsx` null guard** — `decryptData()` can return `null` for old-format conversations; both `chat-interface.tsx` and `conversation-history.tsx` now guard against `null` before `JSON.parse` and validate `Array.isArray()` before accessing `.length`.
- **Parse fallback for tools mode** — when `toolsNeeded: true`, the model may still return JSON; `parseCompanionJSON` is now always attempted first, falling back to plain-prose wrap only if it throws.
- **Copy buttons** — added per-message copy button (top-right for companion, top-left for user); uses inline SVG icons (`CopyIcon`, `CheckIcon`) to avoid stale `lucide-react` module cache issues from the PWA service worker.
- **File uploader `accept` attribute** — now driven by `DOCUMENT_FORMAT_MIME_TYPES` constant instead of a static hardcoded string.

---

### 3. Provider-Aware Tools Detection — `lib/llm/tools.ts`

`detectTools()` now accepts a `provider` parameter and branches:

- **`provider === 'groq'`** — existing `detectToolsGroq()` logic unchanged (compound model, `executed_tools` array, early return if tools fired)
- **`provider === 'openai'`** — new `detectToolsOpenAI()` path: calls `gpt-5.4-nano` via `v1/chat/completions` with JSON mode, asks "does this require a web search?", returns `{ toolsNeeded: true/false }`
- **`DEFAULT_OPENAI_TOOL_DETECTION_MODEL = 'gpt-5.4-nano'`** added to `constants.ts`
- **`ToolDetectionResult`** extended with `toolsNeeded?: boolean` in `lib/types.ts`
- **`router.ts` `callLLM()`** — accepts optional `selectedProvider` param; runs pre-flight for both Groq and OpenAI; signals `_toolsNeeded` via temporary property on last message for OpenAI path
- **`openai.ts`** — reads `_toolsNeeded`, builds `reqBody` with either `tools + tool_choice` (no JSON mode) or `text.format` (no tools); always attempts `parseCompanionJSON` first
- **`chat-interface.tsx`** — tool detection gate extended from `isGroqProvider` to `isGroqProvider || isOpenAIProvider`; passes `selectedProvider` to both `detectTools` and `callLLM`

---

### 4. Provider-Aware Emotion Detection — `lib/llm/emotions.ts`

`detectEmotion()` now accepts a `provider` parameter and branches:

- **`provider === 'groq'`** — existing logic: `GROQ_CHAT_API_URL` + `DEFAULT_GROQ_EMOTION_DETECTION_MODEL` (`llama-3.1-8b-instant`), Groq API key
- **`provider === 'openai'`** — new path: `OPENAI_CHAT_API_URL` + `DEFAULT_OPENAI_TOOL_DETECTION_MODEL` (`gpt-5.4-nano`), OpenAI API key; `max_completion_tokens` used instead of `max_tokens`
- **`brain.ts`** — passes `selectedProvider` to `detectEmotion`; exposes `setLastDetectedEmotion` from `useBrain` return value; `BrainState` interface updated
- **`merged-companion-chat.tsx`** — `onEmotionDetected` callback now wired to `setLastDetectedEmotion` instead of being silently discarded (`void emotion`)
- **`chat-interface.tsx`** — passes `selectedProvider` to `detectEmotion`

---

### Architecture State at End of Session 24

```
Tool Detection:
- Groq: compound model pre-flight → early return if tools fired
- OpenAI: gpt-5.4-nano JSON mode pre-flight → toolsNeeded flag → gates web_search vs JSON mode in main call

Emotion Detection:
- Groq: llama-3.1-8b-instant via api.groq.com
- OpenAI: gpt-5.4-nano via api.openai.com
- Both paths: same JSON schema, same parsing logic, same emoji badge output

Copy Feature:
- Per-message copy button, hover-revealed
- Companion messages: button top-right of bubble
- User messages: button top-left of bubble
- 2s green check confirmation on copy

Open items carried forward:
- Buffer.from() → TextEncoder fix applied manually by Jiab77 (closed)
- CSP header still missing
- Responsive design issues (Session 25 focus)
```

---
