module.exports = {
  node: require('./node'),
  git: require('./git'),
  pip: require('./pip'),
  overwall: require('./overwall'),
  // free-eye 为 ESM 模块，CJS require() 得到 { default: ... }，需解包
  free_eye: require('./free-eye').default,
}
