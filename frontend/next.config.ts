import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  httpAgentOptions: { keepAlive: false },
  typescript: { ignoreBuildErrors: true },
  productionBrowserSourceMaps: false,
  webpack: (config) => {
    delete config.resolve.alias['lucide-react'];
    return config;
  },
};
export default nextConfig;
