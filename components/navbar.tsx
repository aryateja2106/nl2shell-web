"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
// GitHub doesn't have a lucide icon — use inline SVG
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Try It", href: "#translate" },
  { label: "Install", href: "#install" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={cn(
        "fixed left-1/2 top-4 z-50 -translate-x-1/2",
        "flex items-center gap-3 px-4 py-2",
        "rounded-full border",
        "bg-background/80 border-border/60 backdrop-blur-xl",
        "transition-shadow duration-300",
        scrolled && "shadow-lg shadow-black/10 dark:shadow-black/40"
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        className="text-sm font-semibold tracking-tight text-foreground"
      >
        NL2Shell
      </Link>

      {/* Divider */}
      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

      {/* Nav links — hidden on mobile */}
      <div className="hidden items-center gap-1 sm:flex">
        {NAV_LINKS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              "text-muted-foreground transition-colors",
              "hover:text-foreground hover:bg-accent/60"
            )}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Right-side actions */}
      <div className="ml-auto flex items-center gap-1 sm:ml-0">
        <a
          href="https://github.com/nl2shell/nl2shell-web"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-md",
            "text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <GitHubIcon className="h-[1.1rem] w-[1.1rem]" />
        </a>
        <AnimatedThemeToggler />
      </div>
    </motion.nav>
  );
}
