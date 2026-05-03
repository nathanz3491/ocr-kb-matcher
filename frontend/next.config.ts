import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  httpAgentOptions: { keepAlive: false },
  typescript: { ignoreBuildErrors: true },
  experimental: { optimizePackageImports: ["lucide-react", "@base-ui/react"] },
  productionBrowserSourceMaps: false,
};
export default nextConfig;
