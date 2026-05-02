/**
 * UX hints for commands in the browser demo shell (just-bash + allow-listed curl).
 */
export function getDemoShellHint(command: string): string | null {
  const c = command.trim();
  if (!c) return null;
  if (/\blocalhost\b/i.test(c) || /\b127\.0\.0\.1\b/.test(c)) {
    return "This command references localhost. The demo shell only allows outbound HTTPS to httpbin.org and jsonplaceholder.typicode.com — localhost calls will not work here.";
  }
  if (/\bfile:\/\//i.test(c)) {
    return "file:// URLs are not available inside the virtual filesystem.";
  }
  return null;
}
