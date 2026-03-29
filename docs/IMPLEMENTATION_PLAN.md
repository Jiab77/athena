# AI Companion - Implementation Plan

## Executive Summary

Build a privacy-first, web-based AI companion platform that allows users to create and interact with customizable 2D/3D animated characters. The MVP focuses on web deployment (Vercel PWA), with future expansion to desktop (Tauri) and mobile.

**MVP Timeline:** 4-6 weeks  
**Primary Goal:** Web-based interactive companion with conversation memory, encrypted local storage, and modular API provider support.

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React/Next.js Frontend                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │   UI Layer       │    │  Floating Action │               │
│  │  (Components)    │◄──►│  Button (FAB)    │               │
│  └──────────────────┘    └──────────────────┘               │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌──────────────────────────────────────────┐               │
│  │   Companion Window (2D/3D Canvas)        │               │
│  │  - Character rendering                   │               │
│  │  - Animation system                      │               │
│  │  - Chat interface                        │               │
│  │  - Voice controls                        │               │
│  └──────────────────────────────────────────┘               │
│           ▲                                                 │
│           │                                                 │
├─────────────────────────────────────────────────────────────┤
│            Encryption & Storage Layer                       │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │  TweetNaCl.js    │    │   IndexedDB      │               │
│  │  (Encryption)    │◄──►│   (Storage)      │               │
│  └──────────────────┘    └──────────────────┘               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│            API Abstraction Layer                            │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │  LLM Provider    │    │  STT Provider    │               │
│  │  (Claude, GPT)   │    │  (Google, etc)   │               │
│  └──────────────────┘    └──────────────────┘               │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │  TTS Provider    │    │  Image Gen       │               │
│  │  (ElevenLabs)    │    │  (Fal, Replicate)│               │
│  └──────────────────┘    └──────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │
                    External APIs
                (Encrypted requests)
```

### 1.2 Data Flow: Encrypted Conversation

```
User Input (text/voice)
    │
    ▼
Conversation Manager
    │
    ├─► LLM API Call (encrypted if needed)
    │   └─► Response
    │       │
    │       ▼
    │   Encryption Layer (TweetNaCl.js)
    │       │
    │       ▼
    └─► IndexedDB Storage
        │
        ▼
    Decrypt & Display in UI
```

---

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Framework:** React 19 with shadcn/ui
- **Styling:** Tailwind CSS v4
- **Encryption:** TweetNaCl.js (XSalsa20-Poly1305)
- **Storage:** IndexedDB + idb library (wrapper)
- **2D Rendering:** Pixi.js (2D canvas animation)
- **3D Rendering:** Three.js (future, Phase 2)
- **Character Animation:** Spine (skeletal animation) or sprite sheets
- **LLM Integration:** Vercel AI SDK 6.x
- **Audio I/O:** Web Audio API, MediaRecorder API
- **Image Generation:** Fal AI SDK (abstracted for provider swap)

### Build & Deployment
- **Package Manager:** npm
- **Bundler:** Next.js (Turbopack by default)
- **Deployment:** Vercel
- **Version Control:** GitHub (private initially, public later)
- **Testing:** Vitest (unit tests before production)

### External APIs (User-provided keys, MVP phase)
- **LLM:** OpenAI (primary), Claude (Anthropic), Grok (xAI)
- **STT:** Google Cloud Speech-to-Text, AssemblyAI
- **TTS:** ElevenLabs, Google Cloud TTS
- **Image Generation:** Fal AI, Replicate

---

## 3. Core Features (MVP)

### 3.1 Floating Action Button (FAB) Interface
- Minimalist floating button (Material Design inspired)
- Expandable menu on hover/click
- Options:
  - **Show Companion** - Toggle companion window
  - **Voice Input** - Start listening for voice commands
  - **Chat Input** - Open text chat interface
  - **Settings** - API keys, personality, preferences

### 3.2 Companion Creation
- **Option A:** Pick from preset personalities (cheerful, sarcastic, helpful, nerdy)
- **Option B:** Custom description ("describe your companion")
- **Option C:** Hybrid - Pick preset + customize description
- Generate appearance via AI image generation (style-restricted to prevent deepfakes)
- Store companion profile (encrypted)

### 3.3 Interactive Conversation
- Real-time chat interface
- Voice input via microphone (STT)
- Voice output via speaker (TTS)
- AI personality adapts naturally to conversation context
- Companion animates during conversation (idle, listening, thinking states)

### 3.4 Encrypted Local Storage
- All conversations stored encrypted in IndexedDB
- Encryption key derived from user password/passphrase
- Conversation history persists across sessions
- Decryption happens on-demand when retrieving messages

### 3.5 API Provider Management
- Modular provider abstraction
- Users input their own API keys (encrypted storage)
- Support for multiple providers (swappable)
- "I don't care about privacy" mode (unencrypted API calls) with explicit warning

### 3.6 2D Character Animation
- Canvas-based rendering (Pixi.js)
- Sprite sheet animations or video frame sequences
- Idle animations (breathing, blinking, subtle movement)
- Expression changes based on conversation state (listening, thinking, happy, confused)
- No photorealistic humans or video avatars (prevents deepfakes, CSAM)

---

## 4. Data Schema (IndexedDB)

### Database Name: `companion_db` (v1)

### Object Stores:

#### 1. `companions`
```javascript
{
  keyPath: "id",
  indexes: [
    { name: "createdAt", keyPath: "createdAt" }
  ]
}

