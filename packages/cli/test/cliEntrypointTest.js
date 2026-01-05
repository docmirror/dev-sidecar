const assert = require('node:assert')

    // Ensure CLI entrypoints load without throwing synchronously
    (() => {
        assert.doesNotThrow(() => require('../src/index.js'))
        assert.doesNotThrow(() => require('../src/mitmproxy.js'))
        console.log('cliEntrypointTest passed: CLI modules load')
    })()
