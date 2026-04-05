# Spec and build

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification
<!-- chat-id: 1b6043e3-cc74-4de4-bcfa-6d46671c8fcc -->

Assessed as **hard** — multiple interacting subsystems, new dependencies, cross-cutting header concerns.
Full spec saved to `.zenflow/tasks/new-task-7cad/spec.md`.

---

### [x] Step: Fix cleanResponse and create browser inference engine
<!-- chat-id: 21de9e58-71d9-4162-803c-27c158597d60 -->

Create `lib/browser-engine.ts` (Transformers.js pipeline for in-browser WebGPU inference) and update `lib/clean-response.ts` to strip `<think>` blocks from model output.

- [x] Install `@huggingface/transformers`
- [x] Create `lib/browser-engine.ts` with singleton pipeline, lazy loading, progress callbacks, and status events
- [x] Update `lib/clean-response.ts` to strip `<think>...</think>` blocks before other cleaning
- [x] Exclude `relay/` from tsconfig (pre-existing build error)
- [x] Verify: `npx tsc --noEmit && npm run lint && npm run build`

---

### [x] Step: Build WebContainer sandbox
<!-- chat-id: cc61929e-9c30-4982-988d-8b378c61693a -->

Create the in-browser sandbox using WebContainers to replace the Docker relay for demo use.

- [x] Install `@webcontainer/api`
- [x] Create `lib/webcontainer-sandbox.ts` (boot, exec, teardown singleton)
- [x] Create `hooks/use-webcontainer.ts` (React hook: boot-on-first-run, exec, history tracking)
- [x] Update `types/sandbox.d.ts` to make `auditId` optional
- [x] Verify: `npx tsc --noEmit && npm run lint && npm run build`

---

### [x] Step: Wire up UI — mode selector, browser translate, sandbox execution
<!-- chat-id: 8572affb-4f18-4853-9070-1e593f4975cc -->

Integrate browser inference and WebContainer sandbox into the main UI.

- [x] Add inference mode selector (Cloud / Browser / Auto) to `components/shell-session.tsx`
- [x] Update `hooks/use-translate.ts` to accept mode parameter and call browser engine directly in browser mode
- [x] Replace `useSandbox()` with `useWebContainer()` in shell-session for WebContainer execution
- [x] Update `components/execution-output.tsx` for optional auditId and command history display
- [x] Verify: `npx tsc --noEmit && npm run lint && npm run build`

---

### [x] Step: Configure COOP/COEP headers and CSP updates
<!-- chat-id: d33e4a06-2d42-4dbb-b5c8-3bc822e2fc52 -->

Add required headers for WebContainers (SharedArrayBuffer) without breaking Vercel Analytics.

- [x] Update `next.config.ts` with COOP/COEP headers (try `credentialless` first)
- [x] Update CSP `connect-src` for WebContainer and Transformers.js origins
- [x] Test that Vercel Analytics still loads; fall back to route-specific headers if broken
- [x] Verify: `npx tsc --noEmit && npm run lint && npm run build`

---

### [ ] Step: Deploy to Vercel and configure nl2shell.com domain

Push to main, verify auto-deploy, configure domain and env vars.

- Merge feature branch to main
- Set Vercel env vars: `HF_TOKEN`, `NEXT_PUBLIC_SANDBOX_ENABLED`
- Configure nl2shell.com CNAME → cname.vercel-dns.com in Cloudflare (DNS-only)
- Verify: `curl -I https://nl2shell.com` returns 200 with correct headers
- Manual smoke test: Cloud mode, Browser mode, Sandbox execution

---

### [ ] Step: Write implementation report

- Write `{@artifacts_path}/report.md` describing what was implemented, how it was tested, and challenges encountered
