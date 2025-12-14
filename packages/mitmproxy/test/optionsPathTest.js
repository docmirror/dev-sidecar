const assert = require('node:assert')
const path = require('node:path')

const Options = require('../src/options')

    // This test validates that options compute absolute script/pac paths based on rootDir
    (() => {
        const rootDir = path.join(__dirname, '../../gui')
        const opts = new Options({
            setting: {
                rootDir,
                script: { defaultDir: 'extra/scripts' }
            },
            plugin: {
                overwall: {
                    pac: { pacFilePath: 'extra/pac/pac.txt' }
                }
            }
        })

        const setting = opts.getSetting()
        assert.ok(setting.script.dirAbsolutePath.endsWith('/extra/scripts'), 'script dirAbsolutePath should resolve to extra/scripts')

        const pacConfig = opts.getPacConfig()
        assert.ok(pacConfig.pacFileAbsolutePath.endsWith('/extra/pac/pac.txt'), 'pacFileAbsolutePath should resolve to extra/pac/pac.txt')
        console.log('optionsPathTest passed: absolute paths resolved')
    })()
