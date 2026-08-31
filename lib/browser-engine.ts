"use client";

import { env, pipeline, type TextGenerationPipeline } from "@huggingface/transformers";
import { cleanResponse } from "@/lib/clean-response";

// Small instruct model with official onnx-community ONNX exports (q4 / q4f16).
const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

// Pin to the onnxruntime-web version bundled with @huggingface/transformers.
const ORT_WASM_VERSION = "1.25.0-dev.20260327-722743c0e2";
const ORT_WASM_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_WASM_VERSION}/dist/`;

const SYSTEM_PROMPT = `You are NL2Shell, a tool that converts natural language to shell commands.
Rules:
- Output ONLY the shell command, nothing else
- No explanations, no markdown, no code fences
- If the request is ambiguous, pick the most common interpretation
- Use standard Unix/Linux commands`;

export type InferenceDevice = "webgpu" | "wasm";

export interface BrowserEngineStatus {
  stage: "idle" | "downloading" | "loading" | "ready" | "generating" | "error";
  progress?: number;
  error?: string;
  device?: InferenceDevice;
  modelId?: string;
}

type StatusCallback = (status: BrowserEngineStatus) => void;

let pipelineInstance: TextGenerationPipeline | null = null;
let loadPromise: Promise<TextGenerationPipeline> | null = null;
let activeDevice: InferenceDevice | null = null;
let currentStatus: BrowserEngineStatus = { stage: "idle" };
const listeners = new Set<StatusCallback>();
let envConfigured = false;

function configureEnv() {
  if (envConfigured || typeof window === "undefined") return;
  envConfigured = true;

  env.allowLocalModels = false;
  env.useBrowserCache = true;

  // Explicit WASM paths — default relative paths 404 under Next.js.
  const onnxEnv = env.backends.onnx as {
    wasm?: { wasmPaths?: string; proxy?: boolean };
  };
  if (!onnxEnv.wasm) onnxEnv.wasm = {};
  onnxEnv.wasm.wasmPaths = ORT_WASM_CDN;
  onnxEnv.wasm.proxy = false;
}

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

export function getDevice(): InferenceDevice | null {
  return activeDevice;
}

export function onStatusChange(cb: StatusCallback): () => void {
  listeners.add(cb);
  cb(currentStatus);
  return () => listeners.delete(cb);
}

async function hasUsableWebGPU(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const gpu = (
    navigator as Navigator & {
      gpu?: { requestAdapter: () => Promise<unknown> };
    }
  ).gpu;
  if (!gpu?.requestAdapter) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

function progressHandler(info: { progress?: number; status?: string }) {
  if (typeof info.progress === "number" && Number.isFinite(info.progress)) {
    setStatus({
      stage: "downloading",
      progress: Math.round(info.progress),
      device: activeDevice ?? undefined,
      modelId: MODEL_ID,
    });
  }
}

type Attempt = { device: InferenceDevice; dtype: string };

async function tryLoad(attempt: Attempt): Promise<TextGenerationPipeline> {
  activeDevice = attempt.device;
  setStatus({
    stage: "downloading",
    progress: 0,
    device: attempt.device,
    modelId: MODEL_ID,
  });

  const pipe = await pipeline("text-generation", MODEL_ID, {
    dtype: attempt.dtype as "q4f16" | "q4" | "q8" | "fp16" | "fp32",
    device: attempt.device,
    progress_callback: progressHandler,
  });

  setStatus({ stage: "loading", device: attempt.device, modelId: MODEL_ID });
  return pipe as TextGenerationPipeline;
}

export async function loadPipeline(
  forceReload = false,
): Promise<TextGenerationPipeline> {
  configureEnv();

  if (pipelineInstance && !forceReload) return pipelineInstance;
  if (loadPromise && !forceReload) return loadPromise;

  if (forceReload) {
    pipelineInstance = null;
    loadPromise = null;
    activeDevice = null;
  }

  loadPromise = (async () => {
    const webgpuOk = await hasUsableWebGPU();
    const attempts: Attempt[] = webgpuOk
      ? [
          { device: "webgpu", dtype: "q4f16" },
          { device: "webgpu", dtype: "q4" },
          { device: "wasm", dtype: "q4" },
          { device: "wasm", dtype: "q8" },
        ]
      : [
          { device: "wasm", dtype: "q4" },
          { device: "wasm", dtype: "q8" },
        ];

    const errors: string[] = [];

    for (const attempt of attempts) {
      try {
        const pipe = await tryLoad(attempt);
        pipelineInstance = pipe;
        setStatus({
          stage: "ready",
          device: attempt.device,
          modelId: MODEL_ID,
        });
        return pipe;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${attempt.device}/${attempt.dtype}: ${message}`);
      }
    }

    activeDevice = null;
    const detail = errors.join(" | ") || "Unknown load failure";
    setStatus({ stage: "error", error: detail, modelId: MODEL_ID });
    throw new Error(`Browser model load failed. ${detail}`);
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

function extractGeneratedText(result: unknown): string {
  const first = Array.isArray(result) ? result[0] : null;
  const output =
    first && typeof first === "object" && first !== null && "generated_text" in first
      ? (first as { generated_text: unknown }).generated_text
      : null;

  if (Array.isArray(output)) {
    const lastMsg = output.at(-1);
    if (
      typeof lastMsg === "object" &&
      lastMsg !== null &&
      "content" in lastMsg
    ) {
      return String((lastMsg as { content: unknown }).content ?? "");
    }
    return "";
  }
  return typeof output === "string" ? output : "";
}

export async function generate(query: string): Promise<string> {
  const pipe = await loadPipeline();
  setStatus({
    stage: "generating",
    device: activeDevice ?? undefined,
    modelId: MODEL_ID,
  });

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ];

    const result = await pipe(messages, {
      max_new_tokens: 96,
      temperature: 0.1,
      do_sample: true,
      return_full_text: false,
    });

    setStatus({
      stage: "ready",
      device: activeDevice ?? undefined,
      modelId: MODEL_ID,
    });

    return cleanResponse(extractGeneratedText(result));
  } catch (err) {
    setStatus({
      stage: "ready",
      device: activeDevice ?? undefined,
      modelId: MODEL_ID,
    });
    throw err;
  }
}
