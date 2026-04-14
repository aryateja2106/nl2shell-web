"use client";

import type { ProgressInfo, TextGenerationPipeline } from "@huggingface/transformers";
import { cleanResponse } from "@/lib/clean-response";

// Use dynamic import to avoid SSR issues
let pipelineInstance: TextGenerationPipeline | null = null;
let loadingPromise: Promise<TextGenerationPipeline> | null = null;
let activeDevice: "webgpu" | "wasm" | null = null;

const MODEL_ID = "onnx-community/Qwen3.5-0.8B-ONNX";

const SYSTEM_PROMPT = `/no_think
You are nl2shell, a specialist that converts natural language to shell commands. Output ONLY the exact shell command. No explanations, no markdown, no backticks, no reasoning, no thinking. Just the command.`;

export type ProgressCallback = (progress: {
  progress: number;
  text: string;
}) => void;

export function isEngineReady(): boolean {
  return pipelineInstance !== null;
}

function toText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const combined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("")
      .trim();
    return combined || null;
  }
  if (
    content &&
    typeof content === "object" &&
    "text" in content &&
    typeof (content as { text?: unknown }).text === "string"
  ) {
    return (content as { text: string }).text;
  }
  return null;
}

function extractCandidateTexts(result: unknown): string[] {
  const candidates: string[] = [];
  const push = (value: unknown) => {
    const text = toText(value);
    if (text && text.trim()) candidates.push(text);
  };

  const outputs = Array.isArray(result) ? result : [result];

  for (const output of outputs) {
    if (!output || typeof output !== "object") {
      push(output);
      continue;
    }

    const generatedText = (output as { generated_text?: unknown }).generated_text;
    if (Array.isArray(generatedText)) {
      const reversed = [...generatedText].reverse();

      for (const item of reversed) {
        if (!item || typeof item !== "object") continue;
        const message = item as { role?: unknown; content?: unknown };
        if (message.role === "assistant") {
          push(message.content);
        }
      }

      for (const item of reversed) {
        if (item && typeof item === "object") {
          push((item as { content?: unknown }).content);
        } else {
          push(item);
        }
      }
    } else {
      push(generatedText);
    }

    push((output as { text?: unknown }).text);
  }

  return candidates;
}

export async function initEngine(onProgress?: ProgressCallback): Promise<void> {
  if (pipelineInstance) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");

    // Disable local model check (always fetch from HF Hub)
    env.allowLocalModels = false;
    env.allowRemoteModels = true;

    const progress_callback = onProgress
      ? (data: ProgressInfo) => {
          if (data.status === "progress") {
            onProgress({
              progress: data.progress ?? 0,
              text: data.file ? `Loading ${data.file}...` : "Initializing...",
            });
          }
        }
      : undefined;

    let lastError: unknown = null;
    for (const device of ["webgpu", "wasm"] as const) {
      try {
        if (onProgress && device === "wasm") {
          onProgress({
            progress: 0,
            text: "WebGPU unavailable, falling back to WASM...",
          });
        }
        const generator = await pipeline("text-generation", MODEL_ID, {
          dtype: "q4",
          device,
          progress_callback,
        });
        activeDevice = device;
        return generator;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error("Unable to initialize browser inference engine.");
  })();

  try {
    pipelineInstance = await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    throw err;
  }
}

export async function generate(query: string): Promise<{
  command: string;
  meta: string;
  durationMs: number;
}> {
  if (!pipelineInstance) {
    throw new Error("Engine not initialized. Call initEngine() first.");
  }

  const start = performance.now();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: query },
  ];

  const result = await pipelineInstance(messages, {
    max_new_tokens: 128,
    temperature: 0.1,
    do_sample: true,
    return_full_text: false,
  });

  const durationMs = Math.round(performance.now() - start);

  const rawCandidates = extractCandidateTexts(result);
  const command =
    rawCandidates
      .map((text) => cleanResponse(text))
      .find((text) => text.length > 0) ?? "";
  const deviceLabel = activeDevice ? activeDevice.toUpperCase() : "BROWSER";
  const meta = `Browser (${deviceLabel}) | Qwen3.5-0.8B | ${durationMs}ms`;

  return { command, meta, durationMs };
}

export async function unloadEngine(): Promise<void> {
  if (pipelineInstance) {
    await pipelineInstance.dispose();
    pipelineInstance = null;
    loadingPromise = null;
    activeDevice = null;
  }
}
