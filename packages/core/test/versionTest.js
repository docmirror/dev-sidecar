const assert = require('node:assert')
const { isNewVersion } = require('../src/utils/util.version.js')

function testIsNewVersion (onlineVersion, currentVersion, expected) {
  const ret = isNewVersion(onlineVersion, currentVersion)
  console.log(ret >= 0 ? ` ${ret}` : `${ret}`)
  assert.strictEqual(ret, expected)
}

testIsNewVersion('2.0.0', '2.0.0', 0)

testIsNewVersion('2.0.0', '1.0.0', 1)
testIsNewVersion('1.0.0', '2.0.0', -1)

testIsNewVersion('2.1.0', '2.0.0', 2)
testIsNewVersion('2.0.0', '2.1.0', -2)

testIsNewVersion('2.0.1', '2.0.0', 3)
testIsNewVersion('2.0.0', '2.0.1', -3)

testIsNewVersion('2.0.0.1', '2.0.0', 4)
testIsNewVersion('2.0.0', '2.0.0.1', -4)

testIsNewVersion('2.0.0.9.1', '2.0.0.9', 5)
testIsNewVersion('2.0.0.9', '2.0.0.9.1', -5)

testIsNewVersion('2.0.0-RC2', '2.0.0-RC1', 101)
testIsNewVersion('2.0.0-RC1', '2.0.0-RC2', -101)

testIsNewVersion('2.0.0', '2.0.0-RC1', 102)
testIsNewVersion('2.0.0-RC1', '2.0.0', -102)

testIsNewVersion('2.0.0.0', '2.0.0', 0)

testIsNewVersion('x', 'v', -999)
