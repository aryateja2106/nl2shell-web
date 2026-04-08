"use client";

import { pipeline, TextGenerationPipeline } from "@huggingface/transformers";
import { cleanResponse } from "@/lib/clean-response";

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

const SYSTEM_PROMPT = `You are NL2Shell, a tool that converts natural language to shell commands.
Rules:
- Output ONLY the shell command, nothing else
- No explanations, no markdown, no code fences
- If the request is ambiguous, pick the most common interpretation
- Use standard Unix/Linux commands`;

export interface BrowserEngineStatus {
  stage: "idle" | "downloading" | "loading" | "ready" | "generating" | "error";
  progress?: number;
  error?: string;
}

type StatusCallback = (status: BrowserEngineStatus) => void;

let pipelineInstance: TextGenerationPipeline | null = null;
let loadPromise: Promise<TextGenerationPipeline> | null = null;
let currentStatus: BrowserEngineStatus = { stage: "idle" };
const listeners = new Set<StatusCallback>();

function setStatus(status: BrowserEngineStatus) {
  currentStatus = status;
  for (const cb of listeners) cb(status);
}

export function getStatus(): BrowserEngineStatus {
  return currentStatus;
}

export function isReady(): boolean {
  return pipelineInstance !== null;
}

export function onStatusChange(cb: StatusCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function loadPipeline(): Promise<TextGenerationPipeline> {
  if (pipelineInstance) return pipelineInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    setStatus({ stage: "downloading", progress: 0 });

    const pipe = await pipeline("text-generation", MODEL_ID, {
      dtype: "q4f16",
      device: "webgpu",
      progress_callback: (progress: { progress?: number; status?: string }) => {
        if (progress.status === "progress" && typeof progress.progress === "number") {
          setStatus({ stage: "downloading", progress: Math.round(progress.progress) });
        }
      },
    });

    setStatus({ stage: "loading" });
    pipelineInstance = pipe as TextGenerationPipeline;
    setStatus({ stage: "ready" });
    return pipelineInstance;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    const message = err instanceof Error ? err.message : "Failed to load model";
    setStatus({ stage: "error", error: message });
    throw err;
  }
}

export async function generate(query: string): Promise<string> {
  const pipe = await loadPipeline();
  setStatus({ stage: "generating" });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: query },
  ];

  const result = await pipe(messages, {
    max_new_tokens: 128,
    temperature: 0.1,
    do_sample: true,
    return_full_text: false,
  });

  setStatus({ stage: "ready" });

  // Transformers.js text-generation with chat messages returns:
  // [{ generated_text: [{ role, content }, ...] }]  (chat mode)
  // OR [{ generated_text: "string" }]                (plain mode)
  const output = result[0]?.generated_text;

  let raw: string;
  if (Array.isArray(output)) {
    // Chat mode: find the assistant's reply (last message)
    const lastMsg = output.at(-1);
    raw =
      typeof lastMsg === "object" && lastMsg !== null && "content" in lastMsg
        ? String(lastMsg.content)
        : "";
  } else {
    raw = typeof output === "string" ? output : "";
  }

  return cleanResponse(raw);
}
