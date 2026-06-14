import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Non-app code (Node scripts, CLI, e2e specs, test artifacts):
    "scripts/**",
    "cli/**",
    "e2e/**",
    "playwright.config.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
