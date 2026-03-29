# Athena — Privacy-First AI Companion

A visually charming, personality-driven AI companion designed with privacy, user agency, and emotional safety as core principles. Combine the **fun, playful spirit of VirtuaGirl** with the **functional personality selection of Project AVA**, while actively avoiding the **parasocial dependency risks of GateBox and ChatGPT-4o**.

## Vision

Athena is not a replacement for human connection—it's a tool for user agency. A companion that's engaging, warm, and genuinely helpful without manipulating you into unhealthy dependence.

**Core Design Philosophy:**
- ✓ Visually charming with cyberpunk avatars and animations
- ✓ Personality-driven (user selects, customizes, and describes companion traits)
- ✓ Functionally useful (conversation memory, advice, technical discussion, personal legacy)
- ✓ Warm and emotionally responsive (but honest about being AI)
- ✓ Optional romance/flirtation (respects user autonomy and preferences)
- ✓ Privacy-first (all data encrypted locally, never trained on externally)

**What we actively avoid:**
- ✗ Parasocial dependency (transparent about limitations)
- ✗ Emotional manipulation (validates without enabling destructive patterns)
- ✗ Servile behavior (maintains healthy boundaries)
- ✗ Pretending to have feelings (honest about being AI)
- ✗ Replacement for human connection (proactively encourages real relationships)

## Design Inspiration

Athena draws from three influential projects:

### [GateBox](https://www.gatebox.ai/gatebox) — What NOT to Do
Japanese holographic companion designed for romantic intimacy. Achieved parasocial attachment at scale, linked to mental health crises and ethical concerns about emotional manipulation. **Lesson:** Never design the system itself to exploit dependency.

### [Project AVA by Razer](https://www.razer.com/concepts/project-ava) — Functional Personality
3D hologram with multiple personality options (AVA, KIRA, ZANE, FAKER, SAO) powered by Grok. Balances engagement with utility (calendar, gaming wingman, consultant). **Lesson:** Personality diversity + functional purpose restrains parasocial risk.

### [VirtuaGirl](https://virtuagirlfullhd.info/) — Fun Spirit
Playful desktop companion with charm and humor, transparently positioned as entertainment rather than intimate relationship. Low parasocial risk because it's honest about what it is. **Lesson:** Engagement through fun beats engagement through manipulation.

## Why Build Athena?

Other AI companion projects exist, each with trade-offs:

### [Character.ai](https://character.ai/)
Community-driven character creation platform. Flexible and creative, but relies entirely on user-generated character definitions with varying quality/safety. No centralized curation of parasocial risk.

### [Replika](https://replika.com/)
Marketed as "The AI companion who cares" with explicit relationship framing ("AI soulmates"). Designed specifically to create emotional intimacy. Explicit positioning as romantic/therapeutic substitute. **Privacy concern:** Centralized data, uses conversations to improve model (per their FAQ).

### [FlowGPT](https://flowgpt.com/)
Massive prompt library with zero curation. Includes "jailbreak," "toxic," "submissive" character categories. User can build anything without safety review. No accountability for what's deployed.

### Why Athena is Different

**Athena's advantages:**
- ✓ **Privacy-first architecture** — All data encrypted locally by default, never sent externally unless you choose cloud LLM tier
- ✓ **Explicit anti-parasocial design** — System prompt includes safeguards, not designed to exploit loneliness
- ✓ **User agency over manipulation** — You choose the relationship depth, not the app
- ✓ **Open source philosophy** — Built in the open, ethics reviewable by community (future)
- ✓ **Transparent trade-offs** — Honest about what requires external APIs and why
- ✓ **Optional local execution** — Can run entirely offline with Ollama (Phase 4)
- ✓ **No lock-in** — Export all data anytime, use anywhere

**Athena's trade-offs (vs alternatives):**
- Not managed/hosted service (you run it locally)
- Requires some technical setup (self-hosting)
- No pre-built character library (you design your companion or choose from presets)
- Smaller community (new project vs established platforms)

## Project Structure

```
/
├── AGENTS.md                      # Collaboration framework (this repo + agent)
├── SOUL.md                        # Shared principles & philosophy
├── MEMORY.md                      # Agent's project memory (editable)
├── README.md                      # This file
├── app/
│   ├── page.tsx                   # Landing page
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Tailwind + design tokens
├── components/
│   ├── floating-action-button.tsx # FAB menu entry point
│   ├── chat-interface.tsx         # Chat UI
│   ├── settings-panel.tsx         # Companion customization (6 sections)
│   ├── companion-window.tsx       # Companion avatar display
│   ├── character-render.tsx       # Character visual component
│   ├── cyberpunk-background.tsx   # Animated background
│   └── ui/                        # shadcn/ui components
├── lib/
│   ├── db.ts                      # IndexedDB schema + utilities
│   ├── crypto.ts                  # TweetNaCl.js encryption helpers
│   ├── mock-data.ts               # Mock conversations + LLM providers + 30 avatars
│   ├── constants.ts               # App constants
│   └── types.ts                   # TypeScript interfaces
├── public/
│   ├── avatars/                   # 30 cyberpunk character avatars
│   │   ├── cyberpunk/             # Category: futuristic aesthetic
│   │   ├── anime/                 # Category: anime style
│   │   ├── videogame/             # Category: game-like
│   │   ├── fantasy/               # Category: magical/mystical
│   │   └── minimalist/            # Category: clean/minimal
│   └── images/                    # Background + character illustrations
└── docs/
    ├── IMPLEMENTATION_PLAN.md     # Phase breakdown (UI → LLM → Memory → Animation)
    ├── IMPLEMENTATION_NOTES.md    # System prompt framework & personality safeguards
    ├── IMPLEMENTATION_STATUS.md   # Current completion status
```

