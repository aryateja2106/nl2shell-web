# NL2Shell — Next Steps Plan

## Current State (2026-03-31)
- Branch: `feat/leshell-sandbox` on `aryateja2106/nl2shell-web`
- 25 files, 1,353 lines added
- Build passes clean (tsc + next build)
- Relay server tested e2e: sessions, exec, security blocklist, persistence
- Domain: nl2shell.com (Cloudflare)
- Railway: connected via `agentr1xd` GitHub, $25 credits

---

## Phase A: Deploy (30 min)

### 1. Push branch and merge
```bash
cd ~/Projects/nl2shell-web
git push origin feat/leshell-sandbox
# Create PR, merge to main
```

### 2. DNS Setup (Cloudflare → Vercel)
In Cloudflare DNS for nl2shell.com:
- Type: `CNAME` | Name: `@` | Target: `cname.vercel-dns.com` | Proxy: OFF (DNS only)
- Type: `CNAME` | Name: `www` | Target: `cname.vercel-dns.com` | Proxy: OFF (DNS only)

In Vercel project settings → Domains:
- Add `nl2shell.com`
- Add `www.nl2shell.com` (redirects to root)

### 3. Railway Relay Deployment
In Railway dashboard:
1. New Project → GitHub Repository → select `nl2shell-web` from `agentr1xd`
   (or push relay/ as a separate repo)
2. Set root directory: `relay/`
3. Add env vars: `RELAY_PORT=4000`, `CORS_ORIGIN=https://nl2shell.com`
4. Deploy → get URL like `leshell-relay.up.railway.app`
5. Add to Vercel env: `SANDBOX_RELAY_URL=https://leshell-relay.up.railway.app`

---

## Phase B: UI Polish (2-3 hours)

### 1. Hero section rebrand
- Headline: "Your commands. Your machine. No cloud needed."
- Subtitle: Privacy-first NL→bash with a 400MB model that runs in your browser
- Stats: training pairs, model size, latency, "zero data sent to cloud"

### 2. Model selector UI
- Dropdown: "Cloud (HF Space)" vs "Browser (WebGPU)" vs "Local (Ollama)"
- Side-by-side comparison mode
- Show which model generated the command

### 3. Sandbox terminal polish
- Better loading states
- Session indicator (show active session ID)
- "New Session" button

### 4. robots.txt
```
User-agent: *
Allow: /
Sitemap: https://nl2shell.com/sitemap.xml
```

---

## Phase C: WebGPU Browser Inference (3-4 hours)

### 1. Install transformers.js
```bash
npm install @huggingface/transformers
```

### 2. Create WebGPU inference worker
- Load `AryaYT/nl2shell-0.8b` GGUF via transformers.js
- Web Worker to avoid blocking UI
- Progress bar during model download (~400MB)
- Cache in IndexedDB for instant reload

### 3. Model selector integration
- When "Browser" selected → use WebGPU worker
- No rate limits needed for browser inference
- Show "Running locally — your data never leaves your device"

---

## Phase D: Auth + Rate Limiting (2 hours)

### 1. Ghost.build integration
- Replace Supabase with Ghost.build
- Use ghost.build/agents.txt pattern

### 2. Auth (GitHub/Google)
- Anonymous: 5 requests/hour
- Authenticated: 50 requests/hour
- Browser inference: unlimited

### 3. Upstash Redis rate limiting
```bash
npm install @upstash/ratelimit @upstash/redis
```
- Replace in-memory Map in rate limiter
- Shared state across Vercel serverless instances

---

## Phase E: MCP Server (1-2 hours)

### 1. Create /api/mcp route
- MCP Streamable HTTP transport
- Tools: nl2shell_translate, sandbox_execute, sandbox_session_create
- Any agent can call: `{ "mcpServers": { "nl2shell": { "url": "https://nl2shell.com/api/mcp" } } }`

---

## Phase F: Documentation (1 hour)

### 1. README.md rewrite
- Product-focused, not project-focused
- Quick start for users, developers, and agents
- Architecture diagram

### 2. CONTRIBUTING.md
- How to add training data
- How to fine-tune
- How to add new tools

### 3. skill.md for Claude Code
- So Claude Code can discover and use nl2shell as a skill

---

## Overnight Build Candidates
These can run unattended:
1. WebGPU inference integration (well-defined, isolated)
2. UI polish (component-level changes, safe)
3. README + docs (no code risk)

These need supervision:
1. Railway deployment (needs manual config)
2. Auth integration (needs API keys)
3. DNS setup (manual Cloudflare step)
