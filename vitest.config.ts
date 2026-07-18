import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      // "server-only" throws unless the react-server resolve condition is
      // set, which only Next.js's bundler does — swap in a no-op for tests.
      "server-only": fileURLToPath(new URL("./src/test/server-only-mock.ts", import.meta.url)),
    },
  },
});