// Document structure
{
  id: "uuid",
  name: "Aurora",
  personality: "cheerful, helpful, inquisitive",
  description: "user-provided description",
  stylePreset: "anime", // or "cartoon", "stylized"
  imageUrl: "data:image/png;base64,...",
  animationState: "idle",
  createdAt: "2026-01-31T10:00:00Z",
  updatedAt: "2026-01-31T10:00:00Z"
}
```

#### 2. `conversations`
```javascript
{
  keyPath: "id",
  indexes: [
    { name: "companionId", keyPath: "companionId" }
  ]
}

// Document structure (ALL metadata encrypted per SimpleX model)
{
  id: "uuid",
  companionIdEncrypted: "base64_encrypted_uuid",
  messagesEncrypted: "base64_encrypted_blob",
  metadataEncrypted: "base64_encrypted_metadata"
}

// metadataEncrypted decrypts to:
{
  messageCount: 42,
  lastMessageAt: "2026-01-31T10:30:00Z",
  createdAt: "2026-01-31T10:00:00Z",
  updatedAt: "2026-01-31T10:30:00Z"
}

// Decrypted messages structure (in memory)
{
  messages: [
    {
      id: "uuid",
      role: "user",
      content: "Hello Aurora!",
      timestamp: "2026-01-31T10:00:01Z"
    },
    {
      id: "uuid",
      role: "companion",
      content: "Hi! How can I help you today?",
      timestamp: "2026-01-31T10:00:02Z"
    }
  ]
}
```

#### 3. `apiKeys`
```javascript
{
  keyPath: "id",
  indexes: [
    { name: "provider", keyPath: "provider" }
  ]
}

// Document structure
{
  id: "uuid",
  provider: "openai", // or "anthropic", "groq", etc
  type: "llm", // or "stt", "tts", "image_generation"
  keyEncrypted: "base64_encrypted_key",
  createdAt: "2026-01-31T10:00:00Z"
}
```

#### 4. `userPreferences`
```javascript
{
  keyPath: "key"
}

// Documents
{
  key: "privacyMode",
  value: true // or false for "I don't care" mode
}

{
  key: "defaultCompanionId",
  value: "uuid"
}

{
  key: "theme",
  value: "dark" // or "light"
}

{
  key: "ttsEnabled",
  value: true
}

{
  key: "sttEnabled",
  value: true
}
```

#### 5. `encryptionMetadata`
```javascript
{
  keyPath: "key"
}

