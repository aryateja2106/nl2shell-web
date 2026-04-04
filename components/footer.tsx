"use client";

import { useState } from "react";

type Tab = "install" | "uninstall";

const COMMANDS: Record<Tab, { cmd: string; note: string }> = {
  install: {
    cmd: "curl -fsSL https://nl2shell.com/install.sh | bash",
    note: "Installs Ollama (if needed) and pulls the 400MB model. macOS and Linux.",
  },
  uninstall: {
    cmd: "curl -fsSL https://nl2shell.com/uninstall.sh | bash",
    note: "Removes the model. Ollama itself is not removed.",
  },
};

export function Footer() {
  const [tab, setTab] = useState<Tab>("install");
  const [copied, setCopied] = useState(false);

  const current = COMMANDS[tab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <footer className="border-t border-border/40 mt-20 pt-16 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto px-4">
        {/* Left: Install CTA with tabs */}
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Want this in your terminal?
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            One command. Works offline forever.
          </p>

          {/* Tabs */}
          <div className="flex mt-4 border-b border-border/30">
            <button
              onClick={() => { setTab("install"); setCopied(false); }}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                tab === "install"
                  ? "text-foreground border-b-2 border-[#2ea44f]"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              Install
            </button>
            <button
              onClick={() => { setTab("uninstall"); setCopied(false); }}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                tab === "uninstall"
                  ? "text-foreground border-b-2 border-[#2ea44f]"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              Uninstall
            </button>
          </div>

          {/* Command block */}
          <div className="terminal-output px-4 py-3 mt-0 rounded-t-none flex items-center justify-between gap-3">
            <code className="text-[var(--terminal-green)] text-sm font-mono truncate">
              {current.cmd}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
              aria-label={`Copy ${tab} command`}
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/40 mt-2">
            {current.note}
          </p>
        </div>

        {/* Right: Links */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-foreground/80 mb-3 text-xs uppercase tracking-wider">Model</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://huggingface.co/AryaYT/nl2shell-0.8b" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  HuggingFace Model
                </a>
              </li>
              <li>
                <a href="https://huggingface.co/spaces/AryaYT/nl2shell-demo" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  Gradio Demo
                </a>
              </li>
              <li>
                <a href="https://huggingface.co/datasets/AryaYT/nl2shell-training-v3" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  Training Data
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground/80 mb-3 text-xs uppercase tracking-wider">Project</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/nl2shell/nl2shell-web" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://github.com/nl2shell/nl2shell-web/issues" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  Report an Issue
                </a>
              </li>
              <li>
                <a href="https://github.com/nl2shell/nl2shell-web/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  Contribute
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/30 mt-10 pt-6 text-center">
        <p className="text-[11px] text-muted-foreground/30">
          NL2Shell &middot; 400MB model &middot; Runs on your machine &middot; Does one thing well &middot; MIT Licensed
        </p>
      </div>
    </footer>
  );
}
