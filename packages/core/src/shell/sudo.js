'use strict'

const os = require('node:os')
const sudoPrompt = require('@vscode/sudo-prompt')
const log = require('../utils/util.log.core')

function sudo (command, options = {}) {
  const { name = 'DevSidecar', onStdout, onStderr } = options

  if (!['darwin', 'linux', 'win32'].includes(os.platform())) {
    return Promise.reject(new Error('Unsupported platform for privileged operations'))
  }

  return new Promise((resolve, reject) => {
    sudoPrompt.exec(command, { name }, (error, stdout = '', stderr = '') => {
      if (stdout && onStdout) onStdout(stdout)
      if (stderr && onStderr) onStderr(stderr)
      if (error) {
        log.error('[sudo] command failed:', command, error)
        return reject(error)
      }
      resolve({ stdout, stderr })
    })
  })
}

module.exports = sudo
