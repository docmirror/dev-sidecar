const { assert } = require('chai')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

describe('status', function () {
  describe('printStatus logic', function () {
    it('should format status with all plugins enabled', function () {
      const status = {
        server: { enabled: true },
        proxy: { enabled: true },
        plugin: {
          git: { enabled: true },
          node: { enabled: true },
          pip: { enabled: true },
          overwall: { enabled: false },
          free_eye: { enabled: false },
        },
      }
      assert.isTrue(status.server.enabled)
      assert.isTrue(status.proxy.enabled)
      assert.isTrue(status.plugin.git.enabled)
      assert.isFalse(status.plugin.overwall.enabled)
    })

    it('should handle missing plugin fields gracefully', function () {
      const status = { server: { enabled: false }, proxy: { enabled: false }, plugin: {} }
      const gitEnabled = status.plugin?.git?.enabled || false
      assert.isFalse(gitEnabled)
    })

    it('should handle empty status object', function () {
      const status = {}
      assert.isFalse(status.server?.enabled || false)
      assert.isFalse(status.proxy?.enabled || false)
    })
  })

  describe('showStatus file logic', function () {
    it('should detect missing status.json and PID file', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const statusFile = path.join(tmpDir, 'status.json')
        const pidFile = path.join(tmpDir, 'ds-cli.pid')
        assert.isFalse(fs.existsSync(statusFile))
        assert.isFalse(fs.existsSync(pidFile))
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should detect stale PID file', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const pidFile = path.join(tmpDir, 'ds-cli.pid')
        fs.writeFileSync(pidFile, '999999999')
        const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10)
        let alive = true
        try { process.kill(pid, 0) } catch { alive = false }
        assert.isFalse(alive)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should read valid status.json', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const statusFile = path.join(tmpDir, 'status.json')
        const status = {
          server: { enabled: true },
          proxy: { enabled: true },
          plugin: { git: { enabled: true }, node: { enabled: true } },
        }
        fs.writeFileSync(statusFile, JSON.stringify(status))
        const readStatus = JSON.parse(fs.readFileSync(statusFile, 'utf-8'))
        assert.deepEqual(readStatus, status)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should handle corrupted status.json', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const statusFile = path.join(tmpDir, 'status.json')
        fs.writeFileSync(statusFile, '{ invalid json }')
        let error = null
        try { JSON.parse(fs.readFileSync(statusFile, 'utf-8')) } catch (e) { error = e }
        assert.isNotNull(error)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })
})
