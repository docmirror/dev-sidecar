const { assert } = require('chai')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

describe('gui', function () {
  function withTempHome (fn) {
    const originalHome = process.env.HOME
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
    const userBase = path.join(tmpDir, '.dev-sidecar')
    fs.mkdirSync(userBase, { recursive: true })
    process.env.HOME = tmpDir
    try {
      fn(userBase, tmpDir)
    } finally {
      process.env.HOME = originalHome
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }

  describe('isPortInUse', function () {
    const { isPortInUse } = require('../src/commands/gui')

    it('should return false for an available port', async function () {
      const port = 49152 + Math.floor(Math.random() * 1000)
      assert.isFalse(await isPortInUse(port))
    })

    it('should return true for a port in use', async function () {
      const net = require('node:net')
      const server = net.createServer()
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
      const port = server.address().port
      assert.isTrue(await isPortInUse(port))
      server.close()
    })
  })

  describe('getProxyPort', function () {
    const { getProxyPort } = require('../src/commands/gui')

    it('should return default port when no config exists', function () {
      withTempHome(() => {
        assert.strictEqual(getProxyPort(), 31181)
      })
    })

    it('should read port from config', function () {
      withTempHome((userBase) => {
        fs.writeFileSync(path.join(userBase, 'config.json'), JSON.stringify({ server: { port: 8080 } }))
        assert.strictEqual(getProxyPort(), 8080)
      })
    })

    it('should return default for malformed config', function () {
      withTempHome((userBase) => {
        fs.writeFileSync(path.join(userBase, 'config.json'), 'not json')
        assert.strictEqual(getProxyPort(), 31181)
      })
    })
  })

  describe('GUI process detection', function () {
    const { execSync } = require('node:child_process')

    it('should not find a non-existent GUI process', function () {
      let found = true
      try {
        execSync('pgrep -x dev-sidecar_nonexistent_name', { stdio: 'ignore' })
      } catch {
        found = false
      }
      assert.isFalse(found)
    })
  })
})
