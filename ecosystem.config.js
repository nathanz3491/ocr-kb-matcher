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
      script: "dist/backend/src/index.js",
      cwd: "/home/nathan/ocr-kb-matcher/backend",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        CORS_ORIGIN: "http://localhost:3000,http://61.141.248.185:8181,https://experiencing-borders-establishment-companies.trycloudflare.com,https://cells-retreat-estimates-intellectual.trycloudflare.com",
        JWT_SECRET: "nathan_ocr_kb_3860108cb987afa16a41f26024cd1fef41a12a1a85f427dd",
        JWT_REFRESH_SECRET: "nathan_ocr_refresh_b04e1618381b71e2b737c6c14ab5f939e368ab2939ccc90f",
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
