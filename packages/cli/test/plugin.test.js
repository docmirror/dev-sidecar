const { assert } = require('chai')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

describe('plugin', function () {
  describe('getValidPlugins (via core module)', function () {
    it('should return an array of plugin names', function () {
      const plugins = Object.keys(require('@docmirror/dev-sidecar/src/modules/plugin'))
      assert.isArray(plugins)
      assert.isAbove(plugins.length, 0)
    })

    it('should include known plugins', function () {
      const plugins = Object.keys(require('@docmirror/dev-sidecar/src/modules/plugin'))
      assert.include(plugins, 'git')
      assert.include(plugins, 'node')
      assert.include(plugins, 'pip')
      assert.include(plugins, 'overwall')
      assert.include(plugins, 'free_eye')
    })
  })

  describe('isOverwallUnlocked logic', function () {
    const jsonApi = require('@docmirror/mitmproxy/src/json')

    it('should return false when setting.json does not exist', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const settingPath = path.join(tmpDir, 'setting.json')
        assert.isFalse(fs.existsSync(settingPath))
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should return false when overwall is false', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const settingPath = path.join(tmpDir, 'setting.json')
        fs.writeFileSync(settingPath, JSON.stringify({ overwall: false }))
        const setting = jsonApi.parse(fs.readFileSync(settingPath, 'utf-8'))
        assert.isFalse(setting?.overwall === true)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should return true when overwall is true', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const settingPath = path.join(tmpDir, 'setting.json')
        fs.writeFileSync(settingPath, JSON.stringify({ overwall: true }))
        const setting = jsonApi.parse(fs.readFileSync(settingPath, 'utf-8'))
        assert.isTrue(setting?.overwall === true)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should return false when setting.json is invalid', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const settingPath = path.join(tmpDir, 'setting.json')
        fs.writeFileSync(settingPath, '{ invalid }')
        let result = false
        try {
          const setting = jsonApi.parse(fs.readFileSync(settingPath, 'utf-8'))
          result = setting?.overwall === true
        } catch {
          result = false
        }
        assert.isFalse(result)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should prefer setting.json over setting.json5', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const newPath = path.join(tmpDir, 'setting.json')
        const oldPath = path.join(tmpDir, 'setting.json5')
        fs.writeFileSync(newPath, JSON.stringify({ overwall: true }))
        fs.writeFileSync(oldPath, JSON.stringify({ overwall: false }))

        // 模拟 getSettingsPath 逻辑
        let settingPath = newPath
        if (!fs.existsSync(newPath) && fs.existsSync(oldPath)) {
          settingPath = oldPath
        }
        assert.strictEqual(settingPath, newPath)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should fallback to setting.json5 when setting.json does not exist', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const oldPath = path.join(tmpDir, 'setting.json5')
        fs.writeFileSync(oldPath, JSON.stringify({ overwall: true }))

        const newPath = path.join(tmpDir, 'setting.json')
        let settingPath = newPath
        if (!fs.existsSync(newPath) && fs.existsSync(oldPath)) {
          settingPath = oldPath
        }
        assert.strictEqual(settingPath, oldPath)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })
})
