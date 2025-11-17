import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: {
      vueVersion: 2,
    },
    rules: {
      'style/brace-style': ['error', '1tbs'],
      'no-extra-semi': 'error',
      'import/newline-after-import': 'error',
      'import/first': 'error',
      'perfectionist/sort-imports': 'error',
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
    ignores: [
      '**/build/*',
      '**/dist_electron',
    ],
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },
  },
)
