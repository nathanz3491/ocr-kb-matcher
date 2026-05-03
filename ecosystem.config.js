module.exports = {
  apps: [
    {
      name: "proxy",
      script: "standalone-proxy.js",
      cwd: "/home/nathan/ocr-kb-matcher",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
    },
    {
      name: "backend",
      script: "dist/index.js",
      cwd: "/home/nathan/ocr-kb-matcher/backend",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        CORS_ORIGIN: "http://localhost:3000,http://61.141.248.185:8181,https://experiencing-borders-establishment-companies.trycloudflare.com",
      },
      instances: 1,
      autorestart: true,
      watch: false,
    },
    {
      name: "frontend",
      script: "/home/nathan/ocr-kb-matcher/node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/home/nathan/ocr-kb-matcher/frontend",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
      },
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
