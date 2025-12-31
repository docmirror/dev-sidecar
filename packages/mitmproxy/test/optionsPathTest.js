import { ok } from 'node:assert'
import { join } from 'node:path'

const Options = require('../src/options').default

// This test validates that options compute absolute script/pac paths based on rootDir
(
  () => {
    const rootDir = join(__dirname, '../../gui')
    const opts = new Options({
      setting: {
        rootDir,
        script: { defaultDir: 'extra/scripts' },
      },
      plugin: {
        overwall: {
          pac: { pacFilePath: 'extra/pac/pac.txt' },
        },
      },
    })

    const setting = opts.getSetting()
    ok(setting.script.dirAbsolutePath.endsWith('/extra/scripts'), 'script dirAbsolutePath should resolve to extra/scripts')

    const pacConfig = opts.getPacConfig()
    ok(pacConfig.pacFileAbsolutePath.endsWith('/extra/pac/pac.txt'), 'pacFileAbsolutePath should resolve to extra/pac/pac.txt')
    console.log('optionsPathTest passed: absolute paths resolved')
  },
)()
