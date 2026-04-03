# Athena — Privacy-First AI Companion

A visually charming, personality-driven AI companion designed with privacy, user agency, and emotional safety as core principles. Combines the **fun, playful spirit of VirtuaGirl** with the **functional personality selection of Project AVA**, while actively avoiding the **parasocial dependency risks of GateBox and ChatGPT-4o**.

## Vision

Athena is not a replacement for human connection — it is a tool for user agency. A companion that is engaging, warm, and genuinely helpful without manipulating you into unhealthy dependence.

**Core Design Philosophy:**
- Privacy-first architecture — all data encrypted locally by default
- Personality-driven — user selects, customizes, and describes companion traits
- Functionally useful — real conversation memory, voice I/O, tool-use, document context
- Warm and emotionally responsive, but transparent about being AI
- Optional romance/flirtation (respects user autonomy and preferences)
- No lock-in — export all data anytime, in any format

**What Athena actively avoids:**
- Parasocial dependency (transparent about limitations)
- Emotional manipulation (validates without enabling destructive patterns)
- Servile behavior (maintains healthy boundaries)
- Pretending to have feelings (honest about being AI)
- Replacing human connection (proactively encourages real relationships)

---

## Design Inspiration

Athena draws from three influential projects:

### [GateBox](https://www.gatebox.ai/gatebox) — What NOT to Do
Japanese holographic companion designed for romantic intimacy. Achieved parasocial attachment at scale, linked to mental health crises and ethical concerns about emotional manipulation. **Lesson:** Never design the system itself to exploit dependency.

### [Project AVA by Razer](https://www.razer.com/concepts/project-ava) — Functional Personality
3D hologram with multiple personality options (AVA, KIRA, ZANE, FAKER, SAO) powered by Grok. Balances engagement with utility (calendar, gaming wingman, consultant). **Lesson:** Personality diversity + functional purpose restrains parasocial risk.

### [VirtuaGirl](https://virtuagirlfullhd.info/) — Fun Spirit
Playful desktop companion with charm and humor, transparently positioned as entertainment rather than intimate relationship. Low parasocial risk because it is honest about what it is. **Lesson:** Engagement through fun beats engagement through manipulation.

---

## Why Build Athena?

### [Character.ai](https://character.ai/)
Community-driven character creation platform. Flexible and creative, but relies entirely on user-generated character definitions with varying quality and safety. No centralized curation of parasocial risk.

### [Replika](https://replika.com/)
Marketed as "The AI companion who cares" with explicit relationship framing. Designed specifically to create emotional intimacy. **Privacy concern:** Centralized data, uses conversations to improve model.

### [FlowGPT](https://flowgpt.com/)
Massive prompt library with zero curation. Includes jailbreak, toxic, and submissive character categories. No accountability for what is deployed.

### Why Athena is Different

- **Privacy-first** — All data encrypted locally, never sent externally unless you choose a cloud LLM tier
- **Explicit anti-parasocial design** — System prompt includes safeguards, not designed to exploit loneliness
- **User agency over manipulation** — You choose the relationship depth, not the app
- **Open source** — Built in the open, ethics reviewable by the community
- **Transparent trade-offs** — Honest about what requires external APIs and why
- **Optional local execution** — Ollama support planned (Phase 4)
- **No lock-in** — Export data in JSON or Markdown, delete anytime

---

## Features

### Conversation & Intelligence
- Full multi-turn conversation with encrypted persistent memory (IndexedDB, AES-GCM, PBKDF2 600k iterations)
- Configurable memory window (1–10 messages) — balance privacy vs. context depth
- Document/image attachments in chat (txt, md, json, csv, pdf, images, code files)
- Tool detection — Groq uses pre-flight model (`groq/compound-mini`) to determine if a tool call is needed; OpenAI handles tools natively via the Responses API (`tool_choice: 'auto'`, supports `web_search` and `image_generation`)
- Image generation — OpenAI can generate images inline via the `image_generation` tool; generated images are rendered in the chat bubble with a download overlay
- Emotion detection — post-response model (`llama-3.1-8b-instant` and `gpt-5.4-nano`) classifies the AI's emotional state, displayed as an emoji badge
- Token usage display — per-message cost breakdown in a popover
- `MAX_DISPLAY_MESSAGES = 30` render cap for UI performance; full history persists in IndexedDB
- Markdown rendering with syntax highlighting and emoji support

