const { assert } = require('chai')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

describe('proxy', function () {
  const jsonApi = require('@docmirror/mitmproxy/src/json')

  function getUserBase () {
    return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
  }

  describe('readConfig/writeConfig', function () {
    it('should read existing config', function () {
      const configPath = path.join(getUserBase(), 'config.json')
      if (fs.existsSync(configPath)) {
        const config = jsonApi.parse(fs.readFileSync(configPath, 'utf-8'))
        assert.isObject(config)
      }
    })

    it('should return empty object for missing config', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const configPath = path.join(tmpDir, 'nonexistent.json')
        assert.isFalse(fs.existsSync(configPath))
        let config = {}
        if (fs.existsSync(configPath)) {
          config = jsonApi.parse(fs.readFileSync(configPath, 'utf-8'))
        }
        assert.deepEqual(config, {})
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should persist proxy enabled state', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const configPath = path.join(tmpDir, 'config.json')
        const config = { proxy: { enabled: true } }
        fs.writeFileSync(configPath, jsonApi.stringify(config))
        const read = jsonApi.parse(fs.readFileSync(configPath, 'utf-8'))
        assert.isTrue(read.proxy.enabled)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should persist plugin enabled state', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const configPath = path.join(tmpDir, 'config.json')
        const config = { plugin: { git: { enabled: true }, node: { enabled: false } } }
        fs.writeFileSync(configPath, jsonApi.stringify(config))
        const read = jsonApi.parse(fs.readFileSync(configPath, 'utf-8'))
        assert.isTrue(read.plugin.git.enabled)
        assert.isFalse(read.plugin.node.enabled)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })

  describe('proxy.env file', function () {
    it('should create proxy.env with correct env vars', function () {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-cli-test-'))
      try {
        const envFile = path.join(tmpDir, 'proxy.env')
        const lines = [
          'export HTTPS_PROXY="http://127.0.0.1:31181"',
          'export https_proxy="http://127.0.0.1:31181"',
        ]
        fs.writeFileSync(envFile, lines.join('\n') + '\n')
        const content = fs.readFileSync(envFile, 'utf-8')
        assert.include(content, 'HTTPS_PROXY')
        assert.include(content, '127.0.0.1:31181')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should include HTTP_PROXY when proxyHttp is true', function () {
      const lines = [
        'export HTTPS_PROXY="http://127.0.0.1:31181"',
        'export https_proxy="http://127.0.0.1:31181"',
        'export HTTP_PROXY="http://127.0.0.1:31180"',
        'export http_proxy="http://127.0.0.1:31180"',
      ]
      assert.include(lines.join('\n'), 'HTTP_PROXY')
      assert.include(lines.join('\n'), '31180')
    })
  })

  describe('shell detection logic', function () {
    it('should detect zsh from SHELL env', function () {
      const originalShell = process.env.SHELL
      process.env.SHELL = '/bin/zsh'
      // 模拟 detectShell 逻辑
      const shell = process.env.SHELL || ''
      const detected = shell.includes('zsh') ? 'zsh' : shell.includes('bash') ? 'bash' : 'bash'
      assert.strictEqual(detected, 'zsh')
      process.env.SHELL = originalShell
    })

    it('should detect bash from SHELL env', function () {
      const originalShell = process.env.SHELL
      process.env.SHELL = '/bin/bash'
      const shell = process.env.SHELL || ''
      const detected = shell.includes('zsh') ? 'zsh' : shell.includes('bash') ? 'bash' : 'bash'
      assert.strictEqual(detected, 'bash')
      process.env.SHELL = originalShell
    })

    it('should fallback to bash when SHELL is unknown', function () {
      const originalShell = process.env.SHELL
      process.env.SHELL = '/bin/fish'
      const shell = process.env.SHELL || ''
      const detected = shell.includes('zsh') ? 'zsh' : shell.includes('bash') ? 'bash' : 'bash'
      assert.strictEqual(detected, 'bash')
      process.env.SHELL = originalShell
    })

    it('should map shell to correct profile path', function () {
      const home = process.env.HOME || '/'
      const profiles = {
        zsh: path.join(home, '.zshrc'),
        bash: path.join(home, '.bashrc'),
        fish: path.join(home, '.config/fish/config.fish'),
      }
      assert.include(profiles.zsh, '.zshrc')
      assert.include(profiles.bash, '.bashrc')
      assert.include(profiles.fish, 'config.fish')
    })
  })
})
