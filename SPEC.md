# SPEC: NL2Shell Web — Browser Inference Fix, Sandbox, and Deployment

**Project:** nl2shell-web  
**Branch:** `feat/webllm-browser-inference`  
**Repository:** github.com/nl2shell/nl2shell-web  
**Date:** 2026-04-04  
**Goal:** Ship a working NL2Shell web app with browser-side inference, persistent sandbox execution, and production deployment at nl2shell.com

---

## Context

NL2Shell translates natural language to shell commands using a fine-tuned Qwen3.5-0.8B model. The web app has two inference modes:

- **Cloud:** Calls a HuggingFace Gradio Space (`AryaYT/nl2shell-demo`) via `/api/translate`
- **Browser:** Runs a Qwen3.5 ONNX model locally via WebGPU using `@huggingface/transformers`

The Browser mode was recently added but has bugs. The sandbox (command execution) uses a Docker relay server that isn't deployed yet. The app needs to be deployed to nl2shell.com via Vercel.

---

## Current Issues

1. **Browser inference returns empty response** — The `lib/browser-engine.ts` Transformers.js pipeline output parsing is incorrect. The model generates text but `cleanResponse()` strips everything, leaving empty output. The `<think>` block stripping and the output format from `pipeline("text-generation")` need debugging.

2. **No working sandbox** — The relay server requires Docker and a separate deployment (Railway). For the demo use case, we need a lightweight sandbox where users can execute generated commands and see results, with filesystem persistence between commands.

3. **Not deployed** — The app runs locally but isn't deployed to nl2shell.com yet.

---

## Task Breakdown

### Task 1: Fix Browser Inference Output Parsing

**Priority:** Critical  
**Files:** `lib/browser-engine.ts`, `lib/clean-response.ts`  
**Estimated effort:** Small

**Problem:** The `generate()` function in `lib/browser-engine.ts` calls `pipelineInstance(messages, ...)` but the return format from Transformers.js `text-generation` pipeline varies. The current code tries:
```typescript
const raw = result[0]?.generated_text?.at(-1)?.content ?? result[0]?.generated_text ?? "";
```
This may not match the actual output shape. Additionally, `cleanResponse()` may be too aggressive — the `<think>` block regex could strip the entire output if the model puts the command inside or after a think block.

**Steps:**
1. Read `lib/browser-engine.ts` fully to understand the current `generate()` function
2. Add `console.log(JSON.stringify(result, null, 2))` temporarily inside `generate()` to see the raw pipeline output shape
3. Run the dev server (`npm run dev`) and test with Browser mode — observe the console output
4. Fix the output extraction based on actual shape. The Transformers.js `text-generation` pipeline with chat messages typically returns:
   ```javascript
   [{ generated_text: [
     { role: "system", content: "..." },
     { role: "user", content: "..." },
     { role: "assistant", content: "THE COMMAND HERE" }
   ]}]
   ```
   So the extraction should be:
   ```typescript
   const messages = result[0]?.generated_text;
   const lastMsg = Array.isArray(messages) ? messages.at(-1) : null;
   const raw = typeof lastMsg === "object" && lastMsg?.content 
     ? lastMsg.content 
     : typeof messages === "string" 
       ? messages 
       : "";
   ```
5. Update `lib/clean-response.ts` — ensure the `<think>` regex handles edge cases:
   - Empty think block: `<think>\n</think>` followed by the command
   - Think block with content followed by command on next line
   - No think block at all (just the command)
6. Remove the `console.log` debug line
7. Test with multiple queries: "list files", "create a branch called feature-auth", "find python files modified today"

**Verification:**
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Then manually test in Chrome with Browser mode — each query should return a clean shell command.

**Acceptance criteria:**
- Browser mode returns valid shell commands (not empty, not `<think>` blocks)
- Cloud mode still works unchanged
- All build checks pass

---

### Task 2: Build In-Browser Sandbox with WebContainers

**Priority:** High  
**Files to create:**
- `lib/webcontainer-sandbox.ts` — WebContainer boot, exec, file ops
- `hooks/use-webcontainer.ts` — React hook for sandbox lifecycle
- `components/sandbox-terminal.tsx` — Terminal-like output display

