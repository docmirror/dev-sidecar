import antfu from '@antfu/eslint-config'

export default antfu({
  vue: {
    vueVersion: 2,
  },
  rules: {
    'style/space-before-function-paren': ['error', 'always'],
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/process': 'off',
    'no-console': 'off',
  },
  ignore: [
    '**/node_modules/*',
    '**/build/*',
    '**/test/*',
    '**/dist_electron/*',
  ],
  formatters: {
    css: true,
    html: true,
    markdown: 'prettier',
  },
})
