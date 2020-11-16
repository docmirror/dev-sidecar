const proxy = require('./impl/proxy')
const redirect = require('./impl/redirect')
const abort = require('./impl/abort')
const script = require('./impl/script')
const modules = [proxy, redirect, abort, script]

module.exports = modules
