# OWASP Top 10 Security Report

**Date:** 2026-04-03
**Scope:** Full client-side codebase review
**Methodology:** [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
**Previous audit:** 2026-03-29 (OWASP Top 10:2021)

> **Note on architecture:** Athena is a pure client-side application. All data is stored locally in IndexedDB, encrypted at rest with AES-GCM using a device-derived key. There is no backend server, no authentication server, and no multi-user context. Several OWASP categories are N/A by design or present as reduced-scope client-side variants. This posture is consistent with Kerckhoffs's Principle — security relies entirely on the strength of the key derivation and encryption algorithms, not on obscurity of the architecture.

---

## A01:2025 — Broken Access Control

**Status: N/A by design.**

No server, no auth, no multi-user context. The only access control is physical (device access) and cryptographic (device-derived AES-GCM key). SSRF (CWE-918) is addressed in A05.

The one relevant concern from this category:

- [ ] **[INFO] `registerProvider()` is technically callable from IDB-patched code** — The function is unexported and tree-shaken with `void registerProvider`, but a sufficiently motivated attacker with local code execution can patch the module at runtime. Accepted risk: local code execution already implies full device compromise.
- [x] **[PASS] `rel="noopener noreferrer"`** — Correctly applied on all external links in `components/markdown-message.tsx`. Prevents `window.opener` access (CWE-1022).

---

## A02:2025 — Security Misconfiguration

**Status: Low severity — CSP and security headers implemented in Session 33.**

This category replaces A05:2021 Misconfiguration and moves up to #2 in 2025. It now explicitly covers missing security headers (CWE-16).

- [x] ~~**[MEDIUM] No Content Security Policy (CSP)**~~ Fixed in Session 33: CSP and five additional security headers added at the framework level via `next.config.mjs` `headers()` function. Headers applied to every response. CSP directives: `default-src 'self'`, `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (Next.js requires), `style-src 'self' 'unsafe-inline'` (Tailwind requires), `img-src 'self' data: blob: https:`, `font-src 'self' data:`, `connect-src 'self' https:`, `worker-src 'self' blob:`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`. `connect-src 'self' https:` is intentionally permissive to support user-configured custom provider endpoints, but still blocks `http://`, `data:`, and `blob:` exfiltration channels — the primary XSS exfiltration vectors. Additional headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: microphone=(self), camera=(self), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- [ ] **[INFO] `generator: 'v0.app'` in metadata** — `app/layout.tsx` includes `generator: 'v0.app'` in the Next.js metadata object. This leaks information about the toolchain used to build the app (CWE-497). Low risk but trivially removable.
- [x] **[PASS] No debug code in production** — `CWE-489`: All `[v0]` debug console statements were removed across 18 files in Session 26. `[Athena]` debug statements remain but log operational data only, not secrets.
- [x] **[PASS] No hardcoded secrets** — No API keys, passwords, or cryptographic material are hardcoded anywhere in the codebase (CWE-547).

---

## A03:2025 — Software Supply Chain Failures

**Status: Partial assessment — new category in 2025.**

This category replaces A06:2021 (Vulnerable and Outdated Components) and expands scope to all supply chain failures. New top concern in 2025 per community survey.

- [ ] **[MEDIUM] No SBOM / dependency audit process** — No automated `npm audit`, Dependabot, or OWASP Dependency-Track is configured. The codebase has 60+ direct dependencies. Notable packages with past CVEs: `react-markdown 10.1.0`, `remark-emoji 5.0.2` (ReDoS in earlier versions). Current versions appear clean but there is no automated process to stay ahead of new CVEs (CWE-1395).
- [ ] **[INFO] `@decartai/sdk 0.0.57`** — Pre-1.0 SDK from a third party. No SLA on security patches. Pin version and monitor for updates (CWE-1104).
- [ ] **[INFO] `tweetnacl 1.0.3`** — Last updated 2019. Widely audited but unmaintained. Consider whether usage can be removed if its only role is utility hashing already covered by `SubtleCrypto` (CWE-1104).
- [x] **[PASS] No CDN script injection** — All dependencies are bundled via npm/Next.js. No inline `<script src="https://...">` from external CDNs in any layout or page file (CWE-830).
- [x] **[PASS] `package.json` uses exact or caret versions** — No wildcard (`*`) ranges that could pull in unexpected breaking changes.

---

## A04:2025 — Cryptographic Failures

**Status: Low severity — significant improvements from 2021 audit.**

This category moves down to #4 in 2025. All high-severity items from the 2021 audit are fixed.

- [x] ~~**[HIGH] Weak key derivation anchor**~~ Fixed: dual-layer persistence (IndexedDB primary, `localStorage` secondary) in `lib/device-id.ts`. Every error path reads from `localStorage` before generating a new ID. A new ID is never returned without being anchored to at least one storage layer.
- [x] ~~**[LOW] PBKDF2 iteration count**~~ Fixed: bumped to 600,000 in `lib/crypto.ts` per NIST SP 800-132 (2023). Stored in every `EncryptedData` blob (`iterations` field). Legacy blobs fall back to 100,000 transparently.
- [x] ~~**[INFO] `selectedCompanionName` stored plaintext**~~ Fixed: full settings object now encrypted via `storeSettings`/`getSettings` in `lib/db.ts` using AES-GCM with device-derived key.
- [ ] **[INFO] `imageUrl` stored plaintext** in `StoredCompanion` — Intentional design choice (avatar paths are `/avatars/...` local paths). No PII, acceptable.
- [ ] **[INFO] Post-quantum readiness** — OWASP 2025 explicitly recommends preparing for post-quantum cryptography (PQC) by end of 2030 (ENISA roadmap). AES-GCM with 256-bit keys is considered quantum-safe for symmetric encryption. PBKDF2-HMAC-SHA256 at 600,000 iterations: NIST considers this safe through 2030+. No immediate action required, but worth tracking NIST PQC standards as they mature (CRYSTALS-Kyber, CRYSTALS-Dilithium).
- [ ] **[INFO] IV nonce reuse risk** — AES-GCM uses a 96-bit random IV (`crypto.getRandomValues(new Uint8Array(12))`). The birthday paradox risk becomes meaningful around 2^32 encryptions (~4 billion) under the same key. For a personal AI companion this is effectively unreachable, but worth documenting (CWE-323).

---

## A05:2025 — Injection

**Status: Low risk — all medium issues fixed.**

Injection drops to #5 in 2025. OWASP 2025 explicitly calls out LLM prompt injection (LLM01:2025) as a related class now tracked separately in the OWASP LLM Top 10.

- [x] ~~**[MEDIUM] SSRF-adjacent — `customProviderUrl`**~~ Fixed: `validateProviderUrl()` in `lib/llm/custom.ts`. `https://` required for all external hosts. `http://` permitted only for loopback addresses (`localhost`, `127.0.0.1`, `::1`).
- [x] ~~**[LOW] Prompt injection via document content**~~ Fixed: `escapeDocumentContent()` applied in `lib/llm/groq.ts` and `lib/llm/custom.ts` before injecting document content into fenced code blocks.
- [x] **[PASS] Markdown rendering** — `ReactMarkdown` in `components/markdown-message.tsx` with no `dangerouslySetInnerHTML` and no raw HTML passthrough (CWE-79).
- [ ] **[INFO] LLM prompt injection via user messages** — User messages are passed directly to the LLM as conversation history. A crafted message could attempt to override the system prompt. Mitigated by the fact that Athena has no privileged tool access (no file system, no code execution, no external accounts to compromise). The only "damage" would be the model ignoring personality instructions. Tracked in OWASP LLM Top 10: LLM01:2025.

---

## A06:2025 — Insecure Design

**Status: Medium severity — accepted risks documented.**

Insecure Design drops to #6 in 2025. All fixable items from the 2021 audit are resolved.

- [ ] **[MEDIUM] API keys decrypted at runtime client-side** — Unavoidable for a pure client-side app. Any XSS on the origin can extract keys from memory after decryption. Encryption provides data-at-rest protection only. Mitigated by: (1) no backend to attack with stolen keys, (2) keys only work from the user's own accounts, (3) CSP now in place (A02) significantly reducing XSS exfiltration channels. Accepted risk for a local-first architecture (CWE-522).
- [x] ~~**[MEDIUM] `registerProvider()` publicly callable**~~ Fixed: unexported, unreachable from browser console.
- [x] ~~**[MEDIUM] Import pipeline trusts raw JSON structure**~~ Fixed: `isValidConversationData()` validates every conversation object in `lib/import.ts`.
- [ ] **[INFO] `store: false` on OpenAI requests** — Correctly set. Conversations are not retained on OpenAI servers. Design decision documented in `README.md`.

---

## A07:2025 — Authentication Failures

**Status: N/A — accepted risk.**

No authentication system. Device ID is the identity anchor. If someone clones the browser profile (IndexedDB + localStorage), they gain full access including decryption capability. Accepted risk for a local-first personal companion architecture. No credential stuffing, session fixation, or brute force attack surface exists (CWE-287).

---

## A08:2025 — Software or Data Integrity Failures

**Status: Low severity — all items fixed.**

Minor name clarification from 2021 ("Software and Data" → "Software or Data"). Focus remains on trust boundaries and artifact integrity.

- [x] ~~**[MEDIUM] No schema validation on import**~~ Fixed: `isValidConversationData()` validates every conversation object in `lib/import.ts`.
- [x] ~~**[LOW] No HMAC / integrity signature on exported data**~~ Fixed: `lib/export.ts` computes a SHA-256 hex digest (via `SubtleCrypto`) of the canonical JSON of the conversations array and embeds it as `integrity.sha256`. `lib/import.ts` recomputes the digest on import and rejects mismatches. Legacy files (no `integrity` field) accepted with a console warning (CWE-345).
- [x] **[PASS] No auto-update functionality** — Athena has no auto-update mechanism that could be hijacked. Updates are explicit user deployments (CWE-494).

---

## A09:2025 — Security Logging and Alerting Failures

**Status: Low severity — context-appropriate for client-side app.**

Renamed from "Security Logging and Monitoring Failures" (2021) to emphasize the alerting function.

- [x] ~~**[LOW] Excessive sensitive data in logs**~~ Fixed: all `[v0]` debug statements removed across 18 files in Session 26. `[Athena]` operational logs remain but contain no secrets, no system prompts verbatim, and no API keys (CWE-532).
- [ ] **[INFO] No security event logging** — Client-side apps have inherently limited logging capability. There is no audit trail for failed decryption attempts, import integrity failures, or provider authentication errors beyond `console.warn`. For a single-user local app, this is accepted. If multi-user support is ever added, proper server-side event logging must be introduced (CWE-778).
- [ ] **[INFO] Log injection not sanitized** — `[Athena]` console logs include user-controlled content (e.g. partial message content in preview logs). A crafted message with ANSI escape sequences or log-format injection strings could pollute developer console output. Low severity in a browser context but worth noting (CWE-117).

---

## A10:2025 — Mishandling of Exceptional Conditions

**Status: Low severity — new category in 2025.**

This is a new entry replacing A10:2021 (Server-Side Request Forgery). It covers improper error handling, failing open, and logic errors from abnormal conditions.

- [x] **[PASS] Crypto errors fail closed** — `decryptData()` in `lib/crypto.ts` catches all `SubtleCrypto` errors and returns `null` rather than throwing or returning partial data. Callers treat `null` as "data unavailable" (CWE-636).
- [x] **[PASS] Import integrity failure throws** — `lib/import.ts` throws a descriptive error on SHA-256 mismatch rather than silently accepting tampered data (CWE-636).
- [x] **[PASS] Provider URL validation throws on invalid input** — `validateProviderUrl()` throws with a descriptive message for all invalid URL cases: unparseable URL, non-https external, unsupported protocol (CWE-234).
- [ ] **[LOW] API error responses exposed to UI** — `lib/llm/custom.ts` and other provider files throw structured error objects that include `status`, `message`, and `originalError`. If the calling component surfaces `error.message` directly to the user (which `chat-interface.tsx` does), a provider's verbose error message (e.g. "Invalid API key — key starts with sk-...") could leak configuration hints (CWE-209). Mitigate by sanitizing error messages before display.
- [ ] **[LOW] `export.ts` has bare `throw error` in catch blocks** — `exportAsJSON()`, `exportAsMarkdown()`, and `downloadExport()` all re-throw the raw error without wrapping or sanitizing it. If these errors bubble to a UI toast, the raw exception message from the browser/IndexedDB layer is shown to the user (CWE-209).
- [x] ~~**[INFO] No global error boundary**~~ Fixed: `app/error.tsx` and `app/global-error.tsx` both exist and provide route-level and root-level error boundaries respectively. Uncaught exceptions render a recovery UI rather than a blank screen (CWE-703).

---

## Priority Summary

| Priority | ID | File | Issue |
|---|---|---|---|
| **Medium** | A03 | `package.json` | No automated dependency audit / SBOM process |
| **Low** | A10 | `lib/llm/custom.ts` + UI | API error messages may leak provider config hints |
| **Low** | A10 | `lib/export.ts` | Bare re-throw exposes raw exceptions to UI |
| **Low** | A09 | Multiple | Log injection via user-controlled content in `[Athena]` logs |
| **Info** | A02 | `app/layout.tsx` | `generator: 'v0.app'` metadata leaks toolchain info |
| **Info** | A03 | `package.json` | `tweetnacl` unmaintained — review if still needed |
| **Info** | A03 | `package.json` | `@decartai/sdk` pre-1.0 — monitor for security updates |
| **Info** | A04 | `lib/crypto.ts` | PQC readiness — track, no action needed before 2030 |
| ~~Info~~ | ~~A10~~ | ~~`app/`~~ | ~~No global `error.tsx` boundary~~ — **Fixed** |
| ~~Medium~~ | ~~A02~~ | ~~`app/layout.tsx`~~ | ~~No Content Security Policy header~~ — **Fixed (Session 33)** |
| ~~High~~ | ~~A04~~ | ~~`lib/device-id.ts`~~ | ~~Silent ephemeral device ID on DB error~~ — **Fixed** |
| ~~Medium~~ | ~~A05~~ | ~~`lib/import.ts`~~ | ~~No schema validation on import~~ — **Fixed** |
| ~~Medium~~ | ~~A04/A06~~ | ~~`lib/llm/router.ts`~~ | ~~`registerProvider()` publicly callable~~ — **Fixed** |
| ~~Medium~~ | ~~A05~~ | ~~`lib/llm/custom.ts`~~ | ~~`customProviderUrl` no URL validation~~ — **Fixed** |
| ~~Low~~ | ~~A09~~ | ~~Multiple~~ | ~~Excessive console logging of sensitive data~~ — **Fixed** |
| ~~Low~~ | ~~A05~~ | ~~`lib/llm/groq.ts`~~ | ~~Document prompt injection via triple backticks~~ — **Fixed** |
| ~~Low~~ | ~~A08~~ | ~~`lib/import.ts`~~ | ~~No integrity check on imported data~~ — **Fixed** |
| ~~Low~~ | ~~A04~~ | ~~`lib/crypto.ts`~~ | ~~PBKDF2 iteration count below NIST recommendation~~ — **Fixed** |

---

## Mapping: 2021 → 2025 Category Changes

| 2021 | 2025 | Change |
|---|---|---|
| A01 Broken Access Control | A01 Broken Access Control | No change — still #1 |
| A02 Cryptographic Failures | A04 Cryptographic Failures | Moved down 2 positions |
| A03 Injection | A05 Injection | Moved down 2 positions |
| A04 Insecure Design | A06 Insecure Design | Moved down 2 positions |
| A05 Security Misconfiguration | A02 Security Misconfiguration | Moved up 3 positions |
| A06 Vulnerable and Outdated Components | A03 Software Supply Chain Failures | Expanded scope, moved up 3 positions |
| A07 Identification and Authentication Failures | A07 Authentication Failures | Minor rename, same position |
| A08 Software and Data Integrity Failures | A08 Software or Data Integrity Failures | Minor rename, same position |
| A09 Security Logging and Monitoring Failures | A09 Security Logging and Alerting Failures | Minor rename, same position |
| A10 Server-Side Request Forgery (SSRF) | **Removed** | SSRF now under A01 |
| — | **A10 Mishandling of Exceptional Conditions** | **New in 2025** |

---

## Legend

- [x] — Reviewed, no action needed or already fixed
- [ ] — Action required or acknowledged accepted risk
- ~~strikethrough~~ — Previously flagged, now fixed
