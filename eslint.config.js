import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import vitestPlugin from 'eslint-plugin-vitest'

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'backups/**',
      'diagnostics/**',
      'tests/**',
      'src/__mocks__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/backup*/**',
    ]
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        project: ['./tsconfig.app.json'],
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'vitest': vitestPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Enforce best practices
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/promise-function-async': 'warn',
      '@typescript-eslint/require-await': 'error',
      
      // Accessibility (will implement later, set as warnings for now)
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-role': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      
      // React-specific rules
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      
      // Testing rules
      'vitest/no-moved-tests': [
        'error',
        { pattern: '**/*.{test,spec}.{ts,tsx}' }
      ],
    },
  },
)
