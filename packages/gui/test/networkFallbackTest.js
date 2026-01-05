const assert = require('node:assert')
const path = require('node:path')

// Require the CJS fallback util which is Node-compatible without Electron
const fallbackPath = path.join(__dirname, '../src/utils/os-network-fallback.cjs')
const { installNetworkInterfacesFallback } = require(fallbackPath)

    (() => {
        let warned = 0
        const mockLogger = { warn: () => { warned++ } }
        // Calling it should not throw; the function attaches fallback when needed
        assert.doesNotThrow(() => installNetworkInterfacesFallback(mockLogger))
        assert.ok(typeof installNetworkInterfacesFallback === 'function')
        console.log('networkFallbackTest passed: function callable, no throw')
    })()
