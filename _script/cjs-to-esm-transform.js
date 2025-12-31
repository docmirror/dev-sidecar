/**
 * Simple cjs -> esm transform for common patterns:
 * - const X = require('...') -> import X from '...'
 * - const {a, b} = require('...') -> import {a, b} from '...'
 * - exports.foo = expr -> export const foo = expr
 * - module.exports = expr -> export default expr
 *
 * Note: this is a best-effort codemod and will need manual review.
 */

module.exports = function (fileInfo, api) {
  const j = api.jscodeshift
  const root = j(fileInfo.source)

  // transform `const x = require('mod')` and destructuring
  root.find(j.VariableDeclarator, {
    init: {
      type: 'CallExpression',
      callee: { name: 'require' },
      arguments: args => args && args.length === 1 && args[0].type === 'Literal',
    },
  }).forEach((path) => {
    const init = path.node.init
    const source = init.arguments[0].value
    const id = path.node.id
    let importDecl

    if (id.type === 'Identifier') {
      importDecl = j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier(id.name))],
        j.literal(source),
      )
      j(path.parent).replaceWith(importDecl)
    } else if (id.type === 'ObjectPattern') {
      const specifiers = id.properties.map((prop) => {
        const imported = j.identifier(prop.key.name)
        const local = prop.value ? j.identifier(prop.value.name) : j.identifier(prop.key.name)
        return j.importSpecifier(imported, local)
      })
      importDecl = j.importDeclaration(specifiers, j.literal(source))
      j(path.parent).replaceWith(importDecl)
    }
  })

  // transform `exports.foo = expr` -> `export const foo = expr`
  root.find(j.AssignmentExpression, {
    left: {
      type: 'MemberExpression',
      object: { name: 'exports' },
    },
  }).forEach((p) => {
    const left = p.node.left
    const name = left.property.name || (left.property.value && String(left.property.value))
    const right = p.node.right
    const exportDecl = j.exportNamedDeclaration(
      j.variableDeclaration('const', [j.variableDeclarator(j.identifier(name), right)]),
      [],
    )
    j(p.parent).replaceWith(exportDecl)
  })

  // transform `module.exports = X` -> `export default X`
  root.find(j.AssignmentExpression, {
    left: {
      type: 'MemberExpression',
      object: { name: 'module' },
      property: { name: 'exports' },
    },
  }).forEach((p) => {
    const right = p.node.right
    const exportDecl = j.exportDefaultDeclaration(right)
    j(p.parent).replaceWith(exportDecl)
  })

  return root.toSource({ quote: 'single' })
}
