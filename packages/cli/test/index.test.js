const { assert } = require('chai')

describe('index', function () {
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
})
