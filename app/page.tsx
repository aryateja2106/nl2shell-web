import Link from "next/link";
import { ShellSession } from "@/components/shell-session";
import { HeroTerminal } from "@/components/hero-terminal";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { BentoGrid } from "@/components/bento-grid";
import { FadeIn } from "@/components/motion-wrappers";

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(46,164,79,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(46,164,79,0.08)_0%,transparent_70%)]" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-4xl px-4 pt-24 sm:pt-32 pb-8 text-center">
        <FadeIn delay={0.1}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-4 py-1.5 text-xs text-muted-foreground mb-8">
            <span className="inline-block size-2 rounded-full bg-[#2ea44f] animate-pulse" />
            Open source &middot; MIT licensed &middot; 400MB model
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Your commands. Your machine.{" "}
            <span className="text-gradient-green">No cloud needed.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="text-xl sm:text-2xl text-muted-foreground font-light mt-4 max-w-2xl mx-auto">
            Translate plain English to shell commands with a 400MB model that runs locally. OS-aware. Private. Instant.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-10 mb-6">
            <HeroTerminal />
          </div>
        </FadeIn>

        {/* Stats bar */}
        <FadeIn delay={0.5}>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-8 text-sm text-muted-foreground/70">
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground/90 font-semibold">&lt;200ms</span>
              <span>latency</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground/90 font-semibold">3</span>
              <span>platforms</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground/90 font-semibold">12,834</span>
              <span>training pairs</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground/90 font-semibold">0</span>
              <span>data sent to cloud</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-10 mb-12">
            <a
              href="#translate"
              className="inline-flex items-center justify-center bg-[#2ea44f] hover:bg-[#238636] text-white px-6 py-3 text-sm rounded-lg font-medium transition-all hover:shadow-[0_0_20px_rgba(46,164,79,0.3)]"
            >
              Try it now — free
            </a>
            <Link
              href="/terminal"
              className="inline-flex items-center justify-center border border-[#2ea44f]/40 bg-[#2ea44f]/5 hover:bg-[#2ea44f]/10 text-foreground px-6 py-3 text-sm rounded-lg font-medium transition-all"
            >
              Web terminal (demo shell)
            </Link>
            <a
              href="#install"
              className="inline-flex items-center justify-center border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground px-6 py-3 text-sm rounded-lg font-medium transition-all backdrop-blur-sm"
            >
              Install locally
            </a>
          </div>
        </FadeIn>
      </section>

      {/* How It Works */}
      <section className="relative mx-auto max-w-4xl px-4 py-12">
        <FadeIn>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
              how it works
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Describe", desc: 'Type what you want in plain English. "Find all large files", "kill port 3000", "install redis".' },
            { step: "2", title: "Translate", desc: "A fine-tuned 800M model converts your intent to the right command — aware of your OS and context." },
            { step: "3", title: "Copy or Run", desc: "Copy the command to your terminal, or run it in our sandboxed environment to test safely." },
          ].map((item, i) => (
            <FadeIn key={item.step} delay={i * 0.15}>
              <div className="text-center space-y-3">
                <div className="mx-auto size-12 rounded-xl bg-[#2ea44f]/10 border border-[#2ea44f]/20 flex items-center justify-center text-lg">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-foreground/90">{item.title}</h3>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Features (Bento Grid) */}
      <section id="features" className="relative mx-auto max-w-4xl px-4 py-12">
        <FadeIn>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
              features
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </FadeIn>
        <BentoGrid />
      </section>

      {/* Translate Section */}
      <section id="translate" className="relative mx-auto max-w-3xl px-4 py-8">
        <FadeIn>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
              translate
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </FadeIn>
        <ShellSession />
      </section>

      {/* For Agents Section */}
      <section className="relative mx-auto max-w-4xl px-4 py-12">
        <FadeIn>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
              for agents
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground/90">
                Add shell translation to any AI agent
              </h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                NL2Shell exposes an MCP (Model Context Protocol) endpoint. Claude Code, Cursor, Windsurf, and any MCP-compatible agent can use it as a tool — one JSON block in your config.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-[#2ea44f] mt-0.5 shrink-0">&#10003;</span>
                  <span className="text-muted-foreground/70"><code className="text-xs bg-card/60 px-1.5 py-0.5 rounded border border-border/30">leshell_translate</code> — natural language to shell command</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#2ea44f] mt-0.5 shrink-0">&#10003;</span>
                  <span className="text-muted-foreground/70"><code className="text-xs bg-card/60 px-1.5 py-0.5 rounded border border-border/30">leshell_execute</code> — run in sandboxed container</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#2ea44f] mt-0.5 shrink-0">&#10003;</span>
                  <span className="text-muted-foreground/70"><code className="text-xs bg-card/60 px-1.5 py-0.5 rounded border border-border/30">leshell_explain</code> — explain what a command does</span>
                </div>
              </div>
            </div>

            <div className="terminal-glow rounded-xl border border-[var(--terminal-border)] overflow-hidden">
              <div className="h-8 bg-[#161b22] flex items-center px-3 gap-2 border-b border-[var(--terminal-border)]">
                <div className="size-2.5 rounded-full bg-[#ff5f57]" />
                <div className="size-2.5 rounded-full bg-[#febc2e]" />
                <div className="size-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[10px] text-muted-foreground/40 font-mono">mcp config</span>
              </div>
              <pre className="terminal-output p-4 text-xs leading-relaxed overflow-x-auto rounded-none border-0">
                <code className="text-[var(--terminal-green)]">{`{
  "mcpServers": {
    "leshell": {
      "url": "https://nl2shell.com/api/mcp"
    }
  }
}`}</code>
              </pre>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <div id="install">
        <Footer />
      </div>
    </main>
  );
}
