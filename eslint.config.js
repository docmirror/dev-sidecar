import antfu from '@antfu/eslint-config'

export default antfu({
  vue: {
    vueVersion: 2,
  },
  rules: {
    "style/space-before-function-paren": ["error", "always"],
    "no-console": 'off'
  },
  isInEditor: true,
  ignore: [
    '**/test/**',
  ],
  formatters: {
    css: true,
    html: true,
    markdown: 'prettier',
  }
})
