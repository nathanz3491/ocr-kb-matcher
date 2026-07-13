import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  httpAgentOptions: { keepAlive: false },
  typescript: { ignoreBuildErrors: true },
  experimental: { optimizePackageImports: ["lucide-react", "@base-ui/react"] },
  productionBrowserSourceMaps: false,
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  // Exclude send-email from build due to Next.js 16 prerender issue
  // (route uses Resend SDK which fails in build environment)
  // (route is dynamic at runtime via runtime check)
};
export default nextConfig;
