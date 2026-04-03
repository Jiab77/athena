# Implementation Status

Last updated: 2026-04-03 — Session 27

---

## Phase 1 — MVP (Complete)

### Infrastructure & Architecture
- [x] Next.js 16 + shadcn/ui + Tailwind CSS v4 setup
- [x] IndexedDB schema (`lib/db.ts`) — stores: companions, conversations, apiKeys, userPreferences
- [x] TweetNaCl.js + AES-GCM + PBKDF2 encryption utilities (`lib/crypto.ts`)
- [x] Device-derived key generation (`lib/device-id.ts`)
- [x] Encrypted API key storage and runtime decryption
- [x] Encrypted conversation history with full export/import
- [x] Conversation memory windowing
- [x] PWA support (service worker, offline capability)
- [x] IndexedDB provider/context (`lib/db-context.tsx`)

### UI / UX
- [x] Floating Action Button (FAB) with expandable menu
- [x] Settings panel — companion, model, voice, privacy, import/export (6 collapsible sections)
- [x] Companion creation — 30 avatars (5 categories × 2 genders × 3 color schemes)
- [x] Companion customization — personality presets, custom traits, visual format selector
- [x] Chat interface with message display, input, send, auto-scroll, timestamps
- [x] Token usage display
- [x] Markdown message rendering (`components/markdown-message.tsx`)
- [x] File/document attachment (PDF, TXT, DOCX, CSV, XLSX, etc.)
- [x] Image attachment with vision
- [x] Generated image display (inline, with download overlay)
- [x] Popup / companion window mode (`/app/companion/[id]`, `/app/chat/[id]`)

### LLM
- [x] LLM provider abstraction — `lib/llm/router.ts`
- [x] OpenAI provider — Responses API, `tool_choice: 'auto'`, `store: false`
- [x] OpenAI image generation — `image_generation` tool, inline rendering
- [x] OpenAI web search — `web_search` tool (native)
- [x] Groq provider — pre-flight tool detection (`compound-mini`), vision, URL detection
- [x] Custom provider — any OpenAI-compatible endpoint
- [x] Emotion detection — `lib/llm/emotions.ts` (OpenAI + Groq)
- [x] System prompt builder — `buildSystemPrompt()` with personality, gender, companion name
- [x] JSON response parsing — `parseCompanionJSON()` with plain text fallback

### Voice
- [x] STT — Groq Whisper (`whisper-large-v3-turbo`)
- [x] STT — OpenAI Whisper (`whisper-1`)
- [x] TTS — OpenAI (`gpt-4o-mini-tts`) with voice instructions + URL suppression
- [x] TTS — ResembleAI (`chatterbox`) with SSML
- [x] Mic recording and audio blob handling

### Avatar / Visual
- [x] Static 2D avatar rendering
- [x] Animated 2D avatar (CSS-based, `avatar-animated-2d.tsx`)
- [x] React Three Fiber (R3F) 3D avatar (`r3f-animated-character.tsx`)
- [x] Decart AI live avatar SDK integration (`lib/avatar/decart.ts`)
- [x] Avatar format selector — static 2D / animated 2D / R3F 3D / live avatar

---

## Phase 2 — Quality & Hardening (In Progress)

### Active
- [ ] `expressionState` dual source conflict — `useBrain()` and `ChatInterface` both drive expression state

### Pending
- [ ] Emotion display logic — review and fix
- [ ] Processing / Speaking display logic — review and fix
- [ ] Mic button disabled while AI is speaking
- [ ] Speaker button becomes Stop button while AI is speaking
- [ ] `isOnline = true` wrong default in `r3f-animated-character.tsx` and `avatar-2-5d.tsx`
- [ ] `/app/companion/[id]/page.tsx` full review / rewrite
- [ ] Visual formats logic / rendering full review / rewrite
- [ ] `DEBUG_MODE` constant + `debugLog()` utility (`constants.ts` + `lib/utils.ts`)
- [ ] Content Security Policy (CSP) header
- [ ] Input validation on user message content (Zero Trust gap)
- [ ] `chat-interface.tsx` refactor — 1100+ lines, KISS violation
- [ ] Remove try/catch control flow in `parseCompanionJSON()` and `import.ts`
- [ ] Global error boundary component
- [ ] `tweetnacl` library upgrade / replacement (unmaintained since 2019)
- [ ] SBOM / dependency audit process

---

## Phase 3 — Advanced Features (Planned)

- [ ] Runway-based live avatar implementation (alongside Decart)
- [ ] Popup live-sync via `BroadcastChannel`
- [ ] RAG context injection (local personality data files)
- [ ] Claude provider integration
- [ ] Offline STT/TTS (VOSK / MaryTTS)
- [ ] Multi-device sync (opt-in, E2E encrypted)

---

## Phase 4 — Desktop & Local AI (Future)

- [ ] Tauri desktop app (always-on-top, system tray, hot-word wake-up)
- [ ] Local LLM support (Ollama / LM Studio)
- [ ] Local fine-tuning (QLoRA / LoRA with user personality data)
- [ ] Federated learning (privacy-preserving, on-device)
- [ ] Hardware requirement detection
