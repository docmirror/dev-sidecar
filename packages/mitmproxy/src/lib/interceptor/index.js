const proxy = require('./impl/proxy')
const redirect = require('./impl/redirect')
const abort = require('./impl/abort')

const modules = [proxy, redirect, abort]

module.exports = modules
