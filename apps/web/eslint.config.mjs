import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// ESLint 9 flat config. `next lint` was removed in Next.js 16, so we run
// ESLint directly. FlatCompat bridges the shareable `eslint-config-next`
// configs (still authored in eslintrc style) into the flat-config format,
// preserving the exact rule set that the old `.eslintrc.json` declared.
const eslintConfig = [
  {
    // Build output and generated code (wasm-pack emits src/wasm/dits/**).
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/wasm/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-key": "error",
      "no-console": "warn",
    },
  },
];

export default eslintConfig;
