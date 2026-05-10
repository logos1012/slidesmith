// ESLint 9 flat config — slidesmith-storage
// SPEC: TypeScript strict, no console (logger 사용), no process.env 직접 사용 (env.ts 경유)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  // Vendor encapsulation guard (Review §10-2 / SPEC §6 + ARCH §7).
  // routes/ may only see domain types + repository INTERFACES — never vendor
  // types, the Airtable client, the S3 client, or concrete vendor repos. The
  // single crossing points are lib/vendor-mapper.ts (read) +
  // repositories/airtable/airtable-encode.ts (write). health.ts is exempted
  // because it legitimately reads vendor *state* (breaker open/closed).
  {
    files: ['src/routes/**/*.ts'],
    ignores: ['src/routes/health.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/types/airtable', '**/types/airtable.js', '../types/airtable*', '../../types/airtable*'],
              message:
                'routes must use types/domain via vendor-mapper.ts (SPEC §6, ARCH §7).',
            },
            {
              group: ['**/lib/airtable-client', '**/lib/airtable-client.js', '../lib/airtable-client*', '../../lib/airtable-client*'],
              message:
                'routes must call repositories via container.ts, not the Airtable client directly (SPEC §6, ARCH §7).',
            },
            {
              group: ['**/lib/s3-client', '**/lib/s3-client.js', '../lib/s3-client*', '../../lib/s3-client*'],
              message:
                'routes must call IBlobStorage via container.ts, not the S3 client directly (SPEC §6, ARCH §7).',
            },
            {
              group: [
                '**/repositories/airtable/*',
                '../repositories/airtable/*',
                '../../repositories/airtable/*',
                '**/repositories/s3/*',
                '../repositories/s3/*',
                '../../repositories/s3/*',
              ],
              message:
                'routes depend on interfaces — call container.getRepos(), not concrete vendor adapters (DIP / sw-eng §4-2).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', 'src/**/*.test.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
