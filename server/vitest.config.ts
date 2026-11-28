import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@app": dir("./src/app"),
      "@modules": dir("./src/modules"),
      "@shared": dir("./src/shared"),
      "@common": dir("../shared"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Tests never read your real .env: these win over it.
    env: {
      NODE_ENV: "test",
      PORT: "8001",
      BASE_URL: "http://localhost:3000",
      TRUST_PROXY: "false",
      RATE_LIMIT_MAX: "100",
      LOGIN_RATE_LIMIT_MAX: "3",
      PRE_ORDER_RATE_LIMIT_MAX: "3",
      JWT_ACCESS_SECRET: "test-access-secret-test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret-test-refresh-secret",
    },
  },
});
