const assert = require('node:assert')
const enableLoopback = require('../src/shell/scripts/enable-loopback')

// lightweight dispatch test: ensures function executes and throws on non-windows
(async () => {
  // mock Shell.execute via requiring module uses actual execute; here we just call and expect error on linux/mac
  const platform = require('node:os').platform()
  try {
    await enableLoopback({ port: 0 })
    if (platform === 'linux' || platform === 'darwin') {
      assert.fail('Expected not supported error on non-windows')
    }
    console.log('enableLoopback dispatch ok for platform:', platform)
  } catch (e) {
    if (platform === 'linux' || platform === 'darwin') {
      assert.ok(e && /不支持此操作/.test(String(e)))
      console.log('enableLoopback correctly not supported on', platform)
    } else {
      // On windows, actual sudo execution would be attempted; we cannot verify here
      console.log('enableLoopback attempted on windows')
    }
  }
})()
