/**
 * Append .js to relative import/export/source literal specifiers that lack extension.
 * Skips node: and absolute/package imports and json/vue/css etc.
 */
export default function (fileInfo, api) {
  const j = api.jscodeshift
  const root = j(fileInfo.source)

  function shouldAppend (pathStr) {
    if (!pathStr)
      return false
    if (!pathStr.startsWith('.'))
      return false // only relative
    if (pathStr.endsWith('.js') || pathStr.endsWith('.mjs') || pathStr.endsWith('.cjs') || pathStr.endsWith('.json') || pathStr.endsWith('.vue') || pathStr.endsWith('.css'))
      return false
    return true
  }

  root.find(j.ImportDeclaration).forEach((p) => {
    const src = p.node.source.value
    if (shouldAppend(src)) {
      p.node.source.value = `${src}.js`
    }
  })

  root.find(j.ExportAllDeclaration).forEach((p) => {
    const src = p.node.source && p.node.source.value
    if (shouldAppend(src)) {
      p.node.source.value = `${src}.js`
    }
  })

  root.find(j.ExportNamedDeclaration).forEach((p) => {
    if (p.node.source) {
      const src = p.node.source.value
      if (shouldAppend(src)) {
        p.node.source.value = `${src}.js`
      }
    }
  })

  // also update require() calls left behind
  root.find(j.CallExpression, { callee: { name: 'require' } }).forEach((p) => {
    const args = p.node.arguments
    if (args && args[0] && args[0].type === 'Literal') {
      const src = args[0].value
      if (shouldAppend(src)) {
        args[0].value = `${src}.js`
      }
    }
  })

  return root.toSource({ quote: 'single' })
}
