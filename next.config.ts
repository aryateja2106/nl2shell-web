import type { NextConfig } from "next";

// Hugging Face model files redirect to *.hf.co / CDN hosts — must be allowed
// or Transformers.js fails with a generic "Load failed".
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.huggingface.co https://*.hf.co",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "blob:",
    "data:",
    "https://*.huggingface.co",
    "https://huggingface.co",
    "https://*.hf.co",
    "https://*.cdn.hf.co",
    "https://cdn.jsdelivr.net",
    "https://*.webcontainer-api.io",
    "https://*.stackblitz.io",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    "https://*.livekit.cloud",
    "wss://*.livekit.cloud",
    "https://*.livekit.io",
    "wss://*.livekit.io",
  ].join(" "),
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(self)",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
