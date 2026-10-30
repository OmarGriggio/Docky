import { configDefaults, defineConfig } from "vitest/config";

// `npm test`: the unit tests only - pure functions, instant, nothing to
// start. The integration tests (src/integration/) need Docker and run with
// their own config, `npm run test:integration`.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "src/integration/**"],
  },
});
