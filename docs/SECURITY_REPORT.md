# OWASP Top 10 Security Report

**Date:** 2026-03-29  
**Scope:** Full client-side codebase review  
**Methodology:** OWASP Top 10 (2021)

---

## A01 — Broken Access Control

**Status: N/A by design.**

Purely client-side app with no server, no auth, no multi-user context. No access control to break. The only "access control" is the device-scoped encryption key — covered under A02.

---

## A02 — Cryptographic Failures

**Status: Medium severity.**

- [x] ~~**[HIGH] Weak key derivation anchor** — `getDeviceID()` in `lib/device-id.ts` had a silent failure path: on any IndexedDB open error it generated an ephemeral device ID without persisting it.~~ Fixed: dual-layer persistence (IndexedDB primary, `localStorage` secondary). Every error path now reads from `localStorage` before ever generating a new ID, and every new ID is immediately persisted to both layers. A new ID is never returned without being anchored to at least one storage layer.
- [x] ~~**[LOW] PBKDF2 iteration count**~~ Fixed: bumped to 600,000 in `lib/crypto.ts` per NIST SP 800-132 (2023). The iteration count is now stored in every `EncryptedData` blob (`iterations` field). `decryptData` reads the stored count and falls back to 100,000 for legacy blobs that predate this change — full backwards compatibility, no data loss.
- [ ] **[INFO] `imageUrl` stored plaintext** in `StoredCompanion` — intentional design choice presumably, but companion data is otherwise fully encrypted.
- [x] ~~**[INFO] `selectedCompanionName` stored plaintext** in `StoredSettings` — same observation as above.~~ Fixed: full settings object now encrypted via `storeSettings`/`getSettings` in `lib/db.ts` using AES-GCM with device-derived key. Legacy plaintext records are handled transparently on read.

---

## A03 — Injection

**Status: Low risk, two concerns.**

- [x] ~~**[MEDIUM] SSRF-adjacent — `customProviderUrl`**~~ Fixed: `validateProviderUrl()` added to `lib/llm/custom.ts`. `https://` required for all external hosts. `http://` permitted only for loopback addresses (`localhost`, `127.0.0.1`, `::1`) to preserve local provider support (e.g. Ollama). Applied to both chat and STT URLs before any `fetch()` call.
- [x] ~~**[LOW] Prompt injection via document content**~~ Fixed: `escapeDocumentContent()` applied in both `lib/llm/groq.ts` and `lib/llm/custom.ts` before injecting document content into fenced code blocks. Triple-backtick sequences of any length are broken up to prevent fence escape.
- [x] **[PASS] Markdown rendering** — `ReactMarkdown` is used in `components/markdown-message.tsx` with no `dangerouslySetInnerHTML` and no raw HTML passthrough. Clean.

---

## A04 — Insecure Design

**Status: Medium severity.**

- [ ] **[MEDIUM] API keys decrypted at runtime client-side** — unavoidable for a pure client-side app, but means any XSS on the origin can extract them from memory. Encryption provides data-at-rest protection only, not runtime protection.
- [x] ~~**[MEDIUM] `registerProvider()` publicly callable**~~ Fixed: `registerProvider()` is no longer exported from `lib/llm/router.ts`. It remains as an internal function but is unreachable from the browser console or external modules.
- [x] ~~**[MEDIUM] Import pipeline trusts raw JSON structure**~~ Fixed: `lib/import.ts` now validates every conversation object via `isValidConversationData()` before accepting it. Checks include required field types, message structure, per-message content length cap (100k chars), and total conversation count limit (10k). Invalid entries are skipped with a warning rather than aborting the whole import.

---

## A05 — Security Misconfiguration

**Status: Low severity.**

- [ ] **[MEDIUM] No Content Security Policy** — No CSP header observed. Since API keys live in IndexedDB and LLM calls happen client-side, a strict CSP would significantly limit XSS blast radius.
- [x] **[PASS] `rel="noopener noreferrer"`** — Correctly applied on external links in `components/markdown-message.tsx`.
- [x] ~~**[LOW] Excessive debug logging**~~ Fixed: see A09. All `[v0]` console statements removed across 18 files.

