import domains from './scripts/eslint-domain-boundaries.mjs';
import conventions from './scripts/eslint-coding-conventions.mjs';
import js from '@eslint/js';
import { fixupPluginRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import exportScope from 'eslint-plugin-export-scope';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', 'coverage', '.husky/_', 'functions/lib', '.firebase']),
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest' },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-implicit-coercion': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug', 'table', 'group', 'groupEnd'] }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    plugins: { conventions },
    rules: {
      'conventions/no-react-fc': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
      ],
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { react: fixupPluginRules(react), 'jsx-a11y': fixupPluginRules(jsxA11y) },
    settings: { react: { version: 'detect' } },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'react/jsx-no-target-blank': 'error',
      'react/no-unknown-property': ['error', { ignore: ['css'] }],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { domains, 'export-scope': exportScope.plugin },
    rules: {
      'domains/domain-boundaries': 'error',
      'export-scope/no-imports-outside-export-scope': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
    extends: [hooks.configs.flat.recommended, refresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
      },
    },
  },
  {
    files: ['src/**/.scope.default.ts', 'src/**/.scope.ts'],
    processor: 'export-scope/export-scope',
  },
  {
    files: ['*.{js,mjs,cjs,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['functions/**/*.{ts,js,mjs}', 'scripts/**/*.mjs', 'tests/**/*.ts', 'src/**/__tests__/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // Command-line tools intentionally write machine-readable or user-facing stdout.
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    // Empty callbacks represent intentional no-op fakes in tests and Storybook.
    files: ['**/*.test.ts', '**/*.stories.tsx'],
    rules: { '@typescript-eslint/no-empty-function': 'off' },
  },
  {
    files: ['src/**/*.stories.tsx', '.storybook/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  prettier,
  { rules: { curly: ['error', 'all'] } },
]);