**Files to modify:**
- `components/shell-session.tsx` — Wire sandbox execution
- `components/execution-output.tsx` — Update to show persistent session
- `package.json` — Add `@webcontainer/api`

**Context:** Instead of requiring a Docker relay server, use WebContainers (StackBlitz) to run commands entirely in the browser. This eliminates infrastructure costs and works offline. The sandbox persists state between commands — users can create files, then list them, then modify them.

**Steps:**

#### 2a. Install WebContainers
```bash
cd /Users/aryateja/Projects/nl2shell-org/nl2shell-web
npm install @webcontainer/api
```

#### 2b. Create `lib/webcontainer-sandbox.ts`
```typescript
"use client";

import { WebContainer } from "@webcontainer/api";

let container: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function bootSandbox(): Promise<void> {
  if (container) return;
  if (bootPromise) {
    await bootPromise;
    return;
  }
  bootPromise = WebContainer.boot();
  try {
    container = await bootPromise;
    // Seed with a basic workspace
    await container.mount({
      workspace: {
        directory: {},
      },
    });
  } catch (err) {
    bootPromise = null;
    throw err;
  }
}

export function isSandboxReady(): boolean {
  return container !== null;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export async function execCommand(command: string): Promise<ExecResult> {
  if (!container) throw new Error("Sandbox not booted");

  const start = performance.now();
  const process = await container.spawn("bash", ["-c", command], {
    cwd: "/workspace",
  });

  let stdout = "";
  let stderr = "";

  process.output.pipeTo(
    new WritableStream({
      write(chunk) {
        stdout += chunk;
      },
    })
  );

  // WebContainers merge stderr into output in some cases
  const exitCode = await process.exit;
  const durationMs = Math.round(performance.now() - start);

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode, durationMs };
}

export async function teardownSandbox(): Promise<void> {
  if (container) {
    container.teardown();
    container = null;
    bootPromise = null;
  }
}
```

#### 2c. Create `hooks/use-webcontainer.ts`
```typescript
"use client";

import { useCallback, useState } from "react";

interface SandboxState {
  isReady: boolean;
  isBooting: boolean;
  isExecuting: boolean;
  output: { stdout: string; stderr: string; exitCode: number } | null;
  error: string | null;
  history: Array<{
    command: string;
    stdout: string;
    exitCode: number;
    timestamp: number;
  }>;
}

export function useWebContainer() {
  const [state, setState] = useState<SandboxState>({
    isReady: false,
    isBooting: false,
    isExecuting: false,
    output: null,
    error: null,
    history: [],
  });

  const sandboxRef = useRef<typeof import("@/lib/webcontainer-sandbox") | null>(null);

  const getSandbox = useCallback(async () => {
    if (!sandboxRef.current) {
      sandboxRef.current = await import("@/lib/webcontainer-sandbox");
    }
    return sandboxRef.current;
  }, []);

  const boot = useCallback(async () => {
    setState((s) => ({ ...s, isBooting: true, error: null }));
    try {
      const sb = await getSandbox();
      await sb.bootSandbox();
      setState((s) => ({ ...s, isReady: true, isBooting: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isBooting: false,
        error: err instanceof Error ? err.message : "Failed to boot sandbox",
      }));
    }
  }, [getSandbox]);

  const execute = useCallback(
    async (command: string) => {
      setState((s) => ({ ...s, isExecuting: true, output: null, error: null }));
      try {
        const sb = await getSandbox();
        if (!sb.isSandboxReady()) await sb.bootSandbox();
        const result = await sb.execCommand(command);
        setState((s) => ({
          ...s,
          isExecuting: false,
          output: result,
          history: [
            ...s.history,
            {
              command,
              stdout: result.stdout,
              exitCode: result.exitCode,
              timestamp: Date.now(),
            },
          ],
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isExecuting: false,
          error: err instanceof Error ? err.message : "Execution failed",
        }));
      }
    },
    [getSandbox]
  );

  return { ...state, boot, execute };
}
```

#### 2d. Update `components/shell-session.tsx`
- Replace `useSandbox()` with `useWebContainer()` (or make it a fallback)
- Auto-boot sandbox when user clicks "Run" for the first time
- Show sandbox history (all commands + outputs in sequence)
- The `NEXT_PUBLIC_SANDBOX_ENABLED` env var should default to `true` when using WebContainers (no relay needed)

