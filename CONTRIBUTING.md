# Contributing to NL2Shell

NL2Shell is a privacy-first, local-first tool that translates natural language to shell commands using a fine-tuned 800M parameter model. Contributions that improve the model, the web interface, or the developer experience are welcome.

## Quick Start

```bash
git clone https://github.com/aryateja2106/nl2shell-web.git
cd nl2shell-web
npm install
npm run dev
```

The app runs at `http://localhost:3000`. The Hono relay server starts alongside it for local model inference proxying.

## Project Structure

```
app/          Next.js 16 app router — pages, layouts, API routes
components/   Shared React 19 UI components
hooks/        Custom React hooks (inference state, history, etc.)
relay/        Hono relay server — bridges browser to local model
lib/          Utility functions, model config, Docker sandbox helpers
types/        TypeScript type definitions shared across the project
```

## How to Add Training Data

Training data lives in the HuggingFace dataset [AryaYT/nl2shell-training-v3](https://huggingface.co/datasets/AryaYT/nl2shell-training-v3).

Each example is a JSON object:

```json
{
  "instruction": "find all files modified in the last 24 hours",
  "output": "find . -mtime -1 -type f"
}
```

Guidelines:
- Instructions should be natural, conversational English
- Outputs must be valid bash — test before submitting
- Avoid commands that require root or destructive defaults (`rm -rf`, `dd`, etc.) unless the intent is clearly scoped
- Prefer portable POSIX commands over distro-specific ones when both work

To contribute examples, open a PR against the dataset repo or file an issue here with a batch of examples.

## How to Fine-Tune

The base model is [AryaYT/nl2shell-0.8b](https://huggingface.co/AryaYT/nl2shell-0.8b) on HuggingFace.

```bash
# Install dependencies
pip install transformers datasets peft trl

# Fine-tune with LoRA (recommended for consumer hardware)
python scripts/finetune.py \
  --model AryaYT/nl2shell-0.8b \
  --dataset AryaYT/nl2shell-training-v3 \
  --output ./nl2shell-finetuned \
  --lora-r 16 \
  --epochs 3
```

The model is small enough to fine-tune on a single consumer GPU (8GB VRAM) using LoRA. Export to GGUF for local inference via llama.cpp or use the HuggingFace Transformers pipeline directly.

## How to Add New Tools

NL2Shell supports tool-augmented translation (e.g., `git`, `docker`, `kubectl` aware completions).

1. Add a new API route in `app/api/tools/[toolname]/route.ts`
2. Register the tool schema in `lib/tools.ts`
3. Add the corresponding relay endpoint in `relay/routes/[toolname].ts`
4. Update the tool context injected into the model prompt in `lib/prompt.ts`
5. Add types for the tool's input/output in `types/tools.ts`

Keep tool definitions minimal. The model handles phrasing variation — your job is to define the schema and any context the model needs to generate accurate commands.

## Code Style

- **TypeScript strict mode** — `tsconfig.json` enforces `strict: true`. No `any` without a comment explaining why.
- **ESLint** — run `npm run lint` before opening a PR. Config is in `eslint.config.mjs`.
- **Tailwind CSS 4** — use utility classes directly. Avoid inline styles. Component variants go in `components/ui/`.
- **No magic strings** — constants belong in `lib/constants.ts`.
- **Async/await over `.then()`** — keep async code readable.

## Submitting PRs

1. [Open an issue first](https://github.com/aryateja2106/nl2shell-web/issues) — describe the problem or feature before writing code. This saves everyone time.
2. Fork the repo and create a branch: `git checkout -b feat/your-feature-name`
3. Use [conventional commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation only
   - `refactor:` no behavior change
   - `test:` adding or updating tests
4. Run `npm run lint` and `npx tsc --noEmit` — both must pass cleanly.
5. Open a PR referencing the issue: `Closes #123`

Small, focused PRs get reviewed faster. If your change is large, consider splitting it into multiple PRs.
