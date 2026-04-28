# OpenRouter — integration notes

Working document. Captures the decisions taken while wiring OpenRouter into
Athena so we don't re-litigate them. Will be deleted once the integration
work is done; durable history lives in `MEMORY.md`.

Audience: us, internal.

---

## What we use OpenRouter for

### Chat completions (implemented)

- Adapter: `lib/llm/openrouter.ts`, registered in `lib/llm/router.ts`.
- Endpoint: `POST https://openrouter.ai/api/v1/chat/completions` (plain
  OpenAI-compatible Chat Completions, **not** the Responses API).
- Auth: `Authorization: Bearer <OPENROUTER_API_KEY>`, stored encrypted via
  the standard `getAPIKey('openrouter')` flow.
- Optional headers: `HTTP-Referer` (set to `window.location.origin`,
  SSR-guarded) and `X-OpenRouter-Title: Athena`. They're cheap, they help
  OpenRouter attribute usage to us on their leaderboard, and the docs
  explicitly recommend them.

### Curated model list (implemented)

Static, six entries, in `LLM_PROVIDERS.openrouter.models` in
`lib/constants.ts`. The reasoning behind staying static instead of
fetching `/api/v1/models` at runtime:

- 300+ raw models is a paralysis dropdown. Curating to a handful means we
  control the display names, descriptions, and (eventually) which models
  carry which capability flags.
- Existing `LLMProvider` schema is shared by every provider. A
  lazy-loaded provider would fork the architecture (loading states,
  per-model capability detection, i18n metadata pulled from a third
  party). High effort, low payoff for our scale.
- Power users wanting a niche slug already have the **Custom** provider
  as the escape hatch (point it at `https://openrouter.ai/api/v1`).

If we ever want fresh slugs / pricing without going dynamic at runtime,
the right move is build-time tooling that reads `/models` and validates
our curated list. Not urgent.

### TTS via `/api/v1/audio/speech` (next, not yet implemented)

- The OpenRouter TTS endpoint is OpenAI-compatible and **separate** from
  chat completions, so it slots cleanly into the existing
  `TTSProvider` abstraction (alongside browser TTS, OpenAI TTS, etc.).
- Wins: more voice choices, single API key for chat + TTS, no
  architectural debt.
- This is the highest-leverage capability to add next; everything else
  in OpenRouter's surface is either redundant or out of product scope
  (see below).

### Vision and PDFs (already work)

- Both already supported in Athena via the standard message content
  blocks (`image_url`, file content). Plain Chat Completions means
  OpenRouter passes them through with no adapter changes.
- Action item before declaring "supported": quick verification pass
  with a vision-capable model (Claude / GPT / Gemini) and a PDF.

---

## What we deliberately don't use (and why)

### Audio inputs (`input_audio` content blocks)

Tempting as an STT fallback for providers without native Whisper. But
"send audio to a chat model and hope it transcribes" is strictly worse
than the existing OpenAI Whisper / Groq Whisper fallback pattern: slower,
less accurate, more expensive. Skip.

### Inline audio output (`modalities: ["text", "audio"]`)

Cool in isolation, but it competes with the existing TTS pipeline rather
than slotting into it. Two ways for the assistant to produce voice =
duplicated playback paths and decision fatigue. The `/audio/speech`
endpoint gives us the same voices through a clean abstraction. Skip
unless we ever want sub-second real-time voice (then the inline
streaming model becomes the better answer).

### Image generation

Not a question of capability — Athena isn't an image-generation app.
Adding it would mean defining a new product surface (where do images
appear, does the companion proactively generate them, how does
moderation work). That's a product conversation, not an OpenRouter
integration question. Out of scope here.

### Video inputs

Would require a new attachment type in the composer, browser-side base64
video encoding (memory-heavy), a new content block, per-model capability
detection. High effort, narrow benefit. Defer.

### Video generation

Async polling workflow, completely orthogonal to chat. Would need its
own UI, job queue, polling state. This is a separate product, not an
integration. Defer indefinitely unless it joins the roadmap.

### Dynamic model discovery (`/api/v1/models`)

Already covered in the curated-list reasoning above. Not a runtime
feature. Possibly a build-time tool later.

---

## Open questions / revisit triggers

| Item | Revisit when |
|---|---|
| Inline audio output (`modalities` array) | We want sub-second real-time voice latency that the `/audio/speech` round-trip can't deliver. |
| Build-time model discovery tooling | Curated slugs drift / pricing changes often enough that manual maintenance feels painful. |
| Per-model capability flags on `LLMProvider` | A second OpenRouter-style aggregator joins the project, or vision/STT/TTS need to be advertised in the UI per model. |
| `:online` web-search variants in the curated list | Per the side conversation we agreed to have separately. |

---

## Implementation status

- [x] Adapter file `lib/llm/openrouter.ts`
- [x] Router registration in `lib/llm/router.ts`
- [x] Curated model list in `LLM_PROVIDERS`
- [x] Optional attribution headers (`HTTP-Referer`, `X-OpenRouter-Title`)
- [ ] Verify vision passthrough end-to-end with a curated vision model
- [ ] Verify PDF passthrough end-to-end
- [ ] TTS provider entry using `/api/v1/audio/speech`
- [ ] User-facing review of curated slugs / descriptions
