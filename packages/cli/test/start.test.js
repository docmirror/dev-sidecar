const { assert } = require('chai')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

describe('start', function () {
  const { isPortInUse, getProxyPort, isAlive } = require('../src/commands/start')

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
    it('should return default port when config does not exist', function () {
      withTempHome((userBase) => {
        assert.strictEqual(getProxyPort(), 31181)
      })
    })

    it('should read port from config.json', function () {
      withTempHome((userBase) => {
        fs.writeFileSync(path.join(userBase, 'config.json'), JSON.stringify({ server: { port: 12345 } }))
        assert.strictEqual(getProxyPort(), 12345)
      })
    })

    it('should return default port when config has no server.port', function () {
      withTempHome((userBase) => {
        fs.writeFileSync(path.join(userBase, 'config.json'), JSON.stringify({ server: {} }))
        assert.strictEqual(getProxyPort(), 31181)
      })
    })

    it('should return default port when config is invalid JSON', function () {
      withTempHome((userBase) => {
        fs.writeFileSync(path.join(userBase, 'config.json'), '{ invalid json }')
        assert.strictEqual(getProxyPort(), 31181)
      })
    })
  })

  describe('isAlive', function () {
    it('should return true for current process', function () {
      assert.isTrue(isAlive(process.pid))
    })

    it('should return false for non-existent PID', function () {
      assert.isFalse(isAlive(999999999))
    })
  })
})
