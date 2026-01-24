import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self)",
          },
          {
            key: "Feature-Policy",
            value: "camera 'self'; microphone 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
