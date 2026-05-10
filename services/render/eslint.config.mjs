// Flat ESLint config (ESLint 9). TypeScript-aware, no type-checked rules in CI for speed.
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-restricted-globals": [
        "error",
        {
          name: "process",
          message:
            "Do not use process directly inside src/. Use lib/env.ts so config stays validated.",
        },
      ],
    },
  },
  {
    // env.ts and server bootstrap are the only places allowed to read process.env.
    files: ["src/lib/env.ts", "src/server.ts"],
    rules: {
      "no-restricted-globals": "off",
    },
  },
];
