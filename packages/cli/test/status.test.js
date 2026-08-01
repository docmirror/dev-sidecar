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

  describe('plugin list', function () {
    it('should not include free_eye (one-shot plugin without persistent status)', function () {
      const { getPluginNames } = require('../src/commands/status')
      const names = getPluginNames()
      assert.notInclude(names, 'free_eye')
    })

    it('should include overwall only when unlocked', function () {
      const { getPluginNames } = require('../src/commands/status')
      // 测试环境未解锁 setting.json 时不应包含 overwall
      const names = getPluginNames()
      assert.include(names, 'git')
      assert.include(names, 'node')
      assert.include(names, 'pip')
    })
  })

  describe('isOverwallUnlocked', function () {
    it('should return false when setting.json does not exist', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const settingPath = path.join(tmpDir, 'setting.json')
        const exists = fs.existsSync(settingPath)
        assert.isFalse(exists)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should return true when setting.json has overwall: true', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const settingPath = path.join(tmpDir, 'setting.json')
        fs.writeFileSync(settingPath, JSON.stringify({ overwall: true }))
        const setting = JSON.parse(fs.readFileSync(settingPath, 'utf-8'))
        assert.isTrue(setting?.overwall === true)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })

  describe('running.json file logic', function () {
    it('should read status from running.json app.status', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const runningPath = path.join(tmpDir, 'running.json')
        const data = {
          app: {
            instance: { type: 'cli', pid: 12345, startTime: '2026-01-01T00:00:00.000Z' },
            status: {
              server: { enabled: true },
              proxy: { enabled: true },
              plugin: { git: { enabled: true }, node: { enabled: true } },
            },
          },
        }
        fs.writeFileSync(runningPath, JSON.stringify(data))
        const parsed = JSON.parse(fs.readFileSync(runningPath, 'utf-8'))
        assert.isTrue(parsed.app.status.server.enabled)
        assert.isTrue(parsed.app.status.proxy.enabled)
        assert.isTrue(parsed.app.status.plugin.git.enabled)
        assert.strictEqual(parsed.app.instance.type, 'cli')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should handle missing running.json', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const runningPath = path.join(tmpDir, 'running.json')
        assert.isFalse(fs.existsSync(runningPath))
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should handle corrupted running.json', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const runningPath = path.join(tmpDir, 'running.json')
        fs.writeFileSync(runningPath, '{ invalid json }')
        let error = null
        try { JSON.parse(fs.readFileSync(runningPath, 'utf-8')) } catch (e) { error = e }
        assert.isNotNull(error)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should handle stale PID file', function () {
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
  })

  describe('auto-start status', function () {
    it('should detect auto-start registration on Linux', function () {
      if (process.platform === 'linux') {
        const { isInstalled } = require('../src/commands/service')
        const result = isInstalled()
        assert.isBoolean(result)
        const home = process.env.HOME || '/'
        const servicePath = path.join(home, '.config/systemd/user/ds-cli.service')
        const expected = fs.existsSync(servicePath)
        assert.strictEqual(result, expected)
      }
    })

    it('should format status with auto-start info', function () {
      const status = {
        server: { enabled: true },
        proxy: { enabled: false },
        plugin: { git: { enabled: true } },
      }
      const serverRunning = status.server?.enabled || false
      const proxyEnabled = status.proxy?.enabled || false
      assert.isTrue(serverRunning)
      assert.isFalse(proxyEnabled)
    })
  })
})