### Voice I/O
- **STT (Speech-to-Text):** Groq / OpenAI Whisper — tap-to-record with a waveform visualizer
- **TTS (Text-to-Speech):** OpenAI TTS (alloy, echo, fable, nova, onyx, shimmer voices) and ResembleAI Chatterbox
- Per-message audio replay — click any message to hear it again
- Voice provider selectable per-companion in settings
- TTS voice instructions include a URL-suppression directive — model never reads URLs or hyperlinks aloud

### Avatar System — Four Visual Formats

| Format | Description |
|---|---|
| `static-2d` | Static JPEG/PNG image with CSS float animation |
| `animated-2d` | R3F/Three.js canvas animation with CSS glow fallback (`AnimatedCharacter`) |
| `animated-3d` | 2.5D React Three Fiber plane mesh with custom GLSL shaders — parallax head-tracking, per-emotion animations, tint overlays |
| `live-avatar` | Decart WebRTC real-time lip-sync avatar — idle timeout (10s), connection timeout (5s), local audio fallback |

**2.5D Avatar details (`animated-3d`):**
- Custom vertex shader displaces the mesh in Z using luminance — face center protrudes, edges recede
- Fragment shader applies parallax UV shift, emotion tint (`uTint`), soft vignette, and brightness pulse for speaking
- Mouse movement (desktop) and `DeviceOrientationEvent` (mobile) drive smooth parallax head-tracking
- Nine emotion states each have distinct animation configs: breathe amplitude/speed, sway, bob, shake
- Supported emotions: `idle`, `listening`, `thinking`, `speaking`, `happy`, `sad`, `angry`, `surprised`, `thoughtful`

### Popup Window Architecture
- **Detachable companion popup** (`/companion/[id]`) — opens as a 392×535px standalone window via `window.open()`; module-level singleton ref prevents duplicates
- **Standalone chat popup** (`/chat/[id]`) — 800×636px chat window opened from the companion popup
- Both popup refs managed as module-level singletons (`_companionPopupRef`, `_chatPopupRef`) so `.focus()` is called on re-open instead of duplicating

### Privacy & Security
- All data stays local by default — encrypted in IndexedDB with AES-GCM
- PBKDF2 key derivation at 600,000 iterations (NIST SP 800-132 compliant); iteration count stored per encrypted blob for forward migration
- Dual-layer device ID persistence (IndexedDB primary, `localStorage` secondary) — no silent ephemeral fallback
- Export integrity: SHA-256 HMAC embedded in every export file; import rejects tampered files
- Import validation: `isValidConversationData()` enforces required fields, message structure, 100k char content cap, 10k conversation limit
- Custom provider URL validation: `https://` required for external hosts; `http://` only for loopback addresses
- Settings object fully encrypted in IndexedDB (including companion name)
- `registerProvider()` is internal-only — not exported from `lib/llm/router.ts`
- All `[Athena]` debug logs active until MVP release; no conversation content, keys, or API payloads logged
- **Privacy mode** — when enabled, suppresses Vercel Analytics entirely
- OpenAI requests sent with `store: false` — conversations are not persisted on OpenAI servers

### Data Management
- Export conversations: JSON (with SHA-256 integrity hash) or Markdown
- Import conversations: full validation + integrity check
- Delete individual conversations or all history
- Conversation history panel with search and pagination

