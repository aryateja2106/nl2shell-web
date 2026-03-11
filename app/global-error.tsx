"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d1117] text-white antialiased">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-4xl">⚠</div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-gray-400">
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center bg-[#2ea44f] hover:bg-[#238636] text-white px-5 py-2.5 text-sm rounded-lg font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
