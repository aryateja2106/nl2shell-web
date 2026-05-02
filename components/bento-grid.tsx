"use client";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import Link from "next/link";
import {
  ShieldCheck,
  Monitor,
  Box,
  Plug,
  Mic,
  GitFork,
  SquareTerminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

interface BentoCard {
  icon: React.ElementType;
  title: string;
  description: string;
  colSpan: string;
  iconClass: string;
  href?: string;
}

const cards: BentoCard[] = [
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description:
      "Nothing leaves your machine. No telemetry, no cloud calls, no API keys required.",
    colSpan: "md:col-span-2",
    iconClass: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: Monitor,
    title: "OS-Aware",
    description:
      "Automatically detects macOS, Ubuntu, or Linux and generates the right command.",
    colSpan: "md:col-span-1",
    iconClass: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: Box,
    title: "Sandboxed Execution",
    description:
      "Test commands in an isolated Docker container, or try the in-browser demo shell with sample files at /terminal.",
    colSpan: "md:col-span-1",
    iconClass: "bg-amber-500/10 text-amber-500",
  },
  {
    icon: SquareTerminal,
    title: "Web terminal",
    description:
      "Full demo bash in the browser: fake SSH samples, Desktop and work folders, allow-listed curl, and NL2Shell generate-and-run.",
    colSpan: "md:col-span-1",
    iconClass: "bg-teal-500/10 text-teal-500",
    href: "/terminal",
  },
  {
    icon: Plug,
    title: "MCP Protocol",
    description:
      "Add shell translation to Claude Code, Cursor, or any MCP-compatible AI agent.",
    colSpan: "md:col-span-1",
    iconClass: "bg-violet-500/10 text-violet-500",
  },
  {
    icon: Mic,
    title: "Voice Input",
    description:
      "Speak your intent. Browser speech recognition built in. Works in Chrome and Edge.",
    colSpan: "md:col-span-1",
    iconClass: "bg-cyan-500/10 text-cyan-500",
  },
  {
    icon: GitFork,
    title: "Open Source",
    description:
      "MIT licensed. 800M parameter model. 12,834 training pairs. Community-driven.",
    colSpan: "md:col-span-3",
    iconClass: "bg-foreground/10 text-foreground/70",
  },
];

export function BentoGrid() {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const inner = (
          <>
            <div
              className={cn(
                "size-10 rounded-lg flex items-center justify-center mb-4",
                card.iconClass
              )}
            >
              <Icon className="size-5" />
            </div>
            <h3 className="text-sm font-semibold mb-1">{card.title}</h3>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              {card.description}
            </p>
          </>
        );
        return (
          <motion.div
            key={card.title}
            variants={cardVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-6",
              "hover:border-primary/30 hover:shadow-[0_0_20px_rgba(46,164,79,0.06)]",
              "transition-colors duration-200",
              card.colSpan
            )}
          >
            {card.href ? (
              <Link
                href={card.href}
                className="block -m-6 p-6 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
