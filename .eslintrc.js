module.exports = {
  extends: [
    'next/core-web-vitals',
    'next/typescript'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-object-type': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'warn',
    '@typescript-eslint/no-unused-expressions': 'warn',
    'prefer-const': 'warn',
    'no-var': 'warn',
    'import/no-anonymous-default-export': 'warn'
  },
  overrides: [
    {
      files: [
        'debug-*.js',
        'generate-*.js',
        'test-*.js',
        'playground-*.js',
        'tempCodeRunnerFile.js',
        'scripts/**/*.js'
      ],
      env: {
        node: true,
        commonjs: true
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-anonymous-default-export': 'off',
        '@next/next/no-assign-module-variable': 'off',
        '@typescript-eslint/ban-types': 'off',
        'import/extensions': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'prefer-const': 'off'
      }
    }
  ]
};