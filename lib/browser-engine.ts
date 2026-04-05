"use client";

import type { ProgressInfo, TextGenerationPipeline } from "@huggingface/transformers";
import { cleanResponse } from "@/lib/clean-response";

// Use dynamic import to avoid SSR issues
let pipelineInstance: TextGenerationPipeline | null = null;
let loadingPromise: Promise<TextGenerationPipeline> | null = null;

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

    const generator = await pipeline("text-generation", MODEL_ID, {
      dtype: "q4",
      device: "webgpu",
      progress_callback: onProgress
        ? (data: ProgressInfo) => {
            if (data.status === "progress") {
              onProgress({
                progress: data.progress ?? 0,
                text: data.file ? `Loading ${data.file}...` : "Initializing...",
              });
            }
          }
        : undefined,
    });

    return generator;
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

  const output = Array.isArray(result) ? result[0] : result;
  const generatedText = (output as { generated_text?: unknown })?.generated_text;
  const raw =
    Array.isArray(generatedText)
      ? ((generatedText.at(-1) as { content?: string })?.content ?? "")
      : (typeof generatedText === "string" ? generatedText : "");

  const command = cleanResponse(raw);
  const meta = `Browser (WebGPU) | Qwen3.5-0.8B | ${durationMs}ms`;

  return { command, meta, durationMs };
}

export async function unloadEngine(): Promise<void> {
  if (pipelineInstance) {
    await pipelineInstance.dispose();
    pipelineInstance = null;
    loadingPromise = null;
  }
}