// Document (stored once, used for key derivation)
{
  key: "encryptionSalt",
  value: "base64_salt"
}

{
  key: "encryptionNonce",
  value: "base64_nonce"
}
```

---

## 5. Security Model

### 5.1 Encryption at Application Layer

**Algorithm:** XSalsa20-Poly1305 (via TweetNaCl.js)

**Key Derivation:**
1. User provides password on first launch
2. Derive encryption key using PBKDF2 (1M iterations) + salt
3. Store salt in IndexedDB (unencrypted, publicly known)
4. Never store raw password

**Flow:**
```
User Password
    ▼
PBKDF2 (1M iterations) + Salt
    ▼
Encryption Key (256-bit)
    ▼
TweetNaCl.js XSalsa20-Poly1305
    ▼
Encrypted Blob ─► IndexedDB
```

### 5.2 API Key Storage
- Encrypt API keys with same key derivation
- Store encrypted in IndexedDB under `apiKeys` object store
- Decrypt only when making API calls
- Never log or expose API keys

### 5.3 Conversation Encryption
- Serialize conversation messages to JSON
- Encrypt entire blob with XSalsa20-Poly1305
- Store as base64 in IndexedDB
- Decrypt on-demand when opening conversation

### 5.4 Privacy Modes
- **Privacy Mode ON (default):** All data encrypted, API keys encrypted, no logging
- **Privacy Mode OFF ("I don't care" mode):**
  - Show explicit warning: "Your data may be logged by API providers"
  - Allow unencrypted API calls (users choose convenience)
  - Still encrypt local storage by default

### 5.5 Metadata Encryption (SimpleX-Inspired Model)

**Critical:** Following metadata privacy research (WhatsApp/Telegram leaks, Signal best practices, SimpleX architecture), ALL metadata must be encrypted.

**What IS Encrypted:**
- Conversation timestamps (creation, last message)
- Message counts
- Companion references (companionIdEncrypted)
- All metadata that reveals patterns

**Rationale:** Metadata reveals:
- Who talks to whom (companion relationships)
- When conversations happen (usage patterns)
- Frequency and duration (interaction intensity)
- These patterns are often MORE revealing than content

**Implementation:** 
- Store `companionIdEncrypted` (cannot query by companion without decryption)
- Serialize all metadata to JSON, encrypt as blob
- Decrypt on-demand when reading conversations
- Indexes are minimal (only `id` is unencrypted for retrieval)

**Trade-off:** Cannot efficiently query "all conversations with Companion X" without decrypting each conversation. This is acceptable for MVP; acceptable performance with <1000 conversations.

---

### 5.6 What's NOT Encrypted (Minimal)
- Encryption salt (public, mathematically required for key derivation)
- Document IDs (needed for database indexing/retrieval)
- That's it. Everything else is encrypted or derived.

**Note:** Companion metadata (name, personality, image URL) is encrypted in the `companions` store independently.

## 6. Component Architecture

### 6.1 Component Hierarchy

```
app/
├── layout.tsx
└── page.tsx

components/
├── Companion/
│   ├── CompanionWindow.tsx
│   ├── CompanionCanvas.tsx (2D/3D rendering)
│   ├── AnimationController.tsx
│   └── ExpressionManager.tsx
├── FloatingActionButton/
│   ├── FAB.tsx (main button)
│   ├── FABMenu.tsx (expandable menu)
│   └── FABButton.tsx (individual button)
├── Chat/
│   ├── ChatInterface.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── VoiceInput.tsx
├── Companion/
│   ├── CompanionCreationFlow.tsx
│   ├── PersonalitySelector.tsx
│   ├── DescriptionInput.tsx
│   └── AppearanceGenerator.tsx
├── Settings/
│   ├── SettingsPanel.tsx
│   ├── APIKeyManager.tsx
│   ├── PrivacySettings.tsx
│   └── PreferencesPanel.tsx
├── Providers/
│   ├── ProviderSelector.tsx
│   ├── LLMProvider.tsx (abstracted)
│   ├── STTProvider.tsx (abstracted)
│   ├── TTSProvider.tsx (abstracted)
│   └── IMGProvider.tsx (abstracted)
└── Common/
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── ConfirmDialog.tsx

