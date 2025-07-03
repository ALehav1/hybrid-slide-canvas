module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:import/recommended',
    'plugin:react-hooks/recommended',
    // turn off rules for TS handled by TS itself
    'plugin:@typescript-eslint/strict-type-checked',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: ['./tsconfig.eslint.json'] },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even if it doesn't contain any source code, like `@types/unist`
        project: './tsconfig.eslint.json',
      },
    },
    react: { version: 'detect' },
  },

  overrides: [
    /** 1️⃣ relax test/mocks noise */
    {
      files: ['src/**/__tests__/**', 'src/**/mocks/**', 'src/setupTests.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-*': 'off',
        '@typescript-eslint/require-await': 'off',
        'import/no-default-export': 'off',
      },
    },
    /** 2️⃣ allow default export in Vite entry files */
    {
      files: ['vite.config.ts', 'vite.config.*.ts'],
      rules: { 'import/no-default-export': 'off' },
    },
  ],

  rules: {
    /** keep, but as warnings so CI doesn’t fail while refactoring */
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',

    /** turn off rules that cause churn but add little value */
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-confusing-void-expression': 'off',
    'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '(useAsyncEffect)' }],
    'import/no-default-export': 'error',
  },
};
