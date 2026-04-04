# NL2Shell Web

Stop using ChatGPT for shell commands. Type what you want in plain English, get the shell command instantly.

**Live:** [nl2shell-web.vercel.app](https://nl2shell-web.vercel.app)

## What is this?

A web interface for the [NL2Shell model](https://huggingface.co/AryaYT/nl2shell-0.8b) — a fine-tuned 800M parameter model (Qwen3.5-0.8B) that translates natural language to shell commands. No API keys, no subscription.

## Architecture

```
Browser → Next.js on Vercel → Gradio Space API → NL2Shell Model (HuggingFace)
                ↓
        Supabase (feedback + analytics, optional)
```

| Component | Stack | Location |
|-----------|-------|----------|
| Frontend | Next.js 16, React 19, Tailwind 4, shadcn/ui | Vercel |
| API | Next.js Route Handlers (serverless) | Vercel |
| Model | Qwen3.5-0.8B + QLoRA fine-tune | HuggingFace Space |
| Database | Supabase (optional) | Supabase Cloud |
| Analytics | Vercel Analytics + Speed Insights | Vercel |

## Features

- Text input with Enter-to-submit
- Voice input via Web Speech API (Chrome/Edge)
- Dangerous command detection (22 patterns)
- Copy-to-clipboard
- Feedback collection (thumbs up/down + corrections)
- Command history (last 20, session-only)
- Structured logging (Vercel-compatible JSON)
- Security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting (30 translations/min, 10 feedback/min per IP)

## Quick Start

```bash
git clone https://github.com/nl2shell/nl2shell-web.git
cd nl2shell-web
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local`:

```bash
# Optional: HuggingFace token (avoids anonymous rate limits)
HF_TOKEN=hf_your_token_here

# Optional: Supabase (enables feedback persistence + analytics)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional: IP hashing salt for privacy
IP_SALT=your-random-salt
```

The app works without any environment variables. Supabase integration is opt-in — without it, feedback is logged to stdout only.

## Database Setup (Optional)

If you want to persist feedback and track usage:

1. Create a [Supabase](https://supabase.com) project (free tier: 500MB)
2. Run `supabase/schema.sql` in the SQL Editor
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env.local`

Useful queries once data is flowing:

```sql
-- Daily translation count
SELECT date_trunc('day', created_at) AS day, count(*)
FROM translations GROUP BY 1 ORDER BY 1 DESC;

-- Feedback summary
SELECT rating, count(*) FROM feedback GROUP BY rating;

-- Corrections for training data
SELECT query, command, correction FROM feedback
WHERE rating = 'down' AND correction IS NOT NULL;
```

## Scale & Cost Protection

**Vercel Hobby plan** (free):
- 100K function invocations/month — blocks after that (no surprise bills)
- 100GB bandwidth/month

**HuggingFace Space** (free CPU tier):
- Sleeps after 48h inactivity, wakes on request (~30s cold start)
- CPU inference: 1-15s per query depending on length
- Queues under load — won't cost money, just gets slow

**Rate limiting:**
- 30 translations per IP per minute (in-memory, resets on cold start)
- For production at scale: replace with [Upstash Redis](https://upstash.com) (free: 10K commands/day)

**If you get a million users:** The HF Space will queue and timeout before billing becomes an issue. Vercel Hobby blocks at limits. Upgrade path: Vercel Pro ($20/mo) + HF Dedicated Inference ($0.60/hr GPU).

## API

### POST /api/translate

```bash
curl -X POST https://nl2shell-web.vercel.app/api/translate \
  -H "Content-Type: application/json" \
  -d '{"query": "find all python files"}'
```

Response: `{"command": "find . -name '*.py'", "meta": "..."}`

### POST /api/feedback

```bash
curl -X POST https://nl2shell-web.vercel.app/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"query": "list files", "command": "ls", "rating": "up"}'
```

## Related

- [NL2Shell Model](https://huggingface.co/AryaYT/nl2shell-0.8b) — The fine-tuned model
- [NL2Shell Dataset](https://huggingface.co/datasets/AryaYT/nl2shell-training) — 12,834 training pairs
- [Gradio Demo](https://huggingface.co/spaces/AryaYT/nl2shell-demo) — Direct model interface
- [Vox CLI](https://github.com/aryateja2106/vox) — Terminal client
- [CloudAGI](https://github.com/aryateja2106/cloudagi) — Agent Credit Economy

## License

MIT
