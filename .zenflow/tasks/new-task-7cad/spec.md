# Technical Specification: NL2Shell Web — Browser Inference, Sandbox, and Deployment

**Difficulty:** Hard
**Rationale:** Multiple interacting subsystems (browser inference pipeline, WebContainer sandbox, COOP/COEP headers affecting third-party scripts, Vercel deployment), significant new code, and cross-cutting concerns (CSP headers, Vercel Analytics compatibility).

---

## Technical Context

- **Framework:** Next.js 16.1.6 (App Router), React 19.2, TypeScript (strict)
- **Styling:** Tailwind CSS 4, shadcn/ui components
- **Current inference:** Cloud-only via `@gradio/client` → HuggingFace Space `AryaYT/nl2shell-demo`
- **Current sandbox:** Docker relay server (`relay/`) — not deployed, requires Railway
- **Deployment target:** Vercel (project linked in `.vercel/project.json`)
- **Domain:** nl2shell.com (Cloudflare DNS)
- **No test framework configured** — no test files exist

---

## Current State Analysis

### What exists
| Component | Status | Location |
|-----------|--------|----------|
| Cloud translation API | Working | `app/api/translate/route.ts` |
| `useTranslate` hook | Working | `hooks/use-translate.ts` |
| Docker relay sandbox | Implemented, not deployed | `relay/`, `hooks/use-sandbox.ts`, `app/api/execute/route.ts` |
| `cleanResponse()` | Working for cloud mode | `lib/clean-response.ts` |
| Safety checks | Working (22 patterns) | `lib/safety.ts` |
| MCP server | Working | `app/api/mcp/route.ts` |
| Vercel Analytics | Configured in layout | `app/layout.tsx` |

### What's missing
| Component | Status | Notes |
|-----------|--------|-------|
| `lib/browser-engine.ts` | **Does not exist** | SPEC says "fix" but file is absent — must create from scratch |
| `<think>` block stripping | Missing in `cleanResponse()` | Current regex handles markdown fences, not `<think>` tags |
| WebContainer sandbox | Not started | Replaces Docker relay for demo use case |
| COOP/COEP headers | Not configured | Required by WebContainers for SharedArrayBuffer |
| Mode selector UI | Not implemented | No Cloud/Browser/Auto toggle in current UI |
| Vercel deployment | Not done | Domain not configured |

---

## Implementation Approach

### Task 1: Browser Inference Engine (Create `lib/browser-engine.ts`)

**New dependency:** `@huggingface/transformers` (Transformers.js v3)

**Architecture:**
- Singleton pipeline pattern — load model once, reuse across calls
- `"use client"` module (WebGPU is browser-only)
- Chat-template messages format for Qwen3.5 instruction model
- System prompt matches the Gradio Space's prompt for consistency

**Pipeline output shape** (Transformers.js `text-generation` with chat messages):
```typescript
// Returns: Array<{ generated_text: Array<{ role: string; content: string }> }>
// The assistant's response is the last message in generated_text
```

