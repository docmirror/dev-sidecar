const assert = require('node:assert')
const path = require('node:path')

// Stub Shell.execute and sudo to test fallback without running real commands
const shellModulePath = path.join(__dirname, '../src/shell/index.js')
const sudoModulePath = path.join(__dirname, '../src/shell/sudo.js')

let sudoCalled = false
let sudoCmd = ''

require.cache[shellModulePath] = {
    id: shellModulePath,
    filename: shellModulePath,
    loaded: true,
    exports: {
        // Simulate linux execution path and a permission error on normal kill
        execute: async (executor, _args) => {
            const fakeExec = async () => {
                const err = new Error('Operation not permitted')
                throw err
            }
            return executor.linux(fakeExec, { port: 12345 })
        },
        execFile: async () => { }
    }
}

require.cache[sudoModulePath] = {
    id: sudoModulePath,
    filename: sudoModulePath,
    loaded: true,
    exports: async (command, _options) => {
        sudoCalled = true
        sudoCmd = command
        return { stdout: '', stderr: '' }
    }
}

const killByPort = require('../src/shell/scripts/kill-by-port')

    (async () => {
        await killByPort({ port: 12345 })
        assert.ok(sudoCalled, 'Expected sudo fallback to be called')
        assert.ok(/lsof -i:12345/.test(sudoCmd), 'Expected sudo command to target the specified port')
        console.log('killByPortTest passed: sudo fallback invoked as expected')
    })()
