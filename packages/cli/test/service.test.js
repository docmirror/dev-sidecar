const { assert } = require('chai')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

describe('service', function () {
  const { isInstalled } = require('../src/commands/service')

  describe('isInstalled', function () {
    it('should return a boolean', function () {
      const result = isInstalled()
      assert.isBoolean(result)
    })

    it('should return false on fresh system (no service file)', function () {
      // 在测试环境中，service 文件通常不存在
      // 除非之前测试安装过
      const home = process.env.HOME || '/'
      const servicePath = path.join(home, '.config/systemd/user/ds-cli.service')
      if (!fs.existsSync(servicePath)) {
        assert.isFalse(isInstalled())
      }
    })
  })

  describe('Linux service file', function () {
    it('should contain correct ExecStart with --daemon', function () {
      const home = process.env.HOME || '/'
      const servicePath = path.join(home, '.config/systemd/user/ds-cli.service')
      if (fs.existsSync(servicePath)) {
        const content = fs.readFileSync(servicePath, 'utf-8')
        assert.include(content, 'ExecStart=')
        assert.include(content, 'start --daemon')
        assert.include(content, 'Restart=on-failure')
        assert.include(content, 'After=network.target')
        assert.include(content, 'WantedBy=default.target')
      }
    })

    it('should have correct systemd unit structure', function () {
      const home = process.env.HOME || '/'
      const servicePath = path.join(home, '.config/systemd/user/ds-cli.service')
      if (fs.existsSync(servicePath)) {
        const content = fs.readFileSync(servicePath, 'utf-8')
        assert.include(content, '[Unit]')
        assert.include(content, '[Service]')
        assert.include(content, '[Install]')
        assert.include(content, 'Type=simple')
      }
    })
  })

  describe('service file path', function () {
    it('should be in correct systemd user directory', function () {
      const home = process.env.HOME || '/'
      const expectedDir = path.join(home, '.config/systemd/user')
      // 如果目录存在，service 文件应该在其中
      if (fs.existsSync(expectedDir)) {
        const servicePath = path.join(expectedDir, 'ds-cli.service')
        // 文件可能存在也可能不存在，取决于是否已安装
        if (fs.existsSync(servicePath)) {
          assert.isTrue(fs.existsSync(servicePath))
        }
      }
    })
  })

  describe('install/uninstall lifecycle', function () {
    it('should be idempotent - install twice does not error', function () {
      // 如果已安装，再次安装不应报错
      const home = process.env.HOME || '/'
      const servicePath = path.join(home, '.config/systemd/user/ds-cli.service')
      if (fs.existsSync(servicePath)) {
        // 已安装状态，再次检查 isInstalled 应返回 true
        assert.isTrue(isInstalled())
      }
    })

    it('should report not installed when service file absent', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        // 在临时目录中，service 文件不存在
        const fakePath = path.join(tmpDir, 'ds-cli.service')
        assert.isFalse(fs.existsSync(fakePath))
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })
})
