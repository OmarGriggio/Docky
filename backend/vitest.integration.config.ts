import { defineConfig } from "vitest/config";

// `npm run test:integration`: real HTTP requests (Supertest) against the
// whole Express app and a real, throwaway Postgres started in Docker
// (Testcontainers) - see src/integration/global-setup.ts.
export default defineConfig({
  test: {
    include: ["src/integration/**/*.test.ts"],
    globalSetup: ["src/integration/global-setup.ts"],
    setupFiles: ["src/integration/env.ts"],
    // Starting the container and applying the schema takes a while the
    // first time (image pull); a single request never should.
    hookTimeout: 120_000,
    testTimeout: 15_000,
  },
});