**Key design decisions:**
- Use `onnx-community/Qwen2.5-0.5B-Instruct` as initial model (smaller, faster for demo; SPEC's `Qwen3.5-0.8B-ONNX` can replace later when converted)
- Model ID configurable via constant for easy swap
- Progress callback for download/load status reporting to UI
- Lazy loading — pipeline only created on first `generate()` call

**Interface:**
```typescript
export interface BrowserEngineStatus {
  stage: "idle" | "downloading" | "loading" | "ready" | "generating" | "error";
  progress?: number; // 0-100 for download
  error?: string;
}

export function generate(query: string): Promise<string>
export function getStatus(): BrowserEngineStatus
export function isReady(): boolean
export function onStatusChange(cb: (s: BrowserEngineStatus) => void): () => void
```

### Task 1b: Fix `cleanResponse()` for `<think>` blocks

The Qwen model family (especially instruction-tuned variants) often wraps reasoning in `<think>...</think>` tags before the actual answer. Current `cleanResponse()` only handles markdown fences.

**Changes to `lib/clean-response.ts`:**
- Add `<think>` block stripping as the FIRST operation (before markdown fence removal)
- Regex: `/^<think>[\s\S]*?<\/think>\s*/` — matches `<think>` at start, any content (including newlines), closing tag, trailing whitespace
- Handle edge cases: empty think block, no think block, think block with no content after it

### Task 2: WebContainer Sandbox

**New dependency:** `@webcontainer/api`

**Architecture:**
- `lib/webcontainer-sandbox.ts` — singleton WebContainer boot, exec, teardown
- `hooks/use-webcontainer.ts` — React state management, boot-on-first-run, command history
- Replaces Docker relay for the web demo (relay code stays for self-hosted/MCP use)

**Key design decisions:**
- WebContainer boots lazily on first "Run" click, not on page load (saves resources)
- Command history persists in hook state (not localStorage — session-scoped)
- `ExecResult` interface mirrors existing `ExecutionResult` type but without `auditId` (no server-side audit for browser sandbox)
- The `useSandbox` hook is replaced by `useWebContainer` in `shell-session.tsx` when `NEXT_PUBLIC_SANDBOX_ENABLED` is `"webcontainer"` or `true`

**WebContainer ExecResult:**
```typescript
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
```

### Task 3: COOP/COEP Headers

**Problem:** WebContainers require `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers for SharedArrayBuffer. These headers can break:
- Vercel Analytics (`@vercel/analytics`) — loads external script
- Gradio client connections to `huggingface.co`
- Any third-party iframe/script

**Strategy:**
1. First try `credentialless` instead of `require-corp` for COEP (less restrictive, Chrome 96+)
2. If WebContainers work with `credentialless`, use that globally
3. If not, add strict COOP/COEP only to a `/sandbox` route segment and keep main page without them
4. Test Vercel Analytics compatibility in each configuration

**Changes to `next.config.ts`:**
- Add COOP/COEP headers (strategy TBD based on testing)
- Update CSP `connect-src` to allow WebContainer origins if needed

### Task 4: Wire Up UI

**Changes to `components/shell-session.tsx`:**
- Add mode selector (Cloud / Browser / Auto) — simple button group or dropdown
- In Browser mode: use `generate()` from `lib/browser-engine.ts` instead of `POST /api/translate`
- Auto mode: try browser first, fall back to cloud on error
- Show model download progress bar when Browser mode first loads
- Replace `useSandbox()` with `useWebContainer()` for execution

**Changes to `components/execution-output.tsx`:**
- Make `auditId` optional (WebContainer exec has no audit trail)
- Support rendering command history (multiple exec results in sequence)

**Changes to `hooks/use-translate.ts`:**
- Accept a `mode` parameter or create a new `useBrowserTranslate` hook
- Browser mode calls `generate()` directly (no fetch)

### Task 5: Deployment

- Merge to main, push, Vercel auto-deploys
- Set env vars: `HF_TOKEN`, `NEXT_PUBLIC_SANDBOX_ENABLED=true`
- Configure domain: nl2shell.com CNAME → cname.vercel-dns.com (Cloudflare, DNS-only)
- Verify SSL, headers, all modes working

### Task 6: Cloud Mode UX Improvements (if time permits)

- Better loading states for 503 (Space sleeping)
- Auto-retry on 503 with "Model is waking up..." message
- Already partially handled in `route.ts` error responses

---

## Source Code Structure Changes

### New files
| File | Purpose |
|------|---------|
| `lib/browser-engine.ts` | Transformers.js pipeline, model loading, text generation |
| `lib/webcontainer-sandbox.ts` | WebContainer boot, exec, teardown singleton |
| `hooks/use-webcontainer.ts` | React hook for sandbox lifecycle + history |

### Modified files
| File | Changes |
|------|---------|
| `lib/clean-response.ts` | Add `<think>` block stripping |
| `components/shell-session.tsx` | Mode selector, browser inference path, WebContainer sandbox |
| `components/execution-output.tsx` | Optional `auditId`, history rendering |
| `hooks/use-translate.ts` | Support browser mode (or new hook) |
| `next.config.ts` | COOP/COEP headers, CSP updates |
| `package.json` | Add `@huggingface/transformers`, `@webcontainer/api` |
| `types/sandbox.d.ts` | Add `WebContainerExecResult` or make `auditId` optional |

### Unchanged (no modifications needed)
| File | Reason |
|------|--------|
| `app/api/translate/route.ts` | Cloud mode stays as-is |
| `app/api/execute/route.ts` | Docker relay stays for future self-hosted use |
| `relay/*` | Docker relay untouched |
| `lib/safety.ts` | Already handles both modes' output |
| `app/layout.tsx` | Vercel Analytics stays; COOP/COEP handled in next.config.ts |

---

## Interface Changes

### `ExecutionResult` type update
```typescript
// types/sandbox.d.ts
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  auditId?: string; // Optional — absent for WebContainer exec
}
```

### New `InferenceMode` type
```typescript
type InferenceMode = "cloud" | "browser" | "auto";
```

### `useTranslate` hook extension
```typescript
// Option A: mode parameter
export function useTranslate(mode?: InferenceMode)

// Option B: separate hook for browser (cleaner separation)
export function useBrowserTranslate()
```

Decision: **Option A** — single hook with mode parameter, keeps `shell-session.tsx` simpler.

---

## Verification Approach

After each implementation step:
```bash
npx tsc --noEmit       # Zero type errors
npm run lint           # Zero lint errors
npm run build          # Clean production build
```

Manual testing (dev server):
1. Cloud mode: query → shell command (existing flow, regression check)
2. Browser mode: model downloads → query → shell command (no `<think>` in output)
3. Sandbox: boot WebContainer → execute → see output → filesystem persists
4. Mode selector: all three modes switch correctly
5. Danger warning: `rm -rf /` shows red badge in all modes

Production verification:
```bash
curl -I https://nl2shell.com  # 200 OK, correct headers
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| COOP/COEP breaks Vercel Analytics | Medium | Test `credentialless` first; fallback to route-specific headers |
| WebContainer boot slow (>5s) | Low | Lazy boot on first "Run", show spinner |
| Transformers.js model too large | Medium | Start with 0.5B model (~300MB ONNX); upgrade to fine-tuned later |
| CSP blocks WebContainer origins | Medium | Add required origins to `connect-src` incrementally |
| HF Space sleeping on first visit | Low | Already handled with 503 retry messages in translate API |

---

## Dependencies to Install

```bash
npm install @huggingface/transformers @webcontainer/api
```

- `@huggingface/transformers` — Transformers.js v3, ONNX Runtime Web, WebGPU inference
- `@webcontainer/api` — StackBlitz WebContainers for in-browser command execution