hooks/
├── useCompanion.ts (fetch/create companion)
├── useConversation.ts (chat history, encryption)
├── useEncryption.ts (encryption/decryption utilities)
├── useAPIKey.ts (manage API keys)
├── useTTS.ts (text-to-speech)
├── useSTT.ts (speech-to-text)
├── useLLM.ts (LLM integration)
└── useIDB.ts (IndexedDB operations)

lib/
├── encryption.ts (TweetNaCl.js wrapper)
├── storage.ts (IndexedDB interface)
├── providers.ts (provider abstraction)
├── llm.ts (LLM provider factory)
├── stt.ts (STT provider factory)
├── tts.ts (TTS provider factory)
├── generate.ts (image generation factory)
├── animate.ts (Pixi.js utilities)
└── types.ts (TypeScript interfaces)
```

### 6.2 Key Components Detail

#### CompanionWindow.tsx
- Main container for the companion
- Manages companion state (companion object)
- Renders canvas + chat interface
- Handles window positioning/sizing

#### FAB.tsx
- Fixed position floating button
- Expands to show menu on click/hover
- Minimalist design (shadow, rounded)

#### ChatInterface.tsx
- Message list display
- User input (text + voice)
- Shows companion's typing indicator

#### CompanionCanvas.tsx
- Pixi.js canvas for 2D rendering
- Sprite sheet animation playback
- Expression changes based on state

#### EncryptionService (hooks)
- Wraps TweetNaCl.js
- Provides encrypt() / decrypt() functions
- Handles key derivation from password

#### StorageService (hooks)
- IndexedDB CRUD operations
- Encrypts/decrypts before storing
- Query conversations by companion

---

## 7. Week-by-Week Implementation Timeline

### Week 1: Project Setup & Architecture
- **Days 1-2:** Initialize Next.js 16, shadcn/ui setup, Tailwind config
- **Days 3-4:** Set up IndexedDB schema, create storage service
- **Day 5:** TweetNaCl.js integration, encryption utilities
- **Deliverable:** Boilerplate app with functional IndexedDB + encryption

### Week 2: Floating Action Button & UI Foundation
- **Days 1-2:** FAB component (Material Design style, expandable menu)
- **Days 3-4:** Settings panel UI, preference management
- **Day 5:** Navigation between views (companion, settings, etc)
- **Deliverable:** Working FAB navigation system

### Week 3: Companion Creation Flow
- **Days 1-2:** Personality selector (preset + custom input)
- **Days 3-4:** AI image generation integration (Fal SDK)
- **Day 5:** Store companion in IndexedDB (encrypted metadata)
- **Deliverable:** Users can create and save companions

### Week 4: 2D Canvas & Animation
- **Days 1-2:** Pixi.js setup, sprite sheet loading
- **Days 3-4:** Basic animations (idle, listening, thinking)
- **Day 5:** Expression manager (map AI state to animations)
- **Deliverable:** Animated companion rendering on canvas

### Week 5: Chat & Conversation System
- **Days 1-2:** Chat interface (message list, input)
- **Days 3-4:** Conversation storage (encrypt/decrypt, IndexedDB)
- **Day 5:** Load conversation history, persistence
- **Deliverable:** Users can chat, history persists encrypted

### Week 6: API Integration & Voice
- **Days 1-2:** LLM provider abstraction (OpenAI, Claude, Grok)
- **Days 3-4:** STT (Web Audio API + provider)
- **Day 5:** TTS provider integration
- **Deliverable:** Voice chat fully functional

### Week 7: Polish & Testing
- **Days 1-2:** Error handling, edge cases
- **Days 3-4:** Performance optimization, reduce bundle size
- **Day 5:** Manual testing, bug fixes
- **Deliverable:** MVP ready for deployment

### Week 8 (Optional): Deployment & Documentation
- **Days 1-2:** Deploy to Vercel
- **Days 3-5:** Documentation (README, setup guide, contribution guide)
- **Deliverable:** Public/private repo ready, deployed web app

**Total MVP: 6 weeks (aggressive) to 8 weeks (comfortable)**

---

## 8. API Provider Abstraction Pattern

### 8.1 LLM Provider Factory

```typescript
// lib/llm.ts
interface LLMProvider {
  generateResponse(messages: Message[]): Promise<string>;
  supportsStreaming: boolean;
}

