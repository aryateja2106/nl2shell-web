"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Mic, Radio, Wifi, WifiOff, RefreshCw, Cloud } from "lucide-react";
import { Room } from "livekit-client";
import { Navbar } from "@/components/navbar";
import { VoiceInput } from "@/components/voice-input";
import { CommandOutput } from "@/components/command-output";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AILoader } from "@/components/ai-loader";
import {
  generate,
  getStatus,
  loadPipeline,
  onStatusChange,
  type BrowserEngineStatus,
} from "@/lib/browser-engine";

type LiveKitState = "idle" | "connecting" | "connected" | "demo";
type InferenceSource = "browser" | "cloud";

interface TokenResponse {
  demoMode: boolean;
  url?: string;
  token?: string;
  roomName?: string;
}

async function translateViaCloud(query: string): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Cloud translation failed");
  return String(data.command ?? "");
}

export default function VoicePage() {
  const [liveKitState, setLiveKitState] = useState<LiveKitState>("idle");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [command, setCommand] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceSource, setInferenceSource] =
    useState<InferenceSource>("browser");
  const [browserStatus, setBrowserStatus] = useState<BrowserEngineStatus>(
    getStatus(),
  );
  const roomRef = useRef<Room | null>(null);

  useEffect(() => onStatusChange(setBrowserStatus), []);

  // Preload local model as soon as the page opens (WebGPU → WASM fallbacks).
  useEffect(() => {
    let cancelled = false;
    loadPipeline().catch((err) => {
      if (!cancelled) {
        console.error("Browser model preload failed:", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function connectLiveKit() {
      setLiveKitState("connecting");
      try {
        const res = await fetch("/api/livekit/token");
        const data: TokenResponse = await res.json();

        if (cancelled) return;

        if (data.demoMode || !data.url || !data.token) {
          setLiveKitState("demo");
          return;
        }

        const room = new Room();
        roomRef.current = room;
        await room.connect(data.url, data.token);
        await room.localParticipant.setMicrophoneEnabled(true);

        if (cancelled) {
          room.disconnect();
          return;
        }

        setRoomName(data.roomName ?? null);
        setLiveKitState("connected");
      } catch {
        if (!cancelled) setLiveKitState("demo");
      }
    }

    connectLiveKit();

    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  const handleTranscript = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setCommand(null);
    setError(null);
    setIsGenerating(true);

    try {
      try {
        const result = await generate(trimmed);
        if (!result) throw new Error("Model returned an empty response");
        setCommand(result);
        setInferenceSource("browser");
      } catch (browserErr) {
        console.warn("Browser inference failed, trying cloud:", browserErr);
        const cloudResult = await translateViaCloud(trimmed);
        if (!cloudResult) throw browserErr;
        setCommand(cloudResult);
        setInferenceSource("cloud");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const retryModel = useCallback(async () => {
    setError(null);
    try {
      await loadPipeline(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model reload failed");
    }
  }, []);

  const modelLoading =
    browserStatus.stage === "downloading" ||
    browserStatus.stage === "loading";
  const modelReady = browserStatus.stage === "ready";
  const modelError = browserStatus.stage === "error";

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(46,164,79,0.08)_0%,transparent_70%)]" />

      <section className="relative mx-auto max-w-3xl px-4 pt-28 pb-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-4 py-1.5 text-xs text-muted-foreground mb-4">
            <Radio className="size-3 text-[#2ea44f]" />
            Voice + LiveKit + on-device model (Transformers.js)
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Speak a command.{" "}
            <span className="text-gradient-green">Run it locally.</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Speech in the browser, LiveKit for real-time audio, and a small
            instruct model via Transformers.js (WebGPU with WASM fallback). No
            install required — first load downloads the model once.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <LiveKitBadge state={liveKitState} roomName={roomName} />
          <ModelBadge status={browserStatus} />
        </div>

        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <VoiceInput
                onTranscript={handleTranscript}
                disabled={isGenerating}
              />
              {modelLoading && (
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  Loading on-device model
                  {browserStatus.device ? ` (${browserStatus.device})` : ""}
                  …{" "}
                  {browserStatus.progress != null
                    ? `${browserStatus.progress}%`
                    : "fetching weights"}
                  . First visit can take 30–90s; then it caches.
                </p>
              )}
              {modelError && (
                <div className="flex flex-col items-center gap-2 text-center max-w-lg">
                  <p className="text-sm text-destructive">
                    Local model failed to load
                    {browserStatus.error ? `: ${browserStatus.error}` : "."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Voice still works — we fall back to the cloud Gradio model
                    if on-device inference is unavailable.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={retryModel}
                    className="gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry local model
                  </Button>
                </div>
              )}
            </div>

            {isGenerating && (
              <div className="flex justify-center py-4">
                <AILoader />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive text-center break-words px-2">
                {error}
              </p>
            )}

            {command && !isGenerating && (
              <CommandOutput
                command={command}
                meta={
                  inferenceSource === "browser"
                    ? `Generated on-device (${browserStatus.device ?? "browser"})`
                    : "Generated via cloud model (local model unavailable)"
                }
                query={query}
                inferenceSource={inferenceSource === "browser" ? "browser" : "cloud"}
              />
            )}

            {!command && !isGenerating && modelReady && (
              <p className="text-sm text-muted-foreground text-center">
                Tap Speak and say something like &ldquo;find all large
                files&rdquo; or &ldquo;show disk usage&rdquo;.
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            ← Back to main translator
          </Link>
        </p>
      </section>
    </main>
  );
}

function LiveKitBadge({
  state,
  roomName,
}: {
  state: LiveKitState;
  roomName: string | null;
}) {
  if (state === "connecting") {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="size-3 animate-spin" />
        Connecting LiveKit…
      </Badge>
    );
  }

  if (state === "connected") {
    return (
      <Badge variant="outline" className="gap-1.5 border-[#2ea44f]/40 text-[#2ea44f]">
        <Wifi className="size-3" />
        LiveKit · {roomName}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <WifiOff className="size-3" />
      Demo mode (no LiveKit credentials)
    </Badge>
  );
}

function ModelBadge({ status }: { status: BrowserEngineStatus }) {
  if (status.stage === "error") {
    return (
      <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400">
        <Cloud className="size-3" />
        Local model offline · cloud fallback
      </Badge>
    );
  }

  if (status.stage === "downloading" || status.stage === "loading") {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="size-3 animate-spin" />
        Loading {status.device ?? "model"}
        {status.progress != null ? ` ${status.progress}%` : ""}
      </Badge>
    );
  }

  if (status.stage === "generating") {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="size-3 animate-spin" />
        Generating…
      </Badge>
    );
  }

  if (status.stage === "ready") {
    return (
      <Badge variant="outline" className="gap-1.5 border-[#2ea44f]/40 text-[#2ea44f]">
        <Mic className="size-3" />
        On-device ready · {status.device ?? "browser"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <Mic className="size-3" />
      Local model idle
    </Badge>
  );
}
