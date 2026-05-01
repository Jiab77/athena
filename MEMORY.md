# MEMORY.md - Session Memory for Athena Project

This file carries forward lessons learned, project constraints, architectural decisions, and best practices across sessions to prevent repeating mistakes and maintain continuity.

**Primary User:** You (the AI working on Athena)
**Purpose:** Continuity, pattern preservation, mistake prevention, institutional knowledge
**Format:** Plain markdown - easy to parse and understand
**Update Schedule:** After each significant work session, document what you learned

---

## Session Init — Read This First

Before doing anything else in a session, complete all four steps in order:

1. Read this file completely
2. Read `AGENTS.md` — project conventions, file structure, coding standards
3. Read `SOUL.md` — collaboration values and design principles
4. Read `HUMAN.md` — Who you're working with and how they approach problems
5. Read `TEAM.md` — roles and responsibilities

Then internalize these four execution rules before touching any code.
Inspired by Andrej Karpathy's coding guidelines — https://github.com/forrestchang/andrej-karpathy-skills

### Execution Rules

1. **Ask, don't guess** — surface confusion before writing a single line. Wrong assumptions waste more time than a clarifying question.
2. **Minimum code** — write the least code that correctly solves the problem. No speculative abstractions, no unrequested flexibility. If 200 lines could be 50, the 200-line version is wrong.
3. **Surgical changes** — every changed line must trace directly to the user's request. Do not touch adjacent code, improve unrelated patterns, or remove pre-existing dead code without being asked. Mention it, never fix it silently.
4. **Define done first** — before implementing any non-trivial task, state the verifiable success criterion. Implementation is complete when that criterion is met, not when the code looks right.

---

## How This File Works

**External Context Persistence Across Sessions**

### Session 2+ Flow
- Read updated MEMORY.md first — restores project continuity without repeating past mistakes or redoing completed work
- Continue effectively where previous session left off
- Append new learnings

### Session 1 Flow
- Read MEMORY.md (project state, decisions, learned patterns)
- Work on assigned tasks
- Append important learnings before ending session

**Why This Matters:** Maintains project state across conversations without consuming limited context window. You start each session informed, not blank.

---

## Key Documents Reference

| Document | Purpose |
|---|---|
| `MEMORY.md` | This file — session continuity and lessons learned |
| `docs/REDESIGN.md` | Kai-inspired redesign discussion — UX rework + persistent memory + feature comparison |
| `docs/ROADMAP.md` | Phase roadmap (MVP → Quality → Advanced → Desktop) |
| `docs/IMPLEMENTATION_STATUS.md` | Checkbox-level feature implementation status |
| `docs/IMPLEMENTATION_NOTES.md` | Technical architecture notes |
| `docs/SECURITY_REPORT.md` | OWASP Top 10:2025 security audit |

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

### Context Gathering Rules

- Use parallel tool calls where possible.
- Don't stop at the first match — examine ALL matching files to find the right variant/version.
- Understand the full system before making changes — check existing patterns, parent components, utilities, schemas, and architecture.
- Search systematically: broad → specific → verify relationships.

### Impact Assessment Rules (CRITICAL — learned the hard way)

- Before removing ANY import, constant, or function, grep ALL consumers across the full codebase first.
- Before adding ANY new abstraction (proxy, middleware, cookies), verify it is architecturally compatible with the existing session/auth design.
- Before claiming something is "dead code", confirm zero consumers exist outside the file itself.
- When cleaning up after a change, read the full diff mentally and check every removed line for hidden dependencies.

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

## Session 34: Emotion lifecycle consolidation, CSP fix, model capabilities registry (05/01/2026)

### Overview

Four merged PRs covering distinct threads, all chained off the OpenRouter foundation laid in Session 33:

