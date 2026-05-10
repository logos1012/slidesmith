// ESLint 9 flat config — slidesmith-llm
// Hard rule: process.env access is forbidden outside src/lib/env.ts.
// 12-Factor #3 enforcement; all config flows through Zod-validated env module.

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Use loadEnv() from src/lib/env.ts. Direct process.env access is forbidden.',
        },
      ],
    },
  },
  {
    // env.ts is the only allowed reader of process.env.
    files: ['src/lib/env.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'src/scripts/**', '**/*.test.ts'],
  },
];
