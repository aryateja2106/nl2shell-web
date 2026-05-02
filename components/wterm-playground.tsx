"use client";

import dynamic from "next/dynamic";

const WTermTerminalInner = dynamic(
  () => import("@/components/wterm-terminal-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm pt-20">
        Loading terminal…
      </div>
    ),
  },
);

export function WTermPlayground() {
  return <WTermTerminalInner />;
}