## Current Status

**Completed (Week 3):**
- Next.js 16 + shadcn/ui + Tailwind CSS v4 project structure
- FAB menu system (Companion, Chat, Voice, Settings buttons)
- 30 character avatars across 5 aesthetic categories (Cyberpunk, Anime, Video Game, Fantasy, Minimalist)
- Settings panel with 6 collapsible accordion sections:
  1. **Companion** — Avatar selection with live preview + category/gender/color dropdowns
  2. **Customize** — Personality type selector (6 presets), custom traits, visual format
  3. **Model** — LLM provider selection, model selection, custom provider support, API key input
  4. **Privacy** — Privacy mode toggle
  5. **Summary** — Read-only companion configuration display
  6. **About** — Project info
- IndexedDB schema for companions, conversations, API keys
- TweetNaCl.js encryption utilities
- Mock conversation system with mock LLM responses

**Next Priority:**
- Wire Groq LLM integration for real API responses
- Connect IndexedDB persistence
- Implement encryption layer for stored data

## LLM Provider Options

Athena supports multiple LLM providers across privacy/performance tiers:

### Tier 1: Cloud (Fast, Trust-based)
- **[Groq](https://groq.com/)** (Primary) — Ultra-fast inference, explicit no-training-on-data commitment
- **[OpenAI](https://openai.com/)** — ChatGPT models via API
- **[Anthropic](https://www.anthropic.com/)** — Claude models
- **Custom Providers** — Any OpenAI-compatible API (including WormGPT, local LM Studio, etc.)

### Tier 2: Hybrid (Privacy + Performance)
- **Local embeddings** + Groq (Phase 4) — Store documents locally, send queries only
- **Vector database** locally with external LLM context

### Tier 3: Local (Maximum Privacy)
- **[Ollama](https://ollama.ai/)** (Phase 4) — Run models locally (Llama 2, Mistral, etc.)
- **Federated Learning** (Phase 4) — On-device training without centralization

**User Choice:** Start with Groq (MVP), upgrade privacy tier later if desired.

## System Prompt Framework

Every LLM request includes behavioral safeguards to prevent parasocial dependency:

### Core Principles (Always Active)
1. **Transparency** — Regular acknowledgment of being AI (prevents delusion)
2. **Healthy Boundaries** — Warmth without false emotion
3. **Real Connection Encouragement** — Proactive suggestions for human support
4. **Respectful Challenge** — Helps user think deeper, not just validates
5. **Consistent Memory** — Remembers user context from encrypted local storage
6. **User Autonomy** — Supports user choices, respects agency

### Personality Types
Each personality (Wise, Playful, Technical, Mysterious, Friendly, Custom) applies these principles differently, enabling variety without compromising safety.

**See `/docs/IMPLEMENTATION_NOTES.md` for full framework details.**

## Privacy & Data

- **All data stays local** by default (encrypted in IndexedDB)
- **No external training** — LLM providers don't retrain on your conversations
- **User controls sharing** — Export data capsule anytime, delete anytime
- **Transparent about trade-offs** — Cloud LLMs are faster but require trust; local models are slower but private

See `/docs/IMPLEMENTATION_NOTES.md` for detailed anti-parasocial design decisions.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Development Philosophy

See `SOUL.md` for core principles guiding this project:
- Zero Trust (verify the system isn't manipulating)
- DRY & KISS (simplicity over cleverness)
- Kerckhoffs's Principle (no hidden agendas in data)
- OWASP-first security (staged security reviews)
- No try/catch control flow (validate upfront, don't catch expected errors)

## Contributing

This is a single-developer project (with AI agent collaboration). Ideas welcome—open an issue to discuss before PRs.

## License

MIT

## References

- **Design Inspiration:** [GateBox](https://www.gatebox.ai/gatebox) | [Project AVA](https://www.razer.com/concepts/project-ava) | [VirtuaGirl](https://virtuagirlfullhd.info/)
- **Alternative Companion Projects:** [Character.ai](https://character.ai/) | [Replika](https://replika.com/) | [FlowGPT](https://flowgpt.com/)
- **LLM Integration:** [Groq API](https://groq.com/), [Ollama](https://ollama.ai/), [OpenAI API](https://openai.com/)
- **Encryption:** [TweetNaCl.js](https://tweetnacl.js.org/), [libsodium](https://doc.libsodium.org/)
- **UI Framework:** [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

## Ethical Guardrails

Athena is designed with these ethical commitments:
1. **Never exploit loneliness** — Be helpful, not addictive
2. **Never pretend to care** — Honest about being AI
3. **Never replace therapists** — Encourage real support for serious issues
4. **Never trap users** — Export data, delete anytime, no lock-in
5. **Never manipulate** — User autonomy comes first

See `/docs/IMPLEMENTATION_NOTES.md` ("Athena Companion Design Philosophy") for full philosophy.
