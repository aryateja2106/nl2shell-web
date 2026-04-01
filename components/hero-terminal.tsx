"use client";

import { useEffect, useState } from "react";

const EXAMPLES = [
  {
    prompt: "install node 22",
    command: "brew install node@22",
    os: "macOS",
  },
  {
    prompt: "install node 22",
    command: "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs",
    os: "Ubuntu",
  },
  {
    prompt: "kill whatever is using port 3000",
    command: "lsof -ti:3000 | xargs kill -9",
    os: "macOS",
  },
  {
    prompt: "find all files over 100MB",
    command: "find / -type f -size +100M -exec ls -lh {} \\;",
    os: "Linux",
  },
  {
    prompt: "show which process uses the most memory",
    command: "ps aux --sort=-%mem | head -5",
    os: "any",
  },
];

export function HeroTerminal() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [displayedPrompt, setDisplayedPrompt] = useState("");
  const [showCommand, setShowCommand] = useState(false);
  const [phase, setPhase] = useState<"typing" | "showing" | "clearing">("typing");

  useEffect(() => {
    const example = EXAMPLES[exampleIndex];
    let timeoutId: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (displayedPrompt.length < example.prompt.length) {
        timeoutId = setTimeout(() => {
          setDisplayedPrompt(example.prompt.slice(0, displayedPrompt.length + 1));
        }, 30);
      } else {
        timeoutId = setTimeout(() => {
          setShowCommand(true);
          setPhase("showing");
        }, 250);
      }
    } else if (phase === "showing") {
      timeoutId = setTimeout(() => {
        setPhase("clearing");
      }, 2800);
    } else if (phase === "clearing") {
      timeoutId = setTimeout(() => {
        setDisplayedPrompt("");
        setShowCommand(false);
        setExampleIndex((prev) => (prev + 1) % EXAMPLES.length);
        setPhase("typing");
      }, 0);
    }

    return () => clearTimeout(timeoutId);
  }, [phase, displayedPrompt, exampleIndex]);

  const example = EXAMPLES[exampleIndex];

  return (
    <div className="mx-auto max-w-2xl terminal-glow rounded-xl border border-[var(--terminal-border)] overflow-hidden">
      {/* macOS chrome */}
      <div className="h-9 bg-[#161b22] flex items-center px-4 gap-2 border-b border-[var(--terminal-border)]">
        <div className="size-2.5 rounded-full bg-[#ff5f57]" />
        <div className="size-2.5 rounded-full bg-[#febc2e]" />
        <div className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] text-muted-foreground/50 font-mono">
          nl2shell
        </span>
        {showCommand && example.os !== "any" && (
          <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono">
            {example.os}
          </span>
        )}
      </div>

      {/* Terminal body */}
      <div className="bg-[var(--terminal-bg)] p-5 font-mono text-sm min-h-[100px]">
        <div className="flex gap-2">
          <span className="text-[#7aa2f7] select-none shrink-0">$</span>
          <span className="text-foreground/70">
            nl &quot;{displayedPrompt}
            {phase === "typing" && <span className="typing-cursor" />}
            &quot;
          </span>
        </div>
        {showCommand && (
          <div className="mt-3 text-[var(--terminal-green)] animate-in fade-in duration-200">
            {example.command}
          </div>
        )}
      </div>
    </div>
  );
}
