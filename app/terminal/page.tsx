"use client";

import { Suspense } from "react";
import { WTermPlayground } from "@/components/wterm-playground";

export default function TerminalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm pt-20">
          Loading…
        </div>
      }
    >
      <WTermPlayground />
    </Suspense>
  );
}
