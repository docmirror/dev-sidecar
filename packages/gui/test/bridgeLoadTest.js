const assert = require('node:assert')

    // Load bridge modules that are Node-compatible without running Electron
    (() => {
        assert.doesNotThrow(() => require('../src/bridge/api/open-enable-loopback.js'))
        assert.doesNotThrow(() => require('../src/bridge/auto-start/backend.js'))
        console.log('bridgeLoadTest passed: bridge modules load without throw')
    })()
