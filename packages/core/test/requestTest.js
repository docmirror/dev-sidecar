import assert from 'node:assert'
import ProxyHttpsAgent from '@docmirror/mitmproxy/src/lib/proxy/common/ProxyHttpsAgent.js'

// Basic smoke test: ensure ProxyHttpsAgent can be imported and constructed
assert.strictEqual(typeof ProxyHttpsAgent, 'function')
console.log('requestTest passed: ProxyHttpsAgent is importable')
