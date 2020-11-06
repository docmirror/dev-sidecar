// eslint-disable-next-line no-unused-vars
const server = require('@docmirror/mitmproxy')
const config = JSON.parse(process.argv[2])
server.start(config)