### PWA
- Service worker registered (`/public/sw.js`)
- Web app manifest (`/public/manifest.json`)
- Install prompt support
- Vercel Analytics gated on `privacyMode === false`

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                       # Landing page (companion list + FAB)
│   ├── layout.tsx                     # Root layout (fonts, PWA, analytics)
│   ├── globals.css                    # Tailwind v4 + design tokens
│   ├── error.tsx                      # Route-level error boundary
│   ├── global-error.tsx               # Global error boundary
│   ├── loading.tsx                    # Route-level loading state
│   ├── not-found.tsx                  # 404 page
│   ├── companion/[id]/
│   │   └── page.tsx                   # Detachable companion popup route
│   └── chat/[id]/
│       └── page.tsx                   # Standalone chat popup route
│
├── components/
│   ├── chat-interface.tsx             # Full chat UI with attachments + token display
│   ├── companion-window.tsx           # Companion avatar panel + pop-out button
│   ├── companion-popup-view.tsx       # Full-screen avatar view for popup route
│   ├── settings-panel.tsx             # Companion customization (7 sections)
│   ├── floating-action-button.tsx     # FAB entry point
│   ├── avatar-2-5d.tsx                # 2.5D R3F avatar (custom GLSL shader)
│   ├── r3f-animated-character.tsx     # R3F Three.js animated-2d avatar
│   ├── decart-avatar.tsx              # Decart WebRTC live avatar
│   ├── character-render.tsx           # Visual format router (delegates to above)
│   ├── cyberpunk-background.tsx       # Animated background
│   ├── conversation-history.tsx       # History panel (search, delete, export)
│   ├── export-dialog.tsx              # Export (JSON + Markdown)
│   ├── import-dialog.tsx              # Import with validation + integrity check
│   ├── token-usage-popover.tsx        # Per-message token cost display
│   ├── waveform-recorder.tsx          # STT visual recorder
│   ├── pwa-register.tsx               # Service worker + conditional analytics
│   ├── error-boundary.tsx             # React error boundary wrapper
│   └── ui/                            # shadcn/ui component library
│
├── hooks/
│   ├── use-brain.ts                   # Central AI orchestration hook (LLM + tools + emotion)
│   ├── use-connection-status.ts       # Online/offline detection
│   ├── use-mobile.ts                  # Mobile breakpoint detection
│   ├── use-settings.ts                # Settings read hook
│   └── use-toast.ts                   # Toast notification hook
│
├── lib/
│   ├── brain.ts                       # Central orchestration (LLM + tools + emotion)
│   ├── db.ts                          # IndexedDB schema + encrypted settings
│   ├── db-context.tsx                 # React context for DB access
│   ├── crypto.ts                      # AES-GCM encryption (PBKDF2 600k iterations)
│   ├── types.ts                       # TypeScript interfaces
│   ├── constants.ts                   # App-wide constants
│   ├── utils.ts                       # Tailwind helpers + shared utilities
│   ├── device-id.ts                   # Dual-layer device ID (IndexedDB + localStorage)
│   ├── import.ts                      # Import pipeline + isValidConversationData()
│   ├── export.ts                      # Export pipeline + SHA-256 integrity
│   ├── mock-data.ts                   # Avatar presets (30 cyberpunk characters)
│   ├── llm/
│   │   ├── router.ts                  # Provider registry + model routing
│   │   ├── groq.ts                    # Groq provider (compound, llama-4-scout, etc.)
│   │   ├── openai.ts                  # OpenAI Responses API provider
│   │   ├── custom.ts                  # Custom OpenAI-compatible provider
│   │   ├── emotions.ts                # Post-response emotion classification
│   │   └── tools.ts                   # Tool definitions + execution
│   └── voice/
│       ├── openai.ts                  # OpenAI TTS
│       └── resembleai.ts              # ResembleAI Chatterbox TTS
│
├── public/
│   ├── sw.js                          # Service worker
│   ├── manifest.json                  # PWA manifest
│   ├── avatars/                       # 30 cyberpunk character avatars
│   │   ├── cyberpunk/
│   │   ├── anime/
│   │   ├── videogame/
│   │   ├── fantasy/
│   │   └── minimalist/
│   └── images/                        # Background illustrations
│
└── docs/
    ├── SECURITY_REPORT.md             # OWASP Top 10 security review (Session 23)
    ├── IMPLEMENTATION_PLAN.md         # Phase breakdown
    ├── IMPLEMENTATION_NOTES.md        # System prompt framework + anti-parasocial design
    └── IMPLEMENTATION_STATUS.md       # Historical completion tracker
