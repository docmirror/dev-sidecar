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
    },
    ignores: [
      '**/build/*',
      '**/dist_electron',
      // CI YAML: format rules (plain scalar, # spacing) conflict with workflow shell blocks
      '.github/**',
    ],
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },
  },
)
