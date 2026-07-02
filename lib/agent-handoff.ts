/**
 * Markdown brief for coding agents (Cursor, Codex, etc.) — pairs NL intent with a shell command.
 */
export function formatStructuredAgentBrief(input: {
  nlQuery: string;
  shellCommand: string;
  /** Where the command is intended to run */
  environmentNote?: string;
}): string {
  const env =
    input.environmentNote ??
    "NL2Shell WebContainer (browser sandbox) or the user’s local terminal — confirm before running.";
  return `## Goal (plain language)
${input.nlQuery.trim()}

## Suggested shell command
\`\`\`bash
${input.shellCommand.trim()}
\`\`\`

## Execution context
${env}

## Checklist for the coding agent
- [ ] Confirm the command matches user intent (paths, destructive flags, network access).
- [ ] Prefer review / dry-run when the shell is ambiguous.
- [ ] Capture stdout/stderr if the command fails so the user can iterate.
`;
}