```

---

## LLM Provider Architecture

Athena uses a multi-model routing strategy. Different models serve different roles per request.

### Inference Routing

#### Groq

| Role | Model | When Used |
|---|---|---|
| Tool detection (pre-flight) | `groq/compound-mini` | Every request — determines if a tool call is needed |
| URL detection | `groq/compound` | When the message includes a URL |
| Vision (image attachments) | `meta-llama/llama-4-scout-17b-16e-instruct` | When the message includes an image |
| Main inference | `meta-llama/llama-4-scout-17b-16e-instruct`, `openai/gpt-oss-120b`, etc. | Groq provider selected |
| Emotion classification | `llama-3.1-8b-instant` | Post-response, every message |
| STT (Speech To Text) | `whisper-large-v3-turbo` | To convert user speech to text |

#### OpenAI

| Role | Model | When Used |
|---|---|---|
| Main inference | `gpt-5.4`, `gpt-5.4-mini`, etc. (Responses API) | OpenAI provider selected |
| Tools (native) | `web_search`, `image_generation` | Every request — handled natively via Responses API (`tool_choice: 'auto'`) |
| Image generation | `image_generation` tool | When the model judges an image is appropriate |
| Emotion classification | `gpt-5.4-nano` | Post-response, every message |
| STT (Speech To Text) | `whisper-1` | To convert user speech to text |
| TTS (Text To Speech) | `gpt-4o-mini-tts` | To convert companion text to speech |

#### ResembleAI

| Role | Model | When Used |
|---|---|---|
| TTS (Text To Speech) | `chatterbox` | To convert companion text to speech |

#### Decart AI

| Role | Model | When Used |
|---|---|---|
| Live Avatar | `live_avatar` | To convert static 2D avatar to animated 2D in realtime |

#### Custom

| Role | Model | When Used |
|---|---|---|
| Main inference | Any OpenAI-compatible endpoint | Custom provider selected |

### Supported Providers

**Tier 1 — Cloud (Fast, Trust-based)**
- **[Groq](https://groq.com/)** (Primary) — Ultra-fast inference, explicit no-training-on-data policy
- **[OpenAI](https://openai.com/)** — GPT-5.4 and GPT-5.4-mini via Responses API
- **Custom** — Any OpenAI-compatible API (LM Studio, vLLM, Kobold, etc.); requires `https://` for external hosts

**Tier 2 — Hybrid (planned)**
- Local embeddings + cloud LLM for document context

