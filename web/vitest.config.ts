import { defineConfig } from "vitest/config";
import path from "node:path";
import react from "@vitejs/plugin-react";

// Component test runner. Coexists with the legacy node-test runner used for
// pure-JS lib/ tests (tests/*.test.ts via scripts/run-node-tests.mjs).
//
// Convention:
//   *.test.ts   — node runner (pure logic, no DOM)
//   *.vitest.tsx / *.vitest.ts — vitest + RTL + jsdom (component / DOM tests)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.vitest.{ts,tsx}"],
    exclude: ["node_modules", "tests/**", "dist/**", ".next/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
