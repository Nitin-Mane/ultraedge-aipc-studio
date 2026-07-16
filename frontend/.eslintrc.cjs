module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // Baseline-era relaxations — tighten as Phase 5 cleanup lands
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'prefer-const': 'warn',
    'no-constant-condition': 'warn',
  },
  overrides: [
    {
      files: ['src/pages/CodingAgentPage.tsx', 'src/pages/PersonalAssistantPage.tsx', 'src/pages/coderArena.tsx'],
      rules: {
        'no-empty': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'prefer-const': 'off',
        'no-constant-condition': 'off',
      },
    },
  ],
}