#### 2e. Update `next.config.ts`
Add required headers for WebContainers (SharedArrayBuffer):
```typescript
{
  key: "Cross-Origin-Embedder-Policy",
  value: "require-corp",
},
{
  key: "Cross-Origin-Opener-Policy", 
  value: "same-origin",
},
```
**IMPORTANT:** These headers may break Vercel Analytics and other third-party scripts. Test carefully. If they break, add them only to specific routes or make sandbox a separate page.

#### 2f. Test the sandbox flow
1. User types "create 5 python files named app.py, utils.py, config.py, test.py, main.py"
2. Model generates: `touch app.py utils.py config.py test.py main.py`
3. User clicks "Run" — sandbox boots, executes, shows empty output (success)
4. User types "list all files sorted by size"
5. Model generates: `ls -lS`
6. User clicks "Run" — sandbox executes, shows the 5 files
7. Files persist because WebContainer is still alive

**Verification:**
```bash
npx tsc --noEmit && npm run lint && npm run build
```

**Acceptance criteria:**
- Sandbox boots in <3 seconds
- Commands execute and show stdout/stderr
- Filesystem persists between commands
- History shows all previous commands + outputs
- All build checks pass

---

### Task 3: Update COOP/COEP Headers Strategy

**Priority:** Medium  
**Files:** `next.config.ts`

**Problem:** WebContainers require `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`. These headers may break third-party scripts (Vercel Analytics, Supabase, Gradio client).

**Steps:**
1. Test if adding COOP/COEP headers to ALL routes breaks Vercel Analytics
2. If it does, create a separate route `/sandbox` that has the headers, and keep the main page without them
3. Alternatively, use `credentialless` instead of `require-corp` for COEP (less restrictive)
4. If WebContainers work without COOP/COEP in Chrome (they sometimes do), skip the headers entirely

**Verification:** Load the page, check that Vercel Analytics loads, and that WebContainers boot.

---

### Task 4: Deploy to Vercel (nl2shell.com)

**Priority:** High  
**Files:** None (git + Vercel CLI operations)

**Steps:**

#### 4a. Merge feature branch to main
```bash
cd /Users/aryateja/Projects/nl2shell-org/nl2shell-web
git add -A
git commit -m "feat: add browser inference (Transformers.js) + WebContainer sandbox"
git push origin feat/webllm-browser-inference
# Create PR via GitHub CLI
gh pr create --title "feat: browser inference + sandbox" --body "..."
gh pr merge --squash
```

#### 4b. Verify Vercel auto-deployment
The `.vercel/project.json` links to Vercel project `prj_0mLK6SAEeGdDgSk1zPMhCXguX3RP`. Pushing to main should trigger auto-deploy.

Check deployment status:
```bash
npx vercel ls
```

#### 4c. Set environment variables in Vercel
Go to Vercel dashboard or use CLI:
```bash
npx vercel env add HF_TOKEN production
npx vercel env add NEXT_PUBLIC_SANDBOX_ENABLED production  # Set to "true"
```

#### 4d. Configure domain (nl2shell.com)
In Vercel dashboard:
1. Go to project settings > Domains
2. Add `nl2shell.com` and `www.nl2shell.com`
3. Vercel will show required DNS records

In Cloudflare dashboard for nl2shell.com:
1. Add CNAME record: `@` -> `cname.vercel-dns.com` (DNS only, NOT proxied)
2. Add CNAME record: `www` -> `cname.vercel-dns.com` (DNS only, NOT proxied)
3. Wait for DNS propagation (usually <5 minutes)

#### 4e. Verify production
```bash
curl -I https://nl2shell.com
# Should return 200 OK with correct headers
```

Open https://nl2shell.com in browser:
1. Cloud mode works (generates commands)
2. Browser mode loads model and generates commands
3. Sandbox executes commands (if WebContainers work with COOP/COEP)

**Acceptance criteria:**
- https://nl2shell.com loads and shows the NL2Shell interface
- Cloud mode generates shell commands
- Browser mode loads the ONNX model and generates commands
- SSL certificate is valid
- All security headers present

---

