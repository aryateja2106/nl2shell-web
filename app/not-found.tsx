import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl font-mono font-bold text-muted-foreground/30">
          404
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-[#2ea44f] hover:bg-[#238636] text-white px-5 py-2.5 text-sm rounded-lg font-medium transition-colors"
        >
          Back to NL2Shell
        </Link>
      </div>
    </div>
  );
}
