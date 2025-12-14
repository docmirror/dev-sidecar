'use strict'

const os = require('node:os')
const sudoPrompt = require('@vscode/sudo-prompt')
const log = require('../utils/util.log.core')

function sudo(command, options = {}) {
    const { name = 'DevSidecar', onStdout, onStderr } = options

    if (!['darwin', 'linux', 'win32'].includes(os.platform())) {
        return Promise.reject(new Error('Unsupported platform for privileged operations'))
    }

    return new Promise((resolve, reject) => {
        sudoPrompt.exec(command, { name }, (error, stdout = '', stderr = '') => {
            if (stdout && onStdout) onStdout(stdout)
            if (stderr && onStderr) onStderr(stderr)
            if (error) {
                const msg = `[sudo] command failed or was denied. Command: ${command}`
                log.error(msg, error)
                const wrapped = new Error(`${msg} Please approve the prompt or run manually with elevated privileges.`)
                wrapped.cause = error
                return reject(wrapped)
            }
            resolve({ stdout, stderr })
        })
    })
}

module.exports = sudo
