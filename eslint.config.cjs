const js = require('@eslint/js')
const reactPlugin = require('eslint-plugin-react')
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: 'readonly', document: 'readonly', navigator: 'readonly' }
    },
    // NOTE: "extends" is not supported in ESLint flat config files; rules from shared configs
    // can be added as separate config objects if desired. Keeping this override focused on
    // language options, plugins and project-specific rules.
    plugins: {
      react: reactPlugin,
      'react-hooks': require('eslint-plugin-react-hooks'),
      '@typescript-eslint': tsPlugin,
      // added plugins
      'import': require('eslint-plugin-import'),
      'jsx-a11y': require('eslint-plugin-jsx-a11y'),
      'simple-import-sort': require('eslint-plugin-simple-import-sort'),
      'unused-imports': require('eslint-plugin-unused-imports')
    },
    rules: {
      // react hooks plugin rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // import / sorting / unused helpers
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', { vars: 'all', args: 'after-used', argsIgnorePattern: '^_' }],

      // keep import resolution rules reasonably strict
      'import/no-unresolved': 'error',
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.*', 'playwright/**', 'tests/**'] }]
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json'
        }
      }
    }
  },
  // test-specific rules for Vitest and Playwright
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', 'tests/**', 'playwright/**'],
    plugins: {
      vitest: require('eslint-plugin-vitest'),
      playwright: require('eslint-plugin-playwright')
    },
    extends: ['plugin:vitest/recommended', 'plugin:playwright/recommended'],
    env: { 'vitest/globals': true },
    rules: {
      // keep tests readable; prefer warnings for stylistic rules in tests
      'vitest/expect-expect': 'warn'
    }
  }
]
