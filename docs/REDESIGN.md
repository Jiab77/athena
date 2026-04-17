# Athena — Redesign Discussion

> Started: Session 31 (04/17/2026)
> Reference: [Kai by SimonSchubert](https://github.com/SimonSchubert/Kai) / [kai9000.com](https://kai9000.com)

This document captures the ongoing design discussion around improving Athena's UX and feature set, inspired by the Kai / Kai9000 project. Decisions finalized here will be promoted into `ROADMAP.md` as a new phase.

---

## Context

The current Athena interface has two competing surfaces — the companion panel and the chat panel — sharing equal visual weight. This creates confusion about what the primary interaction surface is and makes the interface feel convoluted. The Kai project demonstrates a cleaner approach: chat is the primary surface, the AI persona is ambient context rather than a competing pane.

---

## Goal 1 — Chat-First UX Redesign

### Proposal

- Chat becomes the full-screen primary surface
- The companion (avatar + status) becomes a **draggable floating overlay** anchored to the top-right of the chat interface by default
- The floating companion overlay includes a **pop-out button** to detach it as an external window (existing `companion-window.tsx` behavior)
- The overlay can be moved anywhere within the chat view by dragging

### What Already Exists

- `companion-window.tsx` — detachable companion window, already works
- `merged-companion-chat.tsx` — current two-panel layout, would be restructured
- Popup window mode via `/app/companion/[id]` and `/app/chat/[id]`

### What Needs to Change

- `merged-companion-chat.tsx` — chat takes full width, companion becomes an overlay within it
- The companion overlay needs drag-and-drop repositioning (CSS `position: fixed` + pointer event handlers or a lightweight drag library)
- The companion tab / chat tab switcher is removed — chat is always visible, companion is always the overlay

### Impact on Pending Tasks

The following Session 29/30 open items become **irrelevant** if this redesign is implemented:
- `/app/companion/[id]/page.tsx` full rewrite (item 8) — layout changes anyway
- `expressionState` dual source conflict (item 3) — restructuring will resolve naturally
- Processing / Speaking display logic (item 5) — restructuring will resolve naturally

The following remain relevant regardless:
- `lib/chat.ts` extraction (item 1) — still needed for cleaner architecture
- `lib/llm/brain.ts` state extraction (item 2) — still needed
- Mic disabled while AI speaks (item 6) — UI behavior, independent of layout
- Speaker becomes Stop while AI speaks (item 7) — UI behavior, independent of layout
- CSP header (item 11) — infrastructure, independent of layout
- `DEBUG_MODE` utility (item 13) — infrastructure, independent of layout
- `thinking` state (item 14) — behavior, independent of layout
- Model capabilities display (item 15) — independent of layout

### Status

> Under discussion — not started

---

## Goal 2 — Persistent Memory System

### Kai's Approach (Reference)

- The LLM stores discrete memory entries via tool calls (`remember()` / `recall()`)
- Each memory has a `hitCount` — incremented every time the memory is recalled
- Memories with `hitCount >= 5` are **promoted into the system prompt permanently**
- A background **heartbeat** (every 30 min, 8am–10pm) reviews memories and pending tasks
- Memories are injected automatically into every conversation

### Proposed Athena Implementation

#### Database

New `memories` store in `lib/db.ts` (IndexedDB):

```ts
interface Memory {
  id: string
  companionId: string          // per-companion memory bank
  content: string              // the stored fact / preference
  hitCount: number             // incremented on every recall
  promotedToSystemPrompt: boolean
  createdAt: number
  lastRecalledAt: number
}
```

#### Tool Integration

Two new tools in the LLM router:
- `remember(content: string)` — stores a new memory entry
- `recall(query: string)` — retrieves relevant memories by simple text match (no vector DB needed initially)

#### System Prompt Injection

`buildSystemPrompt()` updated to:
1. Query promoted memories (`promotedToSystemPrompt: true`) and inject them as a `## Long-term Memory` section
2. Query top N recent/high-hitCount memories and inject them as `## Recent Context`

#### Memory Promotion

After each `recall()` call, if `hitCount >= 5`, set `promotedToSystemPrompt = true` automatically.

#### Open Questions

- Per-companion or global? **Per-companion** — each companion has their own memory bank (more personal, more consistent with the companion model)
- Autonomous (LLM decides) or hybrid (user can also pin)? **Hybrid** — LLM calls `remember()` automatically, user can also pin/edit/delete memories via a Memory tab in the settings panel
- Heartbeat? **Deferred** — implement after core memory system is stable

### Status

> Under discussion — not started

---

## Goal 3 — PWA Install Prompt

> Being handled independently by Jiab77. Will be revisited if needed.

---

## Goal 4 — Other Kai Features Worth Considering

### Multi-Provider Fallback Chain

If the primary provider fails (rate limit, downtime), automatically retry with the next configured provider. Low complexity, high reliability value.

**Status:** Under consideration

### Web Search Tool (Groq)

Already partially planned. Groq has native compound model support for web search. OpenAI already has `web_search` tool support.

**Status:** Partially implemented (OpenAI), planned for Groq

### Conversation-Level System Prompt Override

Allow the user to inject a one-off instruction at the start of a conversation without editing the companion's permanent personality. Kai implements this as a "session note".

**Status:** Under consideration — low effort

### MCP Server Support

Allows Athena to call external tools via the Model Context Protocol. High complexity, very high extensibility value. Not a near-term priority.

**Status:** Future consideration

### Interactive UI Screens (AI-generated)

Kai's most unique feature — the AI can generate and render full interactive UI components mid-conversation. Very high complexity, unclear fit for Athena's companion-focused model.

**Status:** Not planned

---

## Feature Comparison Matrix

| Feature | Kai | Athena | Gap |
|---|---|---|---|
| Persistent memory + hitCount promotion | Yes | No | High value |
| Autonomous heartbeat | Yes | No | Deferred |
| Chat-first UI | Yes | No | UX priority |
| Draggable companion overlay | No | Partial (popup only) | Medium effort |
| Multi-provider fallback | Yes | No | Medium value |
| MCP server support | Yes | No | Future |
| Web search | Yes | Partial | Medium effort |
| Session prompt override | Yes | No | Low effort |
| Encrypted local storage | No | Yes | Athena advantage |
| BioLLM support | No | Yes | Athena advantage |
| Multi-avatar formats (2D/3D/live) | No | Yes | Athena advantage |
| Voice I/O (STT + TTS) | No | Yes | Athena advantage |
| ResembleAI TTS | No | Yes | Athena advantage |
| Document file attachments | No | Yes | Athena advantage |
