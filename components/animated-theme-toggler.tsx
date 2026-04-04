"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// Hydration-safe mounted check
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function AnimatedThemeToggler() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";

    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      buttonRef.current
    ) {
      const button = buttonRef.current;
      const { top, left, width, height } = button.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      document.startViewTransition(() => {
        setTheme(next);
      }).ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 400,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      }).catch(() => {});
    } else {
      setTheme(next);
    }
  }, [resolvedTheme, setTheme]);

  // Prevent hydration mismatch — render a placeholder until mounted
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md opacity-0"
        disabled
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-md",
        "text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 90, scale: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute"
          >
            <Sun className="h-[1.1rem] w-[1.1rem]" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: -90, scale: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute"
          >
            <Moon className="h-[1.1rem] w-[1.1rem]" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
