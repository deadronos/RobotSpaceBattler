const js = require('@eslint/js')
const reactPlugin = require('eslint-plugin-react')
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

// plugin recommended configs exposed as config objects (compatible with flat config)
const jsxA11yPlugin = require('eslint-plugin-jsx-a11y')
const importPlugin = require('eslint-plugin-import')
const vitestPlugin = require('eslint-plugin-vitest')
const playwrightPlugin = require('eslint-plugin-playwright')

// @typescript-eslint's recommended config contains an 'extends' key (not allowed in flat config).
// Extract only the 'rules' portion and rehydrate as a safe config object.
const tsRecommended = (tsPlugin && tsPlugin.configs && tsPlugin.configs.recommended && tsPlugin.configs.recommended.rules)
  ? { rules: tsPlugin.configs.recommended.rules }
  : {};

// Helper to safely extract only allowed keys (rules, parserOptions, env) from plugin recommended configs
function safeRecommendedFrom(plugin) {
  try {
    const cfg = plugin && plugin.configs && plugin.configs.recommended;
    if (!cfg) return {};
    const safe = {};
    if (cfg.rules && Object.keys(cfg.rules).length) safe.rules = cfg.rules;
    if (cfg.parserOptions && Object.keys(cfg.parserOptions).length) safe.parserOptions = cfg.parserOptions;
    if (cfg.env && Object.keys(cfg.env).length) safe.env = cfg.env;
    return safe;
  } catch (e) {
    return {};
  }
}

// helper to map safe recommended object into a flat-config entry that places parserOptions
function mapSafeToEntry(safeObj) {
  if (!safeObj || Object.keys(safeObj).length === 0) return {};
  const entry = {};
  if (safeObj.rules) entry.rules = safeObj.rules;
  if (safeObj.env) {
    // convert env booleans into globals (readonly where true)
    const globals = {};
    Object.keys(safeObj.env).forEach(k => {
      const v = safeObj.env[k];
      globals[k] = v === true ? 'readonly' : v;
    });
    entry.languageOptions = entry.languageOptions || {};
    entry.languageOptions.globals = globals;
  }
  if (safeObj.parserOptions) entry.languageOptions = Object.assign(entry.languageOptions || {}, { parserOptions: safeObj.parserOptions });
  return entry;
}

module.exports = [
  // base JS recommended rules
  js.configs.recommended,
  // reintroduce recommended rules from commonly used plugins as flat-config objects
  mapSafeToEntry(safeRecommendedFrom(reactPlugin)),
  mapSafeToEntry(safeRecommendedFrom(jsxA11yPlugin)),
  mapSafeToEntry(safeRecommendedFrom(importPlugin)),

  // project-specific overrides for TypeScript + React sources
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: 'readonly', document: 'readonly', navigator: 'readonly' }
    },
    // NOTE: keep explicit plugin references here so rules can be applied/overridden
    plugins: {
      react: reactPlugin,
      'react-hooks': require('eslint-plugin-react-hooks'),
      '@typescript-eslint': tsPlugin,
      // added plugins
      'import': importPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'simple-import-sort': require('eslint-plugin-simple-import-sort'),
      'unused-imports': require('eslint-plugin-unused-imports')
    },
    rules: Object.assign({}, (tsRecommended && tsRecommended.rules) ? tsRecommended.rules : {}, {
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
    }),
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json'
        }
      }
    }
  },

  // three.js / react-three-fiber components use non-standard JSX props (kebab-case, args, etc.).
  // Turn off react/no-unknown-property for those component files to avoid noisy errors.
  {
    files: ['src/components/**'],
    rules: {
      'react/no-unknown-property': 'off'
    }
  },
  // also exempt generated/robot procedural files which use three.js props
  {
    files: ['src/robots/**'],
    rules: {
      'react/no-unknown-property': 'off'
    }
  },

  // (vitest/playwright rules will be applied within the test-specific override where plugins are defined)

  // test-specific overrides (keep test env and a small set of local rules)
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', 'tests/**', 'playwright/**'],
    plugins: {
      vitest: vitestPlugin,
      playwright: playwrightPlugin
    },
    // flat-config uses languageOptions.globals instead of 'env'
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    },
    rules: {
      // keep tests readable; prefer warnings for stylistic rules in tests
      'vitest/expect-expect': 'warn'
    }
  }
]
