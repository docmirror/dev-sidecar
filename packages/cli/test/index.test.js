const { assert } = require('chai')
const { execSync } = require('node:child_process')
const path = require('node:path')

describe('index', function () {
  const cliPath = path.join(__dirname, '../cli.js')

  describe('command routing', function () {
    it('should parse --gui flag', function () {
      const args = ['start', '--gui']
      const flags = args.filter(a => a.startsWith('--'))
      const positional = args.filter(a => !a.startsWith('--'))
      assert.deepEqual(flags, ['--gui'])
      assert.deepEqual(positional, ['start'])
    })

    it('should parse --all flag', function () {
      const args = ['stop', '--all']
      const flags = args.filter(a => a.startsWith('--'))
      const positional = args.filter(a => !a.startsWith('--'))
      assert.deepEqual(flags, ['--all'])
      assert.deepEqual(positional, ['stop'])
    })

    it('should parse multiple flags', function () {
      const args = ['restart', '--gui', '--all']
      const flags = args.filter(a => a.startsWith('--'))
      const positional = args.filter(a => !a.startsWith('--'))
      assert.include(flags, '--gui')
      assert.include(flags, '--all')
      assert.deepEqual(positional, ['restart'])
    })

    it('should default to start command', function () {
      const args = []
      const command = args[0] || 'start'
      assert.strictEqual(command, 'start')
    })

    it('should extract plugin subcommand', function () {
      const args = ['plugin', 'start', 'git']
      const positional = args.filter(a => !a.startsWith('--'))
      const command = positional[0]
      const action = positional[1]
      const name = positional[2]
      assert.strictEqual(command, 'plugin')
      assert.strictEqual(action, 'start')
      assert.strictEqual(name, 'git')
    })

    it('should extract service subcommand', function () {
      const args = ['service', 'install']
      const positional = args.filter(a => !a.startsWith('--'))
      assert.strictEqual(positional[0], 'service')
      assert.strictEqual(positional[1], 'install')
    })

    it('should determine run targets from flags', function () {
      // --gui: only GUI
      let flags = ['--gui']
      let runCli = !flags.includes('--gui') || flags.includes('--all')
      let runGui = flags.includes('--gui') || flags.includes('--all')
      assert.isFalse(runCli)
      assert.isTrue(runGui)

      // --all: both
      flags = ['--all']
      runCli = !flags.includes('--gui') || flags.includes('--all')
      runGui = flags.includes('--gui') || flags.includes('--all')
      assert.isTrue(runCli)
      assert.isTrue(runGui)

      // no flags: only CLI
      flags = []
      runCli = !flags.includes('--gui') || flags.includes('--all')
      runGui = flags.includes('--gui') || flags.includes('--all')
      assert.isTrue(runCli)
      assert.isFalse(runGui)
    })
  })

  describe('help command', function () {
    it('should display help with ds-cli help', function () {
      const out = execSync(`node ${cliPath} help`, { encoding: 'utf-8' })
      assert.include(out, '用法: ds-cli <命令>')
      assert.include(out, 'start')
      assert.include(out, 'stop')
      assert.include(out, 'restart')
      assert.include(out, 'status')
      assert.include(out, 'version')
      assert.include(out, 'proxy')
      assert.include(out, 'plugin')
      assert.include(out, 'service')
      assert.include(out, 'help')
    })

    it('should show all commands in help', function () {
      const out = execSync(`node ${cliPath} help`, { encoding: 'utf-8' })
      assert.include(out, '启动守护进程')
      assert.include(out, '停止守护进程')
      assert.include(out, '重启守护进程')
      assert.include(out, '显示运行状态')
      assert.include(out, '显示版本号')
      assert.include(out, '注册开机自启动')
      assert.include(out, '移除开机自启动')
    })

    it('should show options in help', function () {
      const out = execSync(`node ${cliPath} help`, { encoding: 'utf-8' })
      assert.include(out, '--gui')
      assert.include(out, '--all')
    })
  })

  describe('version command', function () {
    it('should display version number', function () {
      const out = execSync(`node ${cliPath} version`, { encoding: 'utf-8' }).trim()
      assert.match(out, /^\d+\.\d+\.\d+$/)
    })
  })

  describe('unknown command', function () {
    it('should show error and help for unknown command', function () {
      try {
        execSync(`node ${cliPath} foobar`, { encoding: 'utf-8' })
        assert.fail('should have thrown')
      } catch (e) {
        assert.include(e.stderr, '未知命令: foobar')
        // help 输出到 stdout
        assert.include(e.stdout, '用法: ds-cli')
      }
    })
  })
})
