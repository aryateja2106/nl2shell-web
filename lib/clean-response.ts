export function cleanResponse(text: string): string {
  let cleaned = text.trim();

  // Remove <think>...</think> reasoning blocks (Qwen3 thinking mode)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>\s*/g, "");
  // Remove unclosed <think> blocks (model truncated mid-thought)
  cleaned = cleaned.replace(/<think>[\s\S]*/g, "");

  // Remove markdown code fences (```bash ... ```)
  cleaned = cleaned.replace(/^```(?:bash|sh|shell|zsh)?\n?/, "");
  cleaned = cleaned.replace(/\n?```$/, "");

  // Remove inline backticks (`command`)
  if (
    cleaned.startsWith("`") &&
    cleaned.endsWith("`") &&
    (cleaned.match(/`/g) || []).length === 2
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove leading $ or > prompt characters
  cleaned = cleaned.replace(/^[$>]\s*/, "");

  // Remove "Here is the command:" style preambles
  cleaned = cleaned.replace(
    /^(?:Here (?:is|are) (?:the )?(?:command|script)s?:?\s*\n?)/i,
    ""
  );

  // Strip leading comment lines (# ...)
  const lines = cleaned.trim().split("\n");
  while (lines.length > 0 && lines[0].trim().startsWith("#")) {
    lines.shift();
  }
  cleaned = lines.join("\n");

  return cleaned.trim();
}
