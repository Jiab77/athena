# Roadmap

> For detailed implementation status, see [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md).

---

## Phase 1 — MVP (Complete)

Core architecture, encrypted local storage, multi-provider LLM (OpenAI, Groq, Custom), voice I/O (STT + TTS), image generation, document/image attachments, 2D/3D/live avatar rendering, companion creation and customization, popup window mode, PWA support.

---

## Phase 2 — Quality & Hardening (In Progress)

Fixing known UX and architecture issues before adding new features:

- Expression state conflict between `useBrain()` and `ChatInterface`
- Emotion and processing/speaking display logic
- Voice interaction improvements (mic disabled / stop button while AI is speaking)
- Avatar component state fixes (`isOnline` wrong default)
- `/app/companion/[id]/page.tsx` full rewrite
- Visual formats logic consolidation
- `DEBUG_MODE` toggle for development logging
- Content Security Policy (CSP) header
- Input validation (Zero Trust gap)
- `chat-interface.tsx` refactor (KISS)
- Dependency hardening (`tweetnacl` replacement, SBOM)

---

## Phase 3 — Advanced Features (Planned)

- Runway-based live avatar (alongside Decart AI)
- Popup live-sync via `BroadcastChannel`
- RAG context injection (local personality data files)
- Claude provider integration
- Offline STT/TTS (VOSK / MaryTTS)
- Multi-device sync (opt-in, E2E encrypted)

---

## Phase 4 — Desktop & Local AI (Future)

- Tauri desktop app — always-on-top, system tray, hot-word wake-up
- Local LLM support — Ollama / LM Studio
- Local fine-tuning — QLoRA / LoRA with user personality data
- Federated learning — privacy-preserving, on-device training
- Hardware requirement detection
