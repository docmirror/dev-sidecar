const proxy = require('./impl/proxy')
const redirect = require('./impl/redirect')
const abort = require('./impl/abort')
const log = require('../../utils/util.log')
const context = { log }
const modules = [proxy(context), redirect(context), abort(context)]

module.exports = modules