---

## A06 — Vulnerable and Outdated Components

**Status: Partial assessment.**

- [ ] **[INFO] `react-markdown` + `remark-emoji`** — Past versions had ReDoS vulnerabilities in emoji parsing. Keep pinned and updated. Full audit requires `package.json` version lock review.

---

## A07 — Identification and Authentication Failures

**Status: N/A — accepted risk.**

No authentication system. Device ID is the identity anchor. If someone clones the browser profile (IndexedDB + localStorage), they gain full access including decryption capability. Accepted risk for a local-first architecture.

---

## A08 — Software and Data Integrity Failures

**Status: Medium severity.**

- [x] ~~**[MEDIUM] No schema validation on import**~~ Fixed: see A04. `isValidConversationData()` validates every conversation object before it is accepted.
- [x] ~~**[LOW] No HMAC / integrity signature on imported data**~~ Fixed: `lib/export.ts` now computes a SHA-256 hex digest (via `SubtleCrypto`) of the canonical JSON of the conversations array and embeds it as `integrity.sha256` in every export file. `lib/import.ts` recomputes the digest on import and rejects the file if it doesn't match. Files exported before this change (no `integrity` field) are accepted with a console warning for backwards compatibility.

---

## A09 — Security Logging and Monitoring Failures

**Status: Low severity (inverse problem).**

- [x] ~~**[LOW] Excessive sensitive data in logs**~~ Fixed: all `[v0]` debug console statements removed across the entire codebase — 18 files cleaned including `lib/llm/openai.ts`, `lib/llm/groq.ts`, `lib/llm/custom.ts`, `lib/voice/openai.ts`, `lib/voice/resembleai.ts`, `components/chat-interface.tsx`, `components/settings-panel.tsx`, `lib/utils.ts`, and more. No system prompts, API request bodies, key identifiers, or response content are logged anymore.

---

## A10 — Server-Side Request Forgery (SSRF)

**Status: Low severity, client-side.**

- [ ] **[LOW] `customProviderUrl` accepts arbitrary URLs** — See A03. In a browser context true SSRF is limited by CORS, but a user could be socially engineered into configuring a malicious endpoint that receives conversation history and API keys.

---

## Priority Summary

| Priority | ID | File | Issue |
|---|---|---|---|
| ~~High~~ | ~~A02~~ | ~~`lib/device-id.ts`~~ | ~~Silent ephemeral device ID on DB error — permanent data loss~~ — **Fixed** |
| Medium | A05 | `app/layout.tsx` | No Content Security Policy header |
| ~~Medium~~ | ~~A04~~ | ~~`lib/import.ts`~~ | ~~No schema validation on import — arbitrary data injection~~ — **Fixed** |
| ~~Medium~~ | ~~A04~~ | ~~`lib/llm/router.ts`~~ | ~~`registerProvider()` publicly callable from console~~ — **Fixed** |
| ~~Medium~~ | ~~A03~~ | ~~`lib/llm/custom.ts`~~ | ~~`customProviderUrl` has no URL validation~~ — **Fixed** |
| ~~Low~~ | ~~A09~~ | ~~Multiple~~ | ~~Excessive console logging of sensitive data~~ — **Fixed** |
| ~~Low~~ | ~~A03~~ | ~~`lib/llm/groq.ts`~~ | ~~Document prompt injection via triple backticks~~ — **Fixed** |
| ~~Low~~ | ~~A08~~ | ~~`lib/import.ts`~~ | ~~No HMAC / integrity check on imported data~~ — **Fixed** |
| ~~Low~~ | ~~A02~~ | ~~`lib/crypto.ts`~~ | ~~PBKDF2 iteration count below current NIST recommendation~~ — **Fixed** |

---

## Legend

- [x] — Reviewed, no action needed  
- [ ] — Action required  
- [ ] ~~strikethrough~~ — Fixed
