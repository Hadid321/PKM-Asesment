import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
export default defineConfig([
  js.configs.recommended,
  ...ts.configs.recommended,
  reactHooks.configs.flat.recommended,
  a11y.flatConfigs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "jsx-a11y/label-has-associated-control": ["error", { depth: 3 }] },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "supabase/**",
    ".data/**",
  ]),
]);