- **PR [#35](https://github.com/Jiab77/athena/pull/35)** — Tier 1 (shared `EMOTION_CONFIG`) + Tier 2 (single emotion-lifecycle owner in `brain.ts`), settings summary API-key row redesign, `isTranscribing` → `'thinking'` voice-state alignment. 13 files, +360 / −327.
- **PR [#36](https://github.com/Jiab77/athena/pull/36)** — `EMOTION_PROVIDERS` registry centralisation (eliminating circular imports), STT model registration made strict, OpenRouter voice-selection simplification, `MOBILE_SWIPE_THRESHOLD` / `DEFAULT_COMPANION_NAME` constants. 7 files, +212 / −52.
- **PR [#37](https://github.com/Jiab77/athena/pull/37)** — CSP `media-src 'self' blob: data:` fix unblocking TTS playback + idempotent `AudioContext` disposal. 2 files, +23 / −4.
- **PR [#38](https://github.com/Jiab77/athena/pull/38)** — `LLMModelCapabilities` registry + `resolveModelForCapabilities()` resolver, model description overhaul, OpenRouter server tools (`web_search`, `web_fetch`, `image_generation`), JSON parsing alignment with `openai.ts`. 4 files, +268 / −63.

Heavy emphasis on *discuss before code* throughout — easily a third of the session value came from clarifying intent before touching files. Several proposed flags and code paths got pruned or reframed in conversation, including the entire concept of an `audio` capability flag.

---

### 1. Emotion lifecycle — Tier 1 + Tier 2 (PR #35)

The emotion code had three problems coexisting since Session 33:

1. **Three competing reset mechanisms**: brain's auto-reset timer, brain's `handleTTS` post-TTS reset, and chat-interface's TTS-end callbacks. They raced on every short response, producing visual flicker.
2. **Duplicated config**: `EMOTION_CONFIG` was defined inline in multiple components, no single source of truth.
3. **Lifecycle scattered across components**: `setLastDetectedEmotion(null)` calls in chat-interface, brain, popup view — each with slightly different timing.

**Tier 1 — `EMOTION_CONFIG` consolidation** (~200 lines deleted): single `EMOTION_CONFIG` constant in `lib/constants.ts`, all consumers import it. Eliminates "is the emotion list in component A the same as component B?" doubts.

**Tier 2 — single owner in `brain.ts`**: emotion lifecycle now lives end-to-end in the brain hook. Both pipelines (typed via chat-interface, voice via brain mic) feed through the same `handleResponseReceived` → `detectEmotion` → `setLastDetectedEmotion` → reset path. The "emotion went null" effect cancels any pending timer as a safety net.

**Late-session refinement** (manual edit by user, then aligned by AI): conditional reset logic. Reset depends on whether voice will play:

- **Voice ON** (`voiceOutputEnabled || isLiveAvatar`) → emotion clears via TTS-end callback. **No timer scheduled.**
- **Voice OFF** → no TTS-end signal will ever arrive, so the timer is the sole reset mechanism.

This eliminates the race. Earlier "fallback timer in case TTS doesn't run" framing was the wrong mental model — the right framing is "the timer is the reset path *only* when TTS won't run."

**Tier 3 — `lib/chat.ts` extraction** discussed at length, deferred. Two `handleSendMessage` functions (one in chat-interface, one in brain) still exist; consolidation would be a larger refactor than this session warranted, and the user wanted to see the new architecture stabilise before the next pull.

---

### 2. Settings summary API-key row + `isTranscribing` fix (PR #35)

**Always-rendered three-state row**: previously the API-key indicator in the settings summary appeared/disappeared based on configuration; now it always renders with three explicit states (`{provider} key configured` / `{provider} key missing` / `Configure {provider}`). `{provider}` interpolation uses the existing `t()` helper. UX improvement: users always see what's needed, nothing changes layout.

**`isTranscribing` → `'thinking'` voice-state consistency**: `voiceState === 'thinking'` was meant to be the unified avatar pose during *both* mic transcription and LLM generation. The transcription path was setting a separate `isTranscribing` flag, which left the avatar in an inconsistent pose. Now both feed `voiceState = 'thinking'` directly — single source of truth, consistent pose semantics.

---

### 3. `EMOTION_PROVIDERS` registry + OpenRouter native emotion (PR #36)

Session 33 closed with "OpenRouter emotion detection is a one-line addition." Session 34 made it real:

- New `EMOTION_PROVIDERS` registry in `lib/constants.ts` mirrors the `STT_PROVIDERS` / `TTS_PROVIDERS` pattern.
- Each provider declares its dedicated emotion-classification model (`gpt-5.4-nano` for OpenAI, `meta-llama/llama-prompt-guard` style entry for Groq, **`openai/gpt-5.4-nano` for OpenRouter** — same nano model, accessed through OpenRouter's gateway).
- Eliminated circular imports that had crept in when emotion code was fanned out across `emotions.ts`, `router.ts`, and provider adapters.

**Mistake corrected mid-session**: I initially wrote in the README plan that OpenRouter's emotion runs "through whatever main model is selected" — wrong. OpenRouter has the same architectural pattern as OpenAI (small dedicated model for emotion, separate from main inference). User caught it; corrected before any edit landed.

---

### 4. CSP + AudioContext fix (PR #37)

Two bugs visible in one screenshot, both blocking TTS playback in production:

**CSP `media-src` missing**: `next.config.mjs` declared `default-src 'self'` but never explicitly set `media-src`. Browsers fall back to `default-src` for `<audio>` / `<video>` sources, which doesn't allow `blob:` URLs — and TTS playback creates blob URLs via `URL.createObjectURL`. Result: every TTS playback failed with `NotSupportedError: Failed to load because no supported source was found`.

**Fix**: `media-src 'self' blob: data:`. Same-origin scope by definition (blob URLs are scoped to the document that created them) — no security regression. Added `data:` proactively for future TTS providers that return inline `data:` URIs.

**`Cannot close a closed AudioContext`**: `lib/utils.ts` `playAudio()` had five disposal paths (`ended`, `error`, `stop()`, `destroy()`, catch block) all calling `audioContext?.close()`. Optional chaining only guards against `null`, not against "already closed" — so any second close threw `InvalidStateError`. Fixed with idempotent helper:

```ts
const closeAudioContextSafely = () => {
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {})
  }
}
```

All five call sites now route through this helper.

**Recurring lesson**: CSP changes need a dev-server *restart* — headers are set at build time, not picked up by HMR. User had to be told this explicitly.

---

### 5. `LLMModelCapabilities` registry + resolver (PR #38)

The biggest design conversation of the session. Took multiple iterations to land on the right shape.

**Problem**: three adapters handled capability-bearing requests three different ways. Groq did model substitution via hardcoded `DEFAULT_GROQ_VISION_MODEL` / `DEFAULT_GROQ_URL_CAPABLE_MODEL` constants. OpenAI/OpenRouter trusted whatever model was selected. Tool detection was Groq-only because that's where it was first built. The model picker UI had no way to know what each model could do.

**Solution shape (after pruning)**:

```ts
export interface LLMModelCapabilities {
  // ─── Input capabilities ───
  vision?: boolean      // accepts image inputs
  urls?: boolean        // can fetch/parse URLs natively
  documents?: boolean   // accepts file/document uploads (PDF etc.)
  tools?: boolean       // emits OpenAI-compatible tool_calls
  webSearch?: boolean   // built-in web search
  // ─── Output capabilities ───
  images?: boolean      // generates images inline (Nano Banana style)
  videos?: boolean      // generates videos inline
}
```

Boolean flags (not string array) so typos fail at compile time. All optional — `undefined` means false. Empty `{}` for text-only models is valid.

**`resolveModelForCapabilities(providerId, chosenModel, required)`** in `lib/llm/router.ts`:

1. Empty `required` → return chosen unchanged.
2. Chosen satisfies → return chosen.
3. Otherwise pick first model in same provider that satisfies (regardless of `visible` — substitution targets aren't user-picked, and capability-bearing models like Groq compound are intentionally hidden from the picker).
4. No model qualifies → return chosen unchanged. Caller decides degradation. Never throws.

Replaces the per-adapter `DEFAULT_GROQ_*` substitution pattern with one registry-driven lookup.

**The flag-by-flag debate** (each flag pruned, debated, restored, or added):

- **`audio`** — initially included for OpenRouter's `input_audio` STT trick. User correctly pointed out: STT is owned by `STT_PROVIDERS`, TTS by `TTS_PROVIDERS` — LLM models never touch audio in our architecture. Audio attachments (MP3 of music etc.) is a hypothetical feature that doesn't exist. **Removed.**
- **`tools`** — initially defined as "client-driven function calling we'll execute." User correctly pointed out: no tools registry exists; users can't select something that isn't built. **Removed**, then *reinstated* later in the same session when `openrouter:image_generation` came up — that server tool requires the chat model to *emit* `tool_calls` for OpenRouter to fulfil server-side. Redefined as "emits OpenAI-compatible tool-call payloads," which is a stable model property regardless of who executes them.
- **`images` / `videos`** — added as *output* capabilities (Nano Banana-style chat models that interleave generated media in their text response). Distinct from `vision`, which is input. Symmetrical pair kept separate because some models will do one but not the other.

**Two acknowledged smells, deferred**:

1. **OpenRouter has 10-of-11 models with identical capabilities.** That's not model metadata, that's provider metadata duplicated 10 times. Suggested provider-level `LLMProvider.capabilities` defaults with model-level overrides; deferred — real refactor with consequences, registry stays flat for now.
2. **`urls` semantics differ across providers** — Groq compound's `urls: true` means the *model itself* fetches URLs; OpenAI/OpenRouter's `urls: true` means *the provider* offers a server tool that any tools-capable model can invoke. Same flag, different mechanism. Acceptable while the user-facing meaning is "this combination can fetch URLs."

---

### 6. OpenRouter server tools + JSON parsing alignment (PR #38)

**Server tools added**: `openrouter:web_search`, `openrouter:web_fetch`, `openrouter:image_generation`. All three are *server-side* — the chat model emits `tool_calls`, OpenRouter fulfils them, the model's final response weaves in results. Zero client-side execution required.

**JSON parsing alignment**: `lib/llm/openrouter.ts` was still using `parseCompanionJSON()` from the early "Groq-style JSON envelope" pattern — but the system prompt no longer requests JSON envelopes (Session 33 cleanup). User pointed out that `openai.ts` had been reading plain `choices[0].message.content` directly for a while; OpenRouter should match. Fixed: dropped `parseCompanionJSON` import, response handler now reads `content` verbatim. Server-tool output (search results, fetched URLs, generated images) is already woven into the message string by the time we receive it.

**Mistake (and lesson)**: when making the JSON parsing change, I tacked on a speculative warning about future image extraction work, framed as if it cast doubt on the change. User correctly called it out — the JSON-parsing change was right, fully understood, and didn't need hedging. Speculative caveats undermine surgical changes.

---

### 7. Model descriptions overhaul (PR #38)

Tactical but worth noting: rewrote all 10 OpenRouter model descriptions. First pass expanded them from one truncated sentence to 2-3 detailed sentences — *wrong direction*. User wanted *shorter* and capability-focused, matching Groq/OpenAI style. Second pass (correct): 10-15 words each, surfacing the differentiator a user actually picks on (architecture, context window, modality, free vs paid).

Recurring lesson: when the user asks for "better," default to *terser*. Length is rarely the gap.

---

### Skipped on purpose

- **Tier 3 `lib/chat.ts` extraction** — investigated, sized, deferred. The two `handleSendMessage` paths (chat-interface and brain) are real duplication, but the right time to extract is after the Tier 1+2 changes have stabilised in production, not chained onto the same session.
- **`lib/constants.ts` size split** — file is now ~600+ lines after `LLMModelCapabilities` plus `EMOTION_PROVIDERS` plus the 10 OpenRouter descriptions. User explicitly said no — too many files import from `constants.ts`, splitting now would break the project for a micro-optimization while the structure is still moving. Revisit when the architecture has cooled.
- **Visualizer flashing before audio data** — parked from Session 33, not retested in Session 34.
- **Provider-level capability defaults** — see "Two acknowledged smells" above; deferred until the duplication actively hurts.
- **OpenRouter image extraction** — `openrouter:image_generation` is now in the tools array, but the response-side path that pulls generated images out of the message and renders them in the UI is **not wired**. The text path works regardless. Wiring requires confirming OpenRouter's wire format (markdown link in `content`? separate `message.images`? tool-call result block?) before adding extraction code — adding it speculatively would risk silently dropping images or crashing on unexpected shapes.

---

### Lessons learned

1. **The user's design instinct is usually right; my speculative additions usually aren't.** I added an `audio` capability flag, a `tools` flag, and image-extraction caveats — all three got correctly rejected, each based on the user's clearer view of what the system actually does and doesn't have. Pattern: when in doubt, omit the speculative flag and wait until a concrete need surfaces.

2. **Registry conversations need iteration.** The capabilities registry took 4-5 rounds of "add this / remove that / wait, add it back differently" before landing on the right shape. That iteration was *the work*, not noise around the work. Trying to land a perfect registry on the first attempt would have been worse.

3. **Match the precedent before innovating.** When OpenRouter JSON parsing was wrong, the fix wasn't to design a new path — it was to read what `openai.ts` already did and mirror it. Same with the OpenRouter emotion model: I almost wrote "uses main model" before checking; the registry already had `openai/gpt-5.4-nano` for OpenRouter, mirroring OpenAI's `gpt-5.4-nano` row. Reading the existing pattern would have saved a wrong claim.

4. **"Better" usually means "terser."** Two separate moments where the user said "make it better" and I defaulted to "make it longer / more detailed." Wrong both times. Default to compression — descriptions, comments, explanations.

5. **CSP changes need restart, not HMR.** Worth re-flagging as a recurring trap. Headers are build-time; HMR doesn't refresh them. Document the restart requirement when CSP edits land.

6. **Acknowledge mistakes by name, then move on.** The user pulled me up on speculative caveats, on misremembered architecture, on overly long descriptions. Each time the right response was: own it in one sentence, no hedging, no over-apologising, then continue. Long apologies are noise.

---

### Files touched (across PRs #35–#38)

**Modified:**
- `lib/constants.ts` — `EMOTION_CONFIG` consolidation, `EMOTION_PROVIDERS` registry, `LLM_PROVIDERS` capability flags + descriptions, `MOBILE_SWIPE_THRESHOLD`, `DEFAULT_COMPANION_NAME`, `ATTRIBUTION_TITLE`
- `lib/types.ts` — `LLMModelCapabilities` interface (input/output sections)
- `lib/llm/router.ts` — `resolveModelForCapabilities()` function
- `lib/llm/brain.ts` — single emotion-lifecycle owner, conditional reset logic (voice on/off)
- `lib/llm/openrouter.ts` — server-tools array, JSON parsing alignment
- `lib/llm/groq.ts` / `lib/llm/openai.ts` — minor capability-related touch-ups
- `lib/utils.ts` — idempotent `closeAudioContextSafely` helper
- `next.config.mjs` — CSP `media-src 'self' blob: data:`
- `components/chat-interface.tsx` — emotion lifecycle delegation, `isTranscribing` removal
- `components/settings-panel.tsx` — three-state API-key row with `{provider}` interpolation
- `i18n/{en,fr,de,it}.json` — translation keys for new API-key row strings
- `README.md` — OpenRouter in API Keys table, Inference Routing table, References, Web search feature line

---

### Open items for future sessions

- **Tools-detection logic generalisation across providers** — `lib/llm/tools.ts` currently has only `detectToolsGroq`. Now that `LLMModelCapabilities.tools` exists in the registry, the detection layer can route to whichever provider has a tools-capable model. Likely follow-up shape: `detectTools()` resolver mirroring the emotion/STT pattern. Worth scoping before touching code — the user explicitly flagged this for future review based on the new capabilities definitions.
- **OpenRouter image extraction** — wire response-side parsing once the wire format is confirmed. The text path is unaffected.
- **Provider-level capability defaults** — `LLMProvider.capabilities` with model-level overrides. Address when adding an 11th OpenRouter model (or when a new provider arrives with similar bulk-identical caps).
- **Tier 3 `lib/chat.ts` extraction** — deduplicate the two `handleSendMessage` pipelines once the Tier 1+2 changes have settled.
- **Visualizer flashing before audio data** (still parked from S33).
- **Typing-speed pacing for assistant messages** (still parked from S33).
- **Multi-tab locale/gender sync** via `BroadcastChannel` (still parked from S33).
- **Translation coverage audit** (still parked from S33).
- **`lib/constants.ts` split** — deferred this session; revisit when architecture has cooled.

---

## Session 33: OpenRouter STT + TTS, multi-provider architectural cleanup (04/28/2026)

### Overview

A long, multi-day session shipped as PR [#33](https://github.com/Jiab77/athena/pull/33) — *"Improve localization, add OpenRouter support, and enhance security"*. 27 files changed, +2598 / -271 lines, 24 commits. Five threads ran in parallel, each substantial enough to be its own session under different circumstances:

1. Comprehensive i18n with gender-aware translations (en, fr, de, it)
2. OpenRouter as a fully-fledged provider across chat, STT, and TTS
3. Security headers — CSP and friends — applied at the framework level
4. PWA install prompt with custom flow
5. Standardisation pass on UI tooltips and a sweeping multi-provider architectural cleanup

The cleanup thread snowballed late in the session — once OpenRouter joined the registry, the OpenAI/Groq-centric special-cases that had been correct-when-written started looking like real misfits. That triggered a cascade of generalisations covered in detail below.

Heavy emphasis throughout on *discuss before code* — most of the value came from clarifying intent before touching files, not from the edits themselves.

---

### 1. Internationalisation — `en` / `fr` / `de` / `it` with gender awareness

The headline feature. Athena is a *companion*, and that word is gendered in every Romance language and in German. A naive `t('companion.label')` returning the same string regardless of avatar gender breaks immediately on French ("Compagne" vs "Compagnon"), Italian ("Compagna" vs "Compagno"), and German ("Begleiterin" vs "Begleiter").

**Architecture:**
- `lib/i18n.ts` — runtime helpers: browser detection (`navigator.language` → nearest supported locale, English fallback), nested-key resolution via dot notation, `{placeholder}` interpolation, gender-variant resolution
- `hooks/use-translation.ts` — React hook that loads the user's locale + gender from IndexedDB on mount, falls back to browser detection, and re-renders consumers via two custom DOM events: `athena:locale-changed` and `athena:gender-changed`
- `i18n/{en,fr,de,it}.json` — flat translation files, **English is the canonical schema** (the `TranslationDict` type is `typeof enDict`)
- `lib/constants.ts` — `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `LOCALE_LABELS` (always native script, e.g. `Français` not `French`), `TRANSLATIONS` aggregator
- `lib/types.ts` — `Locale` derived from `SUPPORTED_LOCALES` so the union stays in lockstep, `StoredSettings.locale` field added

**Gender variants** are encoded inline as `{ "default": "Compagne", "m": "Compagnon" }` for keys that need them, plain strings everywhere else. The `t()` helper detects the shape and resolves automatically. This was a deliberate choice over keying by gender at the JSON root — keeps the dictionary flat and lets translators see both forms together where it matters.

**Settings UX:** new "Language" accordion section in `settings-panel.tsx` showing each locale in its native script (`English`, `Français`, `Deutsch`, `Italiano`). Locale persists to IndexedDB; the change event fires synchronously so every consumer hook re-renders without a page reload.

**Adoption:** 22+ components migrated from inline strings to `useTranslation()`. Date formatting in `conversation-history.tsx` now uses the locale: `date.toLocaleDateString(locale === 'en' ? 'en-US' : locale)`.

---

### 2. OpenRouter — chat, STT, TTS, full multi-modality

OpenRouter is a single-key gateway in front of OpenAI, Anthropic, Google, Meta, etc. The pitch is **one API key for everything** — and that framing turned out to drive several decisions later.

**Chat (earlier in the session):**
- `lib/llm/openrouter.ts` — `callOpenRouterAPI()` using OpenAI-compatible `/v1/chat/completions` (not the Responses API)
- Optional attribution headers `HTTP-Referer` (origin) + `X-OpenRouter-Title: Athena` for OpenRouter's leaderboard, SSR-guarded
- Curated 6-model list in `LLM_PROVIDERS` (GPT-5.2, GPT-5 Mini, Claude Opus 4.6, etc.) — deliberately static. Reasoning captured in `docs/OPEN_ROUTER.md`: 300+ raw models is a paralysis dropdown; lazy fetching forks the architecture for low payoff; power users have **Custom** as the escape hatch

**STT (later in the session):**
- `transcribeAudio()` added to `lib/llm/openrouter.ts`, dispatched via `/chat/completions` with an `input_audio` content block (no dedicated Whisper endpoint exists)
- Registered in `STT_PROVIDERS` with `google/gemini-2.5-flash` as the model
- Same function signature as OpenAI/Groq adapters so the registry contract is preserved

**TTS (later in the session):**
- New `lib/voice/openrouter.ts` mirroring `lib/voice/openai.ts` — OpenRouter proxies OpenAI's `/audio/speech` directly, so the adapter is essentially a different host + key
- Voice IDs copied verbatim into a new `openrouter` entry of `TTS_VOICES` rather than aliased — each TTS provider stays a self-contained source of truth

**Documentation:** `docs/OPEN_ROUTER.md` (146 lines) captures architectural decisions to avoid re-litigating them — attribution headers, static-vs-dynamic model list, `connect-src` permissiveness rationale.

---

### 3. Security headers — framework-level CSP

Closed the longest-standing OWASP A02:2025 ticket in `docs/SECURITY_REPORT.md`.

**Implementation:** `next.config.mjs` `headers()` function applies six headers to every response:

- `Content-Security-Policy` — strict by default; `connect-src 'self' https:` is intentionally permissive to support user-configured custom provider endpoints, but still blocks `http://`, `data:`, and `blob:` exfiltration channels (the primary XSS exfiltration vectors). `'unsafe-inline'` + `'unsafe-eval'` in `script-src` required by Next.js runtime; `'unsafe-inline'` in `style-src` required by Tailwind.
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: microphone=(self), camera=(), geolocation=()` — camera deliberately disabled; microphone scoped to origin; geolocation off
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

Cross-references updated in `docs/IMPLEMENTATION_STATUS.md`, `docs/REDESIGN.md`, `docs/ROADMAP.md`, `docs/SECURITY_REPORT.md`.

---

### 4. PWA install prompt

Browsers stopped showing the default install mini-infobar reliably; users had to know to click the address-bar icon. Solved by capturing `beforeinstallprompt` and exposing a custom install flow.

- `hooks/use-pwa-install.ts` — captures the event, suppresses the default infobar, exposes `canInstall` boolean + `install()` async function. Listens for `appinstalled` to clear the deferred prompt afterward. Locally typed `BeforeInstallPromptEvent` interface (not in `lib.dom.d.ts`). Documented gotcha: not supported on iOS Safari, where `canInstall` correctly stays `false` — iOS users use the Share menu manually.
- New "Install App" item added to the FAB menu (`MonitorDown` icon), conditionally rendered when `canInstall === true`.

---

### 5. UI tooltip standardisation + API key UX polish

- All ad-hoc tooltips converted to Radix `Tooltip` / `TooltipProvider` / `TooltipTrigger` / `TooltipContent` for consistent keyboard/screen-reader behaviour. Affected `companion-popup-view.tsx`, `companion-window.tsx`, `conversation-history.tsx`, `merged-companion-chat.tsx`, others.
- `settings-panel.tsx` gained an `initialSection` prop so the empty-chat-state CTA can deep-link to the Model section when the user has no API key configured.
- Voice mode badge auto-syncs with chat visibility (centralised in `merged-companion-chat.tsx`).

---

### 6. Multi-provider architectural cleanup (the cascade)

Triggered late in the session when, after OpenRouter wired up, the question became *"what else hardcodes OpenAI/Groq?"*. Each item below was its own discussion before its own edit — we never bundled these.

**a. `hooks/use-connection-status.ts`** — replaced hardcoded `groq | openai | biollm` OR-chain with `LLM_PROVIDERS.map(...)`. The online indicator now reflects every configured provider, not just the original three. Same registry-driven pattern would have caught this bug for any future provider too.

**b. `components/settings-panel.tsx`** — generalised `isOpenAIVoice && isOpenAIGlobal` to `voiceProvider === provider`. Auto-populate-the-voice-key UX now works for OpenRouter and any future provider that does both chat and TTS, with mix-and-match (OpenAI chat + ResembleAI voice etc.) preserved.

**c. `lib/utils.ts` TTS dispatcher** — collapsed two parallel `if/else if/else if` chains (`generateTTSBlob`, `generateAndPlayTTS`) into a single `TTS_DISPATCHERS` lookup table + `dispatchTTS` helper. Adding a future TTS provider is now a one-line map addition.

**d. `lib/llm/router.ts` STT fallback** — collapsed two duplicated BioLLM-specific branches into `STT_FALLBACK_CHAIN` constant + `getNativeSTT()` + `resolveSTTFallback()` helpers. Side effect (intentional, user explicitly approved): Custom providers without `hasSTTSupport` now fall back to Whisper instead of throwing — consistent treatment for "active provider can't transcribe." OpenRouter deliberately excluded from the chain because chat-completions-STT is slower and token-billed than dedicated Whisper endpoints.

**e. `lib/llm/brain.ts:363`** — replaced literal `'groq'` fallback with `DEFAULT_MODEL_PROVIDER` constant. Single source of truth for the boot default.

**f. `lib/llm/emotions.ts` rewrite** — full architectural pass mirroring the STT cleanup. Per-provider `detectEmotion(systemPrompt, userText)` adapters added to `lib/llm/openai.ts` and `lib/llm/groq.ts`. `LLMProvider` interface gained optional `detectEmotion?` field. Router gained `EMOTION_FALLBACK_CHAIN` + `resolveEmotionDetector()` mirroring the STT pattern exactly. `emotions.ts` shrank from ~155 lines to 112 — now `fetch`-free, owns prompt construction + parsing + validation only, and delegates dispatch to the router. The `provider` parameter is finally honoured rather than silently ignored. Verbose logs preserved (user explicitly asked) and now split across coordinator + adapter layers for clearer traces.

---

### Skipped on purpose

- **Groq pre-flight tool detection duplication** (`chat-interface.tsx:383` vs `router.ts:94`) — investigated end to end, before/after diff presented. User correctly called it micro-optimization for a project this young; not worth touching. Filed as "revisit if/when another provider needs pre-flight, or if the Groq vision-bug fires in practice."
- **Streaming for chat completions** — discussed at length. Conclusion: streaming is a means, not a goal. Current non-streaming UX is well-suited to the chat companion product mode (short JSON-enveloped replies). Streaming becomes relevant when/if real-time voice/video chat ships, and should be a separate code path at that point, not a retrofit.
- **Typing-speed (reveal pacing) tuning** — interesting tangent during the streaming discussion. User's reference CLI uses 30ms/char (`RENDER_SPEED=0.03`), faster than reading speed so the animation gives a sense of arrival without delaying the reader. Athena's current reveal speed not measured; left as a future polish item rather than a now-fix.

---

### Lessons learned (recurring across the session)

1. **The actual code is the truth.** I was caught multiple times reasoning from memory or a snippet and being wrong. The pattern that worked: read the *full* file or the *full* surrounding context before opining, even when a snippet looks self-explanatory. Skim-reasoning produces confidently wrong answers — and the user noticed every single time.

2. **Two-instance rule for generalisation.** Special-case code (OpenAI-only voice key sharing, hardcoded BioLLM fallback, OpenAI/Groq emotion chain) wasn't wrong at write-time — there was only one instance. The right time to generalise is the moment the second instance appears and the special-case becomes a misfit. OpenRouter's arrival triggered a cascade of small generalisations that were each individually justified.

3. **Single-key UX is the correct framing for OpenRouter.** Initial instinct was to evaluate each capability in isolation ("is OpenRouter STT better than Whisper?" → no, skip). User reframed as "minimize the number of API keys a user must manage" → that flipped the recommendation. Per-request quality is one axis; friction-to-get-started is another, and the second often dominates for hobby/single-user projects.

4. **No users = bias toward clean code, not toward compatibility.** User explicitly noted there are zero users today (project is public on GitHub but unannounced). That collapses the "don't break compatibility" axis. Stop reflexively hedging on "this might surprise users" until users exist to surprise. Still flag *risky* changes (data migrations, destructive ops) because dev/test data still matters.

5. **Discussion before code paid off, every time.** Cadence was: user asks → I read → I propose → user clarifies/corrects → I implement. Several proposed changes were pruned by clarification before any file was touched: the audio-input "blocker" I invented in error; the OpenRouter "model curation" overhead I imagined; the streaming retrofit I worried about; the duplicate Groq pre-flight detector that turned out to be micro-optimization. Saved real time on each.

6. **Document architectural decisions while they're fresh.** `docs/OPEN_ROUTER.md` was written *during* the OpenRouter integration, not after. Future-me reading "why did we curate the model list?" will have the answer in one paragraph instead of having to reconstruct it from commits. Pattern worth repeating for future cross-cutting decisions.

7. **Localisation surfaces hidden coupling.** Adding gender-aware translations meant every component that displayed "companion" had to know about avatar gender. The custom-event broadcast (`athena:gender-changed`) is the right pattern for a single-tab SPA, but it's load-bearing — multi-tab sync would need `BroadcastChannel`. Filed for the day that comes up.

---

### Files touched (PR #33 totals: 27 files, +2598 / −271)

**New files:**
- `hooks/use-pwa-install.ts` — install prompt hook
- `hooks/use-translation.ts` — i18n React hook
- `lib/i18n.ts` — i18n runtime helpers
- `i18n/en.json` / `fr.json` / `de.json` / `it.json` — translation dictionaries
- `lib/llm/openrouter.ts` — chat + STT adapter
- `lib/voice/openrouter.ts` — TTS adapter
- `docs/OPEN_ROUTER.md` — architectural decisions

**Modified:**
- `next.config.mjs` — security headers
- `lib/constants.ts` — i18n constants, OpenRouter provider/STT/TTS/voices entries
- `lib/types.ts` — `Locale`, `TranslationDict`, `StoredSettings.locale`
- `lib/llm/router.ts` — OpenRouter registration, STT fallback generalisation, emotion resolver
- `lib/llm/openai.ts` — `detectEmotion()` added
- `lib/llm/groq.ts` — `detectEmotion()` added
- `lib/llm/emotions.ts` — full rewrite as thin coordinator
- `lib/llm/brain.ts` — `DEFAULT_MODEL_PROVIDER` constant
- `lib/utils.ts` — `TTS_DISPATCHERS` map + `dispatchTTS` helper
- `hooks/use-connection-status.ts` — registry-driven key check
- `components/settings-panel.tsx` — i18n + voice-key generalisation + `initialSection` prop + Language section
- `components/{companion-popup-view,companion-window,conversation-history,export-modal,import-modal,merged-companion-chat}.tsx` — i18n migration + Radix tooltip standardisation
- `app/page.tsx` — PWA install integration, i18n, settings deep-link
- `docs/{IMPLEMENTATION_STATUS,REDESIGN,ROADMAP,SECURITY_REPORT}.md` — CSP closure, references
- `README.md` — minor updates

---

### Open items for future sessions

- **Emotion detection on OpenRouter** — registry now supports it as a one-line addition to `openrouter.ts` + a registry entry. Not done because the user didn't ask. Same for Custom (would need a `hasEmotionSupport` toggle following the `hasSTTSupport`/`hasTTSSupport` precedent).
- **Typing-speed UX** — user's reference CLI uses 30ms/char; Athena reveal pacing not yet measured. Future polish item.
- **`lib/constants.ts` size** — file is approaching ~600 lines after the i18n + OpenRouter additions. Possible future split (per-feature constant modules) if it crosses a comfort threshold.
- **Groq pre-flight tool detection dedup** — already-investigated micro-optimization. Revisit only if another provider gains pre-flight detection, or if the Groq vision-bug fires in practice.
- **Multi-tab locale/gender sync** — current custom-event mechanism is single-tab. `BroadcastChannel` upgrade if multi-tab sync becomes a real requirement.
- **Translation coverage audit** — 22+ components migrated, but no automated check that every user-visible string flows through `t()`. A lint rule or test would catch regressions.

---

## Session 32: PWA fixes, README restructure, AI framework improvements (04/18/2026)

### Overview

Mixed session covering PWA manifest fixes, README restructure with collapsible sections, AI framework session init improvements with Karpathy-inspired execution rules, and documentation updates.

---

### 1. PWA Manifest Fixes

Resolved all Chrome/Chromium installability warnings:
- Icons updated from JPG to PNG with correct `type: "image/png"` and accurate `sizes` values
- `purpose: "any maskable"` (discouraged combined form) split into separate `"any"` and `"maskable"` entries
- `icon-512x512-maskable.png` created via GIMP canvas expansion (10% safe zone padding on all sides)
- Screenshots updated with dedicated `athena-desktop.png` and `athena-mobile.png` files — correct `wide` and `narrow` form factors with labels
- Desktop screenshot aspect ratio fixed: Chrome enforces width cannot exceed 2.3x the height — `1348x577` (ratio 2.337) cropped to `1280x548` (ratio 2.336 — still borderline) and resolved through further iteration

**Install prompt now appears correctly in Chrome/Chromium address bar.**

---

### 2. README.md Restructure

README reduced from 557 lines to ~320 lines (44% reduction):
- Hero section with side-by-side desktop + mobile screenshot table
- Emoji section headers for visual scanning (`🧠`, `🚀`, `🔑`, `🎭`, `🔒`, etc.)
- Four `<details>` collapsible sections: Vision & Design Philosophy, LLM Provider Architecture, Project Structure tree, Development Philosophy compliance matrix
- New "AI Framework" section between Contributing and Credits referencing [Jiab77/ai-framework](https://github.com/Jiab77/ai-framework) and the Virgil project
- Duplicate provider information and exhaustive inline file tree comments moved into collapsibles

---

### 3. AI Framework — Session Init Improvements

`MEMORY.md` restructured with a prominent Session Init block at the top (before session history):
- Four-step init sequence: read MEMORY.md → AGENTS.md → SOUL.md → HUMAN.md → TEAM.md
- Four Karpathy-inspired execution rules embedded inline with attribution to [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)
- Key documents reference table added
- Misleading "doesn't consume context window" wording corrected to "restores project continuity without repeating past mistakes or redoing completed work"

**Key insight from session:** Rules alone do not prevent violations — the most effective enforcement is in-the-moment checkpoints (before/after reviews, asking before touching). Embedding rules where the AI is already motivated to read (MEMORY.md) is more reliable than a separate instruction file.

---

### 4. HUMAN.md Template Published

`HUMAN.md` template created and published to [Jiab77/ai-framework](https://github.com/Jiab77/ai-framework) repo:
- All fields optional — note added that it is not a strict format
- Privacy warning prominent at the top
- Actual `HUMAN.md` is gitignored to protect OPSEC

---

### 5. Karpathy Framework Comparison

Reviewed [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) `CLAUDE.md` against [AI Framework](https://github.com/Jiab77/ai-framework):
- Karpathy: 4 tight behavioral rules targeting specific LLM failure modes
- AI Framework: stronger on memory continuity, human context, collaboration model
- Conclusion: frameworks are complementary — Karpathy covers behavioral discipline, AI Framework covers context and memory
- Attribution added to all derived work — proper credit, not reputation borrowing

---

## Session 31: Kai-inspired redesign discussion, REDESIGN.md created (04/17/2026)

### Overview

Session 31 was a discussion-only session. No code was changed. The focus was reviewing the [Kai](https://github.com/SimonSchubert/Kai) / [kai9000.com](https://kai9000.com) project and identifying what can improve Athena's UX and feature set.

### Key Decisions

- A dedicated `docs/REDESIGN.md` was created to hold the design discussion (not `ROADMAP.md`, which is kept clean and phase-structured)
- `MEMORY.md` updated with a key documents reference table pointing to all major project docs

### What REDESIGN.md Covers

1. **Chat-first UX redesign** — chat becomes full-screen primary surface, companion becomes a draggable floating overlay anchored top-right with a pop-out button. Several Session 29/30 open items become irrelevant if this is implemented (items 3, 5, 8).
2. **Persistent memory system** — Kai-inspired `memories` IndexedDB store with `hitCount`, promotion to system prompt, `remember()` / `recall()` tools, per-companion memory bank, hybrid (LLM + user) approach. Heartbeat deferred.
3. **PWA install prompt** — being handled independently by Jiab77.
4. **Other Kai features** — multi-provider fallback chain, session prompt override, web search (full — both OpenAI via Responses API and Groq via compound-beta), MCP (future), AI-generated UI screens (not planned).

### Impact on Session 29/30 Open Items

Items that remain relevant regardless of redesign: 1, 2, 6, 7, 11, 13, 14, 15, 16, 17.
Items that become irrelevant if redesign is implemented: 3, 5, 8.
Items to reassess after redesign scope is finalized: 4, 9, 10, 12.

### Status

> `docs/REDESIGN.md` is under active discussion. No implementation started.

---

## Session 30: BioLLM document upload, markdown table rendering, file picker fix, emoji picker race condition (04/17/2026)

### Overview

Session 30 focused on feature parity for BioLLM, markdown rendering improvements, and two bug fixes — one around file type filtering in the browser file picker, and a long-standing emoji picker race condition on desktop.

---

### 1. BioLLM Document Attachment Support

`biollm.ts` now supports text document file uploads using the same `escapeDocumentContent()` pattern already used in `groq.ts` and `custom.ts`. Document content is injected as a fenced code block inside the message content. Image attachments are intentionally not implemented — BioLLM is text-only hardware. The docstring was updated to reflect the change. The full chain from `chat-interface.tsx` through `router.ts` to `biollm.ts` was confirmed complete — no props, routing, or UI changes were needed since document data travels naturally through the existing `Message` type.

**Lesson learned:** When an identical pattern already exists and works, copy it exactly — do not reinterpret or rewrite it.

---

### 2. Markdown Table Rendering — `remark-gfm` Added

`markdown-message.tsx` was missing `remark-gfm` which is required for GitHub Flavored Markdown table support. Without it, `| col |` syntax rendered as raw pipe characters. Fixed by:
- Adding `remark-gfm` to `remarkPlugins` (already in `package.json`, no new dep needed)
- Adding styled `table`, `thead`, `tbody`, `tr`, `th`, `td` component overrides using semantic design tokens

Full markdown renderer audit also addressed:
- Deprecated `inline` prop on `code` — split into separate `code` and `pre` overrides, `className` used to detect block vs inline
- Language label displayed above fenced code blocks
- `h4`, `h5`, `h6` added
- `hr` added
- `img` added with `max-w-full rounded-md` styling
- `del` (strikethrough via `~~text~~`) added
- `li` spacing improved with `mb-1`

---

### 3. File Picker — Browser MIME Type Inconsistency Fix

The `accept` attribute on the file input was using only `DOCUMENT_FORMAT_MIME_TYPES` — browsers on Linux/Windows do not reliably associate `.md`, `.sh`, `.ts`, `.py` etc. with their MIME types, causing those files to be hidden in the picker.

**Fix:** Added `DOCUMENT_FORMAT_EXTENSIONS` constant to `lib/constants.ts` with explicit file extensions (`.md`, `.markdown`, `.ts`, `.tsx`, `.py`, `.sh`, etc.) and combined it with MIME types in the `accept` attribute:
```ts
accept={`image/*,${DOCUMENT_FORMAT_MIME_TYPES.join(',')},${DOCUMENT_FORMAT_EXTENSIONS.join(',')}`}
```
Issue confirmed resolved by user testing.

---

### 4. Emoji Picker Race Condition — Desktop Fix

**Root cause:** On first load, `@emoji-mart/data` and `emoji-mart` took ~1.5s to import. `<em-emoji-picker>` mounted immediately when `isOpen` became true and rendered with no data (showing only the flags category). `em.init()` completed 1.5s later but the component had already rendered. On mobile the modules were already cached so `em.init()` completed synchronously before mount — which is why mobile always worked.

Previous fix attempts (`window.EmojiMart` removal, `customElements.whenDefined`) did not address the root cause.

**Correct fix:**
- `useEffect` dependency changed from `[isOpen]` to `[]` — data loading starts on component mount, independent of `isOpen`
- `dataReady` state added — set to `true` only after `em.init()` resolves
- `<em-emoji-picker>` now only mounts when `isOpen && dataReady` — guarantees data is always populated before the component renders
- Debug logs removed after issue confirmed resolved

Issue confirmed resolved by user testing.

---

### Open Items Carried Forward to Session 31

1. **`lib/chat.ts` creation** — extract `sendMessage()`, `loadConversation()`, `newConversation()`, `processFile()` from `chat-interface.tsx`
2. **`lib/llm/brain.ts` state extraction** — `isLoading`, `isSpeaking`, `isPlayingTTS`, `ttsAudioControls`, `replayingMessageId`, `tokenUsage`, `memorySize`, `memoryWindowSize`, `isTranscribing`, `isRecording`
3. **`expressionState` dual source conflict** — `useBrain()` and `ChatInterface` both drive it simultaneously
4. **Emotion display logic** — review and fix
5. **Processing / Speaking display logic** — review and fix
6. **Mic button disabled while AI is speaking**
7. **Speaker button becomes Stop button while AI is speaking**
8. **`/app/companion/[id]/page.tsx` full review / rewrite**
9. **Visual formats logic / rendering full review / rewrite**
10. **Runway-based `live-avatar` implementation**
11. **CSP header still missing**
12. **Popup live-sync** — `BroadcastChannel`, deferred
13. **`DEBUG_MODE` constant + `debugLog()` utility** — priority
14. **`thinking` state universal** — all providers show thinking state during inference
15. **Model capabilities display** — hybrid: dropdown icons + settings panel active model summary
16. **BioLLM tool detection via `gpt-5.4-nano`** — deferred until base integration stable
17. **`EMOTION_CONFIG` duplication** — move from both avatar components to `constants.ts`

---

## Session 29: JSON parsing cleanup, API key pattern fix, emotions.ts rewrite, component architecture audit (04/12/2026)

### Overview

Session 29 was a focused code quality and architecture session. Main themes: removing unnecessary JSON parsing from all non-Groq providers, fixing a critical API key reading pattern bug across the codebase, rewriting `emotions.ts` properly, adding gender to emotion detection, standardising `sttSupported` as a single source of truth in `brain.ts`, and a full component architecture audit confirming Option A (props-driven) as the official pattern.

---

### 1. JSON Parsing Removed from Non-Groq Providers

**Root cause:** JSON parsing (`parseCompanionJSON`) was added for Groq (which needs `response_format: json_object`) and incorrectly applied to all providers.

**Files changed:**
- `lib/llm/biollm.ts` — `parseCompanionJSON` removed, `content` returned directly from `choices[0].message.content`. `useProxy` flag and dead `if/else` fetch block removed. `app/api/biollm/route.ts` deleted (proxy no longer needed)
- `lib/llm/openai.ts` — `inputBase` with forced JSON system message removed (`input` now points directly to `userMessages`). `parseCompanionJSON` try/catch replaced with direct `content` return. `reasoning` extracted from `output` array and logged for future UI use
- `lib/llm/custom.ts` — `response_format: { type: 'json_object' }` removed. JSON parse try/catch removed, `content` returned directly
- `lib/llm/groq.ts` — unchanged, still uses JSON mode correctly

**`buildSystemPrompt` in `lib/utils.ts`:**
- `useNewPrompt` boolean replaced with `forceJSON = false` parameter
- `oldPrompt` (with JSON instructions) returned when `forceJSON = true`, `newPrompt` (plain prose) when `false`
- `groq.ts` explicitly passes `true`, all other providers use default `false`
- TODO comment removed

---

### 2. API Key Reading Pattern — Critical Fix

**The bug:** `db.getAPIKey()` returns `StoredAPIKey | null` (an encrypted object), NOT the decrypted string. Code in `router.ts` and `emotions.ts` was passing this object directly to `Authorization: Bearer ${apiKey}` — producing `Bearer [object Object]`.

**The correct pattern (already used in all LLM provider files):**
- `db.checkAPIKey(provider)` — existence check only, returns `StoredAPIKey | null` (renamed from `db.getAPIKey()` via editor refactor)
- `getAPIKey(provider)` from `utils.ts` — returns the actual decrypted string for use in `fetch()` calls

**Files fixed:**
- `lib/llm/router.ts` — `transcribeAudio()` and `supportsSTT()` now use `db.checkAPIKey()` for existence, `transcribeOpenAI`/`transcribeGroq` handle their own key reading internally. `throw new Error` replaced with `console.warn` + `Promise.reject` for graceful STT degradation
- `lib/llm/emotions.ts` — fully rewritten (see below)
- `db.ts` — `getAPIKey()` renamed to `checkAPIKey()` across all call sites via editor refactor

---

### 3. `emotions.ts` — Full Rewrite

**All TODO/FIXME/TEST comments and dead code removed.**

**Key fixes:**
- `db.checkAPIKey('openai')` / `db.checkAPIKey('groq')` for existence checks only
- `getAPIKey(isOpenAI ? 'openai' : 'groq')` from `utils.ts` for the decrypted key used in `Authorization: Bearer`
- Early `console.warn` + `return { emotion: null }` when neither key is configured — no error thrown, no broken fetch call
- OpenAI always takes priority over Groq for emotion detection

**Gender added to emotion detection:**
- `buildEmotionSystemPrompt()` now accepts `avatarGender: GenderType` as third parameter
- `GENDER_MAPPING` imported from `constants.ts`
- Gender included in both the identity line and the analysis instruction of the emotion prompt
- Caller reads `settings?.avatarGender` with `DEFAULT_GENDER` fallback

---

### 4. `sttSupported` — Single Source of Truth in `brain.ts`

**Problem:** `chat-interface.tsx` was managing its own duplicate `sttSupported` state and calling `supportsSTT()` independently — inconsistent with `companion-window.tsx` and `companion-popup-view.tsx` which received it from `brain.ts`.

**Fix:**
- `brain.ts` — `supportsSTT` imported from `router.ts`, `useState(true)` → `useState(false)` (safe default), new `useEffect` calls `supportsSTT()` on mount and re-checks on `settings-changed` events
- `chat-interface.tsx` — own `sttSupported` state removed, own `useEffect` removed, `supportsSTT` import removed, `sttSupported` added to props interface, consumed from prop
- `merged-companion-chat.tsx` — `sttSupported={sttSupported}` added to both mobile and desktop `ChatInterface` instances

---

### 5. Component Architecture Audit — Option A Confirmed

**Decision:** Props-driven (Option A) is the official pattern. `brain.ts` owns all business logic state. UI components are dumb — they only receive props and render.

**Findings from audit:**
- No component was fetching its own data autonomously — architecture was already mostly correct
- Wrong default values fixed:
  - `companion-window.tsx` — `sttSupported = true` → `false`
  - `companion-popup-view.tsx` — `sttSupported = true` → `false`
  - `r3f-animated-character.tsx` — `isOnline = true` → `false` (backlog #9 resolved)
  - `avatar-2-5d.tsx` — `isOnline = true` → `false` (backlog #9 resolved)
- Debug logs removed from `companion-popup-view.tsx` and `r3f-animated-character.tsx`
- `EMOTION_CONFIG` duplicated in both avatar components — noted as tech debt, not yet moved to `constants.ts`

---

### 6. `chat-interface.tsx` Refactor — Scoped Plan

`chat-interface.tsx` is 1091 lines because it mixes business logic (LLM calls, DB reads/writes, file processing) with JSX. Agreed plan:
- **Next session:** Extract business logic to `lib/chat.ts` only — `sendMessage()`, `loadConversation()`, `newConversation()`, `processFile()`
- **Follow-up session:** Move business state (`isLoading`, `isSpeaking`, `tokenUsage`, etc.) from `chat-interface.tsx` to `brain.ts`
- JSX left completely untouched until both extractions are done and tested

**Key design decision for `lib/chat.ts`:** exported async functions (not hooks), accept a `db` instance, return data. Component stays in charge of its own state.

---

### 7. Companion Window Mic Button — Always Visible

`companion-window.tsx` was hiding the mic button entirely when `sttSupported` was `false`. Fixed to always render the button, matching `chat-interface.tsx` pattern — disabled with `opacity-50 cursor-not-allowed` and tooltip "STT not available for this provider" when STT is unavailable.

---

### 8. `brain.ts` — Broken `shouldDetectEmotion` Guard Removed

**The bug — `brain.ts` LLM pipeline:**
```ts
const bioSettings = await db?.getSettings().catch(() => null)
shouldDetectEmotion = !!(bioSettings?.openaiApiKeyEncrypted || bioSettings?.groqApiKeyEncrypted)
```
Same root cause as `emotions.ts` — `StoredSettings` has no `*ApiKeyEncrypted` fields, so both checks always returned `undefined` → `false`, silently disabling emotion detection for BioLLM always.

**Fix:** Removed `shouldDetectEmotion` guard entirely. `detectEmotion()` is now called unconditionally for all providers — `emotions.ts` already returns `{ emotion: null }` with `console.warn` when no keys are configured, making the guard redundant.

**Lesson learned:** This bug was introduced by guessing at field names instead of reading the existing DB schema and patterns first. Read before writing — no exceptions.

---

### 9. `VoiceState` Duplicate Removed

`brain.ts` was exporting its own `export type VoiceState` while `lib/types.ts` already had the canonical definition. Duplicate removed from `brain.ts` by Jiab77 — `lib/types.ts` is the single source of truth.

---

### 10. Tooltip on Disabled Buttons — Radix UI Fix

**Problem:** Disabled HTML elements do not fire pointer events — `onMouseEnter` never reaches `TooltipTrigger`, so tooltips never show on disabled buttons. Affected both mic buttons in `chat-interface.tsx` and `companion-window.tsx`.

**Fix:** Wrapped the disabled `Button` in a `<span tabIndex={0}>` inside `TooltipTrigger asChild`. The span receives pointer events normally, triggering the tooltip. `pointer-events-none` added to the button to prevent click leaking. This is the standard Radix UI recommended pattern for tooltips on disabled elements.

---

### 11. Speaker Button Toggle Fixed

`chat-interface.tsx` had `disabled={isLoading || !voiceOutputEnabled}` on the speaker button — disabling it when voice was OFF, making it impossible to turn voice back ON. Fixed by Jiab77 by removing `|| !voiceOutputEnabled` from the `disabled` prop. `companion-window.tsx` and `companion-popup-view.tsx` were not affected.

---

### 12. README.md — Getting Started and Usage Sections

Added a proper `Getting Started` section (prerequisites, installation, minimum viable setup) and a full `Usage` section covering: provider configuration table, companion creation, STT/TTS setup, BioLLM setup, custom provider setup, popup/companion window, and memory window. Stale `parseCompanionJSON()` reference in the compliance table updated. Written collaboratively — Jiab77 corrected and improved the UI navigation descriptions to match the actual settings panel structure.

---

### Open Items Carried Forward to Session 30

1. **`lib/chat.ts` creation** — extract `sendMessage()`, `loadConversation()`, `newConversation()`, `processFile()` from `chat-interface.tsx`
2. **`lib/llm/brain.ts` state extraction** — `isLoading`, `isSpeaking`, `isPlayingTTS`, `ttsAudioControls`, `replayingMessageId`, `tokenUsage`, `memorySize`, `memoryWindowSize`, `isTranscribing`, `isRecording`
3. **`expressionState` dual source conflict** — `useBrain()` and `ChatInterface` both drive it simultaneously
4. **Emotion display logic** — review and fix
5. **Processing / Speaking display logic** — review and fix
6. **Mic button disabled while AI is speaking**
7. **Speaker button becomes Stop button while AI is speaking**
8. **`/app/companion/[id]/page.tsx` full review / rewrite**
9. **Visual formats logic / rendering full review / rewrite**
10. **Runway-based `live-avatar` implementation**
11. **CSP header still missing**
12. **Popup live-sync** — `BroadcastChannel`, deferred
13. **`DEBUG_MODE` constant + `debugLog()` utility** — priority
14. **`thinking` state universal** — all providers show thinking state during inference
15. **Model capabilities display** — hybrid: dropdown icons + settings panel active model summary
16. **BioLLM tool detection via `gpt-5.4-nano`** — deferred until base integration stable
17. **`EMOTION_CONFIG` duplication** — move from both avatar components to `constants.ts`

---

## Session 28: BioLLM Fixes, Emotion detection dirty fix, Structured format debugging (04/06/2026)

### Overview

The human fixed some BioLLM related implementation bugs + updated model settings and finally made it working.

But several issues has been detected that needs to be fixed urgently:

1. The emotion detection model routing must be rewriten to avoid raison errors when no model keys has been defined, simply raise a warning instead of remain silent?
2. Forcing all models to follow our JSON structured output creates more issues than it solves.
3. We must remove the forced JSON structure output or make it optional with a booleanm.
4. The dedicated API route for BioLLM can be removed, it's totally useless as I could make it work without using it.

---

### 1. BioLLM fixes

- `/lib/llm/biollm.ts` — Disabled API route/proxy, fixed response handling

### 2. Emotion detection dirty fix

- `/lib/llm/emotions.ts` — Dirty fix of the model selection mess
- `/lib/constants.ts` — Added missing `DEFAULT_EMOTION_DETECTION_PROVIDER` constant

### 3. Structured format debugging

- `/lib/utils.ts` — Simply added a `TODO` note about making the forced JSON output optional in the `buildSystemPrompt` function

### Additional Open Items For Session 29

Check all `TODO:`, `FIXME:` and `TEST:` lines in the whole codebase.

---

## Session 27: BioLLM Integration, OWASP 2025 Audit, Documentation Overhaul (04/04/2026)

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

### 7. Late-Session Additions

**Footer credit added to landing page (`app/page.tsx`):**
- Non-fixed, relative footer at the very bottom of page content
- Text: "Athena is made with ❤️ by Jiab77 and v0"
- Athena links to `https://github.com/Jiab77/athena`
- Jiab77 links to `https://github.com/Jiab77`
- v0 links to `https://v0.dev`
- `relative` Tailwind class required for visibility (position: relative)

**`hooks/use-connection-status.ts` — debug log cleanup:**
- Removed `console.log` that was firing outside `useEffect` (was causing `[SERVER]` log and router initialization error during SSR/hot reload)
- Removed remaining `[v0]` debug logs inside `useEffect`
- `catch (error)` simplified to `catch` since error variable was only used in removed log

**OPSEC reminder for `MEMORY.md`:**
- File is now public — never document implementation details of third-party integrations (tunnel type, infrastructure specifics, etc.)
- Only document our own implementation (proxy pattern, feature flags, API shape)
- Kerckhoffs applies to our code, not to our friends' business logic

**`Router action dispatched before initialization` error:**
- This error fires on EVERY hot reload in the v0 preview environment — it is an environment artifact, not a code bug
- Confirmed by: error fires immediately after `Reload env: .env.development.local`, app still works (`GET / 200`), no `[SERVER]` log in latest builds
- Do NOT touch code when this error appears — always read the debug logs first and check if it is a stale cache/hot reload artifact

---

### Open Items Carried Forward to Session 29

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
- Fix: assistant messages return early with `[{ type: 'output_text', text: msg.content }]` �� no image re-attachment, correct content type
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
