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

### [ ] Step: Fix cleanResponse and create browser inference engine

Create `lib/browser-engine.ts` (Transformers.js pipeline for in-browser WebGPU inference) and update `lib/clean-response.ts` to strip `<think>` blocks from model output.

- Install `@huggingface/transformers`
- Create `lib/browser-engine.ts` with singleton pipeline, lazy loading, progress callbacks, and status events
- Update `lib/clean-response.ts` to strip `<think>...</think>` blocks before other cleaning
- Verify: `npx tsc --noEmit && npm run lint && npm run build`

---

### [ ] Step: Build WebContainer sandbox

Create the in-browser sandbox using WebContainers to replace the Docker relay for demo use.

- Install `@webcontainer/api`
- Create `lib/webcontainer-sandbox.ts` (boot, exec, teardown singleton)
- Create `hooks/use-webcontainer.ts` (React hook: boot-on-first-run, exec, history tracking)
- Update `types/sandbox.d.ts` to make `auditId` optional
- Verify: `npx tsc --noEmit && npm run lint && npm run build`

---

### [ ] Step: Wire up UI — mode selector, browser translate, sandbox execution

Integrate browser inference and WebContainer sandbox into the main UI.

- Add inference mode selector (Cloud / Browser / Auto) to `components/shell-session.tsx`
- Update `hooks/use-translate.ts` to accept mode parameter and call browser engine directly in browser mode
- Replace `useSandbox()` with `useWebContainer()` in shell-session for WebContainer execution
- Update `components/execution-output.tsx` for optional auditId and command history display
- Verify: `npx tsc --noEmit && npm run lint && npm run build`

---

### [ ] Step: Configure COOP/COEP headers and CSP updates

Add required headers for WebContainers (SharedArrayBuffer) without breaking Vercel Analytics.

- Update `next.config.ts` with COOP/COEP headers (try `credentialless` first)
- Update CSP `connect-src` for WebContainer and Transformers.js origins
- Test that Vercel Analytics still loads; fall back to route-specific headers if broken
- Verify: `npx tsc --noEmit && npm run lint && npm run build`

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
