const proxy = require('./impl/proxy')
const redirect = require('./impl/redirect')
const abort = require('./impl/abort')
const script = require('./impl/script')
const log = require('../../utils/util.log')
const context = { log }
const modules = [proxy(context), redirect(context), abort(context), script(context)]

module.exports = modules