class OpenAIProvider implements LLMProvider {
  constructor(apiKey: string) { }
  async generateResponse(messages: Message[]): Promise<string> { }
}

class AnthropicProvider implements LLMProvider {
  constructor(apiKey: string) { }
  async generateResponse(messages: Message[]): Promise<string> { }
}

export function getLLMProvider(provider: string, apiKey: string): LLMProvider {
  switch (provider) {
    case 'openai': return new OpenAIProvider(apiKey);
    case 'anthropic': return new AnthropicProvider(apiKey);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 8.2 Adding New Providers (Easy)
1. Create new class implementing interface
2. Add to factory switch statement
3. Test
4. No changes needed elsewhere

**Supports future:** Groq, Grok, Ollama, local models

---

## 9. Known Constraints & Limitations

### 9.1 v0 Preview Environment
- No persistent file system (IndexedDB is primary storage)
- No background services (hot-word listening not possible on web)
- Browser sandboxing (cannot appear above desktop apps)
- CORS restrictions on external APIs

### 9.2 MVP Scope
- **2D animation only** (3D deferred to Phase 2)
- **No hot-word wake-up** (manual button activation)
- **No multi-device sync** (single device, local storage)
- **No offline STT/TTS** (API-based only, VOSK deferred)
- **Web-only** (Tauri desktop deferred to Phase 2)
- **User-provided API keys** (no backend key management)

### 9.3 Security Model Trade-offs
- **Client-side encryption only** (no server-side proxy)
- **Password-based key derivation** (no key management service)
- **IndexedDB is readable** (relies on encryption, not obscurity)
- **Respects Kerckhoffs's principle** (security in key, not system secrecy)

---

## 10. Future Expansion (Phases 2+)

### Phase 2: Desktop Experience (Tauri)
- Native desktop app (cross-platform: Windows, Mac, Linux)
- True always-on-top floating window
- Hot-word wake-up ("Hey Aurora!")
- System tray integration
- Direct OS file system access

### Phase 2B: Offline Support
- VOSK integration for STT (local models)
- MarYTTS for TTS (local models)
- Hardware requirement detection
- Model download & caching

### Phase 3: 3D Avatar Support
- Three.js integration
- Rigged 3D models (ReadyPlayer.me or custom)
- Facial expressions via blendshapes
- Lip-sync from STT phonemes
- Advanced animations

### Phase 4: Advanced Local Personalization
- **Approach 1: RAG (Retrieval-Augmented Generation) Context Injection:**
  - Users upload local personality data (text files, notes, preferences)
  - Context injected into LLM prompts on-demand
  - Companion personality influenced by local user data
  - Works with both API-based and local LLMs
  - Simplest to implement, immediate impact
- **Approach 2: Local Fine-Tuning (Power Users):**
  - Ollama / LM Studio integration for local model hosting
  - QLoRA / LoRA fine-tuning with user's personality data
  - Model learns companion personality directly from local dataset
  - Zero data transmission (all processing local)
  - Deeper personalization, requires GPU for optimal performance
- **Approach 3: Federated Learning (Future Advanced Option):**
  - Train personality on device without sending raw data anywhere
  - Model updates computed locally, stay private
  - Privacy-preserving techniques (differential privacy optional)
  - Enables multi-device learning without data exposure
  - Research stage, most complex to implement
- **Hardware Requirements Detection:**
  - Suggest GPU for optimal performance
  - CPU-only fallback available
  - Model size selection based on available RAM
- **Implementation:**
  - Store personality training data locally (encrypted)
  - Fine-tuning runs client-side (may take minutes to hours)
  - Supports MobiLLM, PocketLLM, and other edge models
  - Seamless fallback to API-based if local inference unavailable

### Phase 5: Mobile Native
- iOS app (Swift/SwiftUI)
- Android app (Kotlin)
- Floating widget (appears above other apps)
- Push notifications for conversations

### Phase 6: Browser Extension
- Chrome/Firefox extension
- Companion appears on any website
- Context-aware conversations
- Website integration API

### Phase 7: Multi-Device Sync
- End-to-end encrypted sync server
- Encryption key management
- Conflict resolution
- Device pairing

### Phase 8: Enterprise Features
- Self-hosted deployment option
- Private LLM server integration
- Team management
- Analytics dashboard

### Phase 9: AI Agent Mode
- **Autonomous agent capabilities** for companion
- User-defined agent actions (with explicit permissions):
  - Query external data (weather, news, calendar access)
  - Perform tasks (search web, send notifications, control smart home)
  - Execute API calls (read-only by default)
- **Sandboxed permissions system:**
  - Users explicitly approve each agent capability
  - Audit log of all actions taken by agent
  - Revoke permissions on-demand
- **Action approval flow:**
  - Companion suggests action: "Want me to check your calendar for tomorrow?"
  - User clicks "Approve" or "Deny" / User says "Yes" or "No"
  - Agent executes with recorded timestamp
- **Safety considerations:**
  - No destructive actions (delete, modify, uninstall)
  - Rate limiting on API calls
  - Capability restrictions (read-only by default)
  - Clear warning: "Agent actions are executed with your approval"
- **Implementation approach:**
  - Tool abstraction layer (similar to LLM provider pattern)
  - Agent reasoning engine (LLM determines when/how to use tools)
  - Action queue + approval mechanism
  - Encrypted action logs in IndexedDB
- **Potential agent actions:**
  - Weather lookup, news feeds, calendar queries
  - Search (Google, Wikipedia, etc)
  - Smart home control (if user authorizes)
  - Email summaries (if user authorizes)
  - Reminders, notifications
  - Custom integrations (via API)

---

## 11. Testing Strategy

### MVP Testing (Manual)
- Manual testing across Chrome, Firefox, Safari
- Voice input/output quality check
- Encryption/decryption verification
- IndexedDB persistence verification
- API provider failover testing

### Pre-Production Testing (Automated)
- Unit tests: Encryption, storage, API abstraction
- Integration tests: Full conversation flow
- E2E tests: UI interactions, companion creation

### Tools
- **Vitest** for unit/integration tests
- **Playwright** for E2E tests (post-MVP)
- **Coverage target:** 80%+ before production release

---

## 12. Privacy & Analytics

### What We Track (Privacy-Respecting)
- **Optional:** Aggregate feature usage (e.g., "how many companions created")
- **Optional:** Error rates (for debugging)
- **No tracking:** Conversations, API keys, personal data

### Analytics Solution
- **Posthog** (open source, privacy-friendly) or similar
- **Self-hosted** (user data stays on their infrastructure)
- **Users opt-in** explicitly in settings
- **Clear privacy policy** explaining what's collected

### Default: Analytics Disabled
- Users can enable in settings
- Transparent about what's being collected
- Easy opt-out

---

## 13. Deployment & Release

### MVP Release Checklist
- [ ] All core features functional
- [ ] Manual testing complete
- [ ] Documentation written
- [ ] Privacy policy drafted
- [ ] Terms of Service (especially: no deepfakes, no CSAM)
- [ ] Deployed to Vercel
- [ ] Repository set to public (GitHub)

### Deployment Strategy
1. **Week 8:** Deploy private Vercel instance (internal testing)
2. **Week 9:** Deploy public Vercel instance (beta launch)
3. **Week 10+:** Feedback collection, Phase 2 planning

### Monitoring
- Error tracking (Sentry or similar)
- Performance monitoring
- User feedback collection
- API error rates

---

## 14. Success Metrics

### MVP Success Criteria
- [ ] App loads in <3 seconds
- [ ] Companion creation works end-to-end
- [ ] Conversations persist and decrypt correctly
- [ ] Voice input/output functional
- [ ] No major bugs or crashes
- [ ] Clear UI/UX (user testing feedback)

### Post-MVP Metrics
- User retention (DAU, MAU)
- Conversation frequency
- API provider usage breakdown
- Feature usage (voice vs text, etc)
- Performance metrics (page load, animation FPS)

---

## 15. Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| TweetNaCl.js performance impact | Medium | Benchmark early, optimize if needed |
| IndexedDB quota exceeded | Low | Implement conversation archiving, user warnings |
| API rate limiting | Medium | Implement backoff, user warnings |
| User forgets password (loses access) | High | Password recovery flow (alternative: backup codes) |
| Browser compatibility issues | Medium | Test on multiple browsers early, polyfills |
| CORS issues with APIs | Medium | Use CORS proxy if needed, or backend relay |
| Deepfake/CSAM misuse | High | Restrict image generation to stylized only, ToS |
| 3rd party API outage | Medium | Fallback providers, graceful degradation |

---

## 16. Dependencies & Bundle Size Estimates

| Package | Size (gzipped) | Purpose |
|---------|---|---|
| Next.js | 200KB | Framework |
| React | 40KB | UI |
| shadcn/ui | 20KB | Components |
| Pixi.js | 200KB | 2D rendering |
| TweetNaCl.js | 14KB | Encryption |
| idb | 5KB | IndexedDB wrapper |
| Vercel AI SDK | 50KB | LLM integration |
| **Total** | **~500KB** | **Target: <600KB gzipped** |

**Optimization opportunities:**
- Tree-shake unused shadcn components
- Lazy-load 3D libs (Three.js) for Phase 2
- Code split by route (settings, companion creator, etc)

---

## 17. Documentation Structure

```
docs/
├── IMPLEMENTATION_PLAN.md (this file)
├── ARCHITECTURE.md (detailed system design)
├── API_PROVIDERS.md (how to add new providers)
├── ENCRYPTION_GUIDE.md (TweetNaCl.js + key derivation)
├── DATABASE_SCHEMA.md (full database documentation)
├── CONTRIBUTING.md (contribution guidelines)
├── PRIVACY_POLICY.md (user privacy statement)
├── SECURITY.md (security considerations, known issues)
└── ROADMAP.md (future plans, Tauri, mobile, etc)
```

---

## 18. Conclusion

This MVP focuses on **shipping a functional, privacy-respecting AI companion platform in 6-8 weeks** using web technologies. The modular architecture supports easy expansion to desktop (Tauri), mobile, and advanced features (3D, offline, sync).

**Key principles:**
- **Privacy first:** Client-side encryption, user control
- **Modular design:** Easy to add new LLM/STT/TTS providers
- **Simple but powerful:** Beautiful UX without unnecessary complexity
- **Future-proof:** Extensible architecture for Phase 2+

**Next step:** Approval of this plan, then begin Week 1 implementation.

---

## Appendix A: File Structure (Post-MVP)

```
ai-companion/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/ (future: backend routes)
├── components/
│   ├── Companion/
│   ├── FloatingActionButton/
│   ├── Chat/
│   ├── Settings/
│   ├── Providers/
│   └── Common/
├── hooks/
│   └── (custom hooks listed in 6.1)
├── lib/
│   └── (utilities listed in 6.1)
├── public/
│   ├── animations/
│   ├── fonts/
│   └── images/
├── docs/
│   └── (documentation structure)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── next.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

**Document Version:** 1.0  
**Created:** 2026-01-31  
**Status:** Ready for Review & Approval
