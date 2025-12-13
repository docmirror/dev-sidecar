import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: {
      vueVersion: 2,
    },
    rules: {
      'style/brace-style': ['error', '1tbs'],
      'style/space-before-function-paren': ['error', 'always'],
      'import/newline-after-import': 'off',
      'import/first': 'off',
      'perfectionist/sort-imports': 'off',
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
      'no-console': 'off',
      'unused-imports/no-unused-vars': 'off',
      'antfu/no-top-level-await': 'off',
      'no-unused-vars': 'off',
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
