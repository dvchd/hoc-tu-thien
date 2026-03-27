/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Treat these Node.js-only packages as external so webpack doesn't bundle them
      config.externals = [
        ...(config.externals || []),
        "undici",
        "https-proxy-agent",
        "agent-base",
      ];
    }
    // Handle node: URI scheme for built-in modules
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      https: false,
      http: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