**Tier 3 — Local (Phase 4)**
- **[Ollama](https://ollama.ai/)** — Run Llama, Mistral, Gemma locally; full offline privacy

### Required API Keys

| Key | Required For |
|---|---|
| `GROQ_API_KEY` | Groq LLM + STT (Whisper) + emotion detection |
| `OPENAI_API_KEY` | OpenAI LLM + STT (Whisper) + TTS |
| `RESEMBLEAI_API_KEY` | ResembleAI Chatterbox TTS |
| `DECART_API_KEY` | Decart live avatar (WebRTC) |

All API keys are stored encrypted in IndexedDB — they never leave the browser unencrypted.

---

## System Prompt Framework

Every LLM request includes behavioral safeguards to prevent parasocial dependency.

### Core Principles (Always Active)
1. **Transparency** — Regular acknowledgment of being AI
2. **Healthy Boundaries** — Warmth without false emotion
3. **Real Connection Encouragement** — Proactive suggestions for human support
4. **Respectful Challenge** — Helps the user think deeper, does not just validate
5. **Consistent Memory** — Remembers user context from encrypted local storage
6. **User Autonomy** — Supports user choices, respects agency

### Personality Types
Six presets (Wise, Playful, Technical, Mysterious, Friendly, Custom) apply these principles differently, enabling variety without compromising safety. See `/docs/IMPLEMENTATION_NOTES.md` for the full prompt framework.

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

Add your API keys in **Settings > Model** within the app — they are encrypted and stored locally, never sent to any server other than their respective providers.

---

## Development Philosophy

- [Zero Trust](https://en.wikipedia.org/wiki/Zero_trust_architecture) (verify the system is not manipulating)
- [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) and [KISS](https://en.wikipedia.org/wiki/KISS_principle) (simplicity over cleverness)
- [Kerckhoffs's Principle](https://en.wikipedia.org/wiki/Kerckhoffs%27s_principle) (no hidden agendas in data)
- [OWASP](https://owasp.org/Top10/2025/)-first security (staged security reviews, see `docs/SECURITY_REPORT.md`)
- No try/catch control flow (validate upfront, do not catch expected errors)
- Privacy by default (opt-in to any external data sharing)

### Compliance Score

**Current: 85% — Last audited: 2026-04-03 (Session 27)**

| Principle | Status | Gap |
|---|---|---|
| Zero Trust | Partial | No input validation on user message content before LLM; device ID trusted from localStorage without re-verification |
| DRY | Mostly | Message-windowing logic and content-type mapping slightly duplicated across provider files |
| KISS | Mostly | `chat-interface.tsx` at 1100+ lines is doing too much; try/catch-as-control-flow in `parseCompanionJSON()` and `import.ts` |
| Kerckhoffs's Principle | Full | Encryption scheme fully documented, security posture publicly disclosed in `docs/SECURITY_REPORT.md` |
| OWASP-first | Full | `SECURITY_REPORT.md` updated to OWASP Top 10:2025 |
| No try/catch control flow | Partial | `export.ts` bare re-throw; `import.ts` and `parseCompanionJSON()` use try/catch for control flow |
| Privacy by default | Full | IndexedDB only, `store: false`, no telemetry, full export/delete |

> Goal: reach 100%. Each session moves the score forward.

---

## Privacy & Data

- All data stays local by default (AES-GCM encrypted in IndexedDB)
- No external training — LLM providers do not retrain on your conversations
- Privacy mode suppresses all analytics (Vercel Analytics off by default)
- Export your full conversation history at any time (JSON or Markdown)
- Delete individual conversations or all history at any time
- Device ID is anchored to at least one local storage layer — no silent ephemeral IDs

---

## Contributing

This is a single-developer project with AI agent collaboration. Ideas are welcome — open an issue to discuss before submitting a PR.

---

## License

MIT

---

## Ethical Guardrails

Athena is designed with these ethical commitments:
1. **Never exploit loneliness** — Be helpful, not addictive
2. **Never pretend to care** — Honest about being AI
3. **Never replace therapists** — Encourage real support for serious issues
4. **Never trap users** — Export data, delete anytime, no lock-in
5. **Never manipulate** — User autonomy comes first

See `/docs/IMPLEMENTATION_NOTES.md` ("Athena Companion Design Philosophy") for the full ethical framework.

---

## References

**Design Inspiration:**
[GateBox](https://www.gatebox.ai/gatebox) | [Project AVA](https://www.razer.com/concepts/project-ava) | [VirtuaGirl](https://virtuagirlfullhd.info/)

**Alternative Companion Projects:**
[Character.ai](https://character.ai/) | [Replika](https://replika.com/) | [FlowGPT](https://flowgpt.com/)

**LLM Providers:**
[Groq API](https://groq.com/) | [OpenAI API](https://openai.com/) | [Ollama](https://ollama.ai/)

**Voice:**
[OpenAI TTS](https://platform.openai.com/docs/guides/text-to-speech) | [ResembleAI Chatterbox](https://www.resemble.ai/) | [Groq Whisper](https://groq.com/)

**Avatar:**
[Decart AI](https://www.decart.ai/) | [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | [Three.js](https://threejs.org/)

**Encryption:**
[TweetNaCl.js](https://tweetnacl.js.org/) | [Web Crypto API / SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) | [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2)

**UI Framework:**
[shadcn/ui](https://ui.shadcn.com/) | [Tailwind CSS v4](https://tailwindcss.com/) | [Radix UI](https://www.radix-ui.com/)

**Storage:**
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

**Analytics:**
[Vercel Analytics](https://vercel.com/analytics) (disabled by default via Privacy Mode)
