import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          // Same-origin requests only. Among other things this blocks the usage
          // metrics @mediapipe/tasks-vision 1.x sends to odml.pa.googleapis.com.
          {
            key: "Content-Security-Policy",
            value: "connect-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
