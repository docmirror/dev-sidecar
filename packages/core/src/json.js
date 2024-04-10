let JSON5 = require('json5')
if (JSON5.default) {
  JSON5 = JSON5.default
}

module.exports = {
  parse (str) {
    return JSON5.parse(str)
  },
  stringify (obj) {
    return JSON.stringify(obj, null, '\t')
  }
}
