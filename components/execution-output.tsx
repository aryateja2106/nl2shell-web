"use client";

import type { ExecutionResult } from "@/types/sandbox";

interface ExecutionOutputProps {
  result: ExecutionResult;
  command: string;
}

export function ExecutionOutput({ result, command }: ExecutionOutputProps) {
  const hasStdout = result.stdout.trim().length > 0;
  const hasStderr = result.stderr.trim().length > 0;
  const isSuccess = result.exitCode === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative rounded-xl border border-[var(--terminal-border)] overflow-hidden">
        {/* Window chrome */}
        <div className="h-8 bg-[#0d1117] flex items-center justify-between px-3 border-b border-[var(--terminal-border)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/40">
              sandbox
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isSuccess
                  ? "text-[#2ea44f] bg-[#2ea44f]/10"
                  : "text-[#f85149] bg-[#f85149]/10"
              }`}
            >
              exit {result.exitCode}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/30">
              {result.durationMs}ms
            </span>
          </div>
        </div>

        {/* Output */}
        <div className="bg-[#0d1117] p-4 text-sm font-mono leading-relaxed overflow-x-auto">
          {/* Command echo */}
          <div className="text-muted-foreground/40 mb-2">
            <span className="text-[#2ea44f]">$</span> {command}
          </div>

          {/* stdout */}
          {hasStdout && (
            <pre className="text-[#e6edf3] whitespace-pre-wrap break-all">
              {result.stdout}
            </pre>
          )}

          {/* stderr */}
          {hasStderr && (
            <pre className="text-[#f85149] whitespace-pre-wrap break-all mt-1">
              {result.stderr}
            </pre>
          )}

          {/* Empty output */}
          {!hasStdout && !hasStderr && (
            <span className="text-muted-foreground/30 italic">
              (no output)
            </span>
          )}
        </div>
      </div>

      {/* Audit trail reference */}
      <p className="text-[10px] text-muted-foreground/30 font-mono mt-1.5 text-right">
        audit: {result.auditId}
      </p>
    </div>
  );
}