### Task 5: Fix Cloud Mode Performance

**Priority:** Medium  
**Files:** `app/api/translate/route.ts`

**Problem:** The HuggingFace Gradio Space (`AryaYT/nl2shell-demo`) runs on free CPU tier and takes 30-40 seconds per request. It also sleeps after inactivity.

**Steps:**
1. Check if the Gradio space is awake: `curl https://huggingface.co/spaces/AryaYT/nl2shell-demo`
2. If it's sleeping, consider upgrading to a paid GPU tier or using a different backend
3. For now, improve the UX by showing better loading states:
   - Show "Model is waking up..." when 503 is returned
   - Show estimated wait time
   - Auto-retry after 5 seconds on 503
4. Consider adding a FastAPI backend as an alternative to Gradio (faster cold starts, deployable on Vercel)

**Verification:** Cloud mode should respond in <15 seconds for warm requests.

---

### Task 6: Convert Fine-Tuned Model to ONNX (Follow-up)

**Priority:** Low (post-launch)  
**Files:** New Python project or script

**Context:** The current browser mode uses the BASE Qwen3.5-0.8B-ONNX model (from onnx-community), not the fine-tuned NL2Shell model. The fine-tuned model (`AryaYT/nl2shell-0.8b`) produces much better results for shell commands.

**Blocker:** ONNX export requires `transformers >= 5.x` (git main) + `optimum` from git main. These have dependency conflicts. The Transformers.js converter script (`scripts/convert.py` in the transformers.js repo) may handle this better.

**Steps:**
1. Clone the Transformers.js repo: `git clone https://github.com/huggingface/transformers.js`
2. Use their conversion script:
   ```bash
   python scripts/convert.py --model_id AryaYT/nl2shell-0.8b --quantize --task text-generation
   ```
3. If conversion succeeds, upload to HuggingFace as `AryaYT/nl2shell-0.8b-ONNX`
4. Update `lib/browser-engine.ts` to point to the fine-tuned ONNX model
5. Test quality: the fine-tuned model should output clean commands without `<think>` blocks

**Alternative:** If ONNX conversion fails for Qwen3.5 architecture, wait for MLC-LLM to add official Qwen3.5 support (tracked at mlc-ai/web-llm#778).

---

## Architecture Diagram

```
                    nl2shell.com (Vercel)
                           |
            +--------------+--------------+
            |              |              |
     [Cloud Mode]   [Browser Mode]  [Sandbox]
            |              |              |
   /api/translate    Transformers.js  WebContainers
            |         (WebGPU)       (in-browser)
            |              |              |
    HuggingFace      ONNX Model     bash, node
    Gradio Space     (IndexedDB      filesystem
    (Qwen3.5)        cached)         persists
```

## File Change Summary

| File | Action | Task |
|------|--------|------|
| `lib/browser-engine.ts` | Modify | Task 1 |
| `lib/clean-response.ts` | Modify | Task 1 |
| `lib/webcontainer-sandbox.ts` | Create | Task 2 |
| `hooks/use-webcontainer.ts` | Create | Task 2 |
| `components/shell-session.tsx` | Modify | Task 2 |
| `components/execution-output.tsx` | Modify | Task 2 |
| `next.config.ts` | Modify | Task 3 |
| `package.json` | Modify | Task 2 |

## Build Verification (Run After Every Task)

```bash
cd /Users/aryateja/Projects/nl2shell-org/nl2shell-web
npx tsc --noEmit       # Zero type errors
npm run lint           # Zero lint errors
npm run build          # Clean production build
```

## Testing Checklist

- [ ] Cloud mode: type query, get shell command, <15s response
- [ ] Browser mode: load model (~400MB), type query, get shell command
- [ ] Browser mode: no `<think>` blocks in output
- [ ] Sandbox: boot WebContainer, execute command, see output
- [ ] Sandbox: create files, then list them (persistence between commands)
- [ ] Sandbox: history shows all previous commands
- [ ] Mode selector: Cloud/Browser/Auto all work correctly
- [ ] Danger warning: `rm -rf /` shows red warning badge
- [ ] Mobile: Cloud mode works, Browser/Sandbox disabled gracefully
- [ ] Production: nl2shell.com loads, SSL valid, all modes work
