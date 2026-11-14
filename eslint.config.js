import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Accessibility rules for JSX (labels, roles, keyboard
      // handlers, alt text). See docs in the audit report.
      jsxA11y.flatConfigs.recommended,
    ],
    rules: {
      // RoleChip and friends take a `role` prop that isn't ARIA.
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
])
