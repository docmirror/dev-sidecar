import assert from 'node:assert'

const log = console

function parseVersion (version) {
  const matched = version.match(/^v?(\d{1,2}\.\d{1,2}\.\d{1,3}(?:\.\d{1,2})?)(.*)$/)
  const versionArr = matched[1].split('.')
  return {
    major: Number.parseInt(versionArr[0]), // 大版本
    minor: Number.parseInt(versionArr[1]), // 中版本
    patch: Number.parseInt(versionArr[2]), // 小版本
    temp: Number.parseInt(versionArr[3]) || 0, // 临时版本
    pre: matched[2], // 预发布版本号
  }
}

/**
 * 比较版本号
 *
 * @param onlineVersion  线上版本号
 * @param currentVersion 当前版本号
 * @returns {number} 比较线上版本号是否为更新版本，1=是|0=相等|-1=否|-99=出现异常，比较结果未知
 */
function isNewVersion (onlineVersion, currentVersion) {
  if (onlineVersion === currentVersion) {
    return 0
  }

  try {
    const versionObj = parseVersion(onlineVersion)
    const curVersionObj = parseVersion(currentVersion)

    // 大版本
    if (versionObj.major > curVersionObj.major) {
      return 1 // 大版本号更大，为新版本，需要更新
    } else if (versionObj.major < curVersionObj.major) {
      return -1 // 大版本号更小，为旧版本，无需更新
    }

    // 中版本
    if (versionObj.minor > curVersionObj.minor) {
      return 2 // 中版本号更大，为新版本，需要更新
    } else if (versionObj.minor < curVersionObj.minor) {
      return -2 // 中版本号更小，为旧版本，无需更新
    }

    // 小版本
    if (versionObj.patch > curVersionObj.patch) {
      return 3 // 小版本号更大，为新版本，需要更新
    } else if (versionObj.patch < curVersionObj.patch) {
      return -3 // 小版本号更小，为旧版本，无需更新
    }

    // 临时版本号
    if (versionObj.temp > curVersionObj.temp) {
      return 4 // 临时版本号更大，为新版本，需要更新
    } else if (versionObj.temp < curVersionObj.temp) {
      return -4 // 临时版本号更小，为旧版本，无需更新
    }

    // 预发布版本号
    if (versionObj.pre && curVersionObj.pre) {
      // 当两个后缀版本号都存在时，直接比较后缀版本号字符串的大小
      if (versionObj.pre > curVersionObj.pre) {
        return 51
      } else if (versionObj.pre < curVersionObj.pre) {
        return -51
      }
    } else if (!versionObj.pre && curVersionObj.pre) {
      // 线上版本号没有后缀版本号，说明为正式版本，为新版本，需要更新
      return 52
    } else if (versionObj.pre && !curVersionObj.pre) {
      return -52
    } else {
      return -53 // 相同版本，无需更新（一般不会出现，除非例如 `2.0.0` 和 `2.0.0.0` 进行比较）
    }
  } catch (e) {
    log.error(`比对版本失败，当前版本号：${currentVersion}，线上版本号：${onlineVersion}, error:`, e)
    return -99 // 比对异常
  }
}

let ret;

ret = isNewVersion('2.0.0', '1.0.0')
console.log(ret)
assert.strictEqual(ret, 1)
ret = isNewVersion('1.0.0', '2.0.0')
console.log(ret)
assert.strictEqual(ret, -1)

ret = isNewVersion('2.1.0', '2.0.0')
console.log(ret)
assert.strictEqual(ret, 2)
ret = isNewVersion('2.0.0', '2.1.0')
console.log(ret)
assert.strictEqual(ret, -2)

ret = isNewVersion('2.0.1', '2.0.0')
console.log(ret)
assert.strictEqual(ret, 3)
ret = isNewVersion('2.0.0', '2.0.1')
console.log(ret)
assert.strictEqual(ret, -3)

ret = isNewVersion('2.0.0.1', '2.0.0')
console.log(ret)
assert.strictEqual(ret, 4)
ret = isNewVersion('2.0.0', '2.0.0.1')
console.log(ret)
assert.strictEqual(ret, -4)

ret = isNewVersion('2.0.0-RC2', '2.0.0-RC1')
console.log(ret)
assert.strictEqual(ret, 51)
ret = isNewVersion('2.0.0-RC1', '2.0.0-RC2')
console.log(ret)
assert.strictEqual(ret, -51)

ret = isNewVersion('2.0.0', '2.0.0-RC1')
console.log(ret)
assert.strictEqual(ret, 52)
ret = isNewVersion('2.0.0-RC1', '2.0.0')
console.log(ret)
assert.strictEqual(ret, -52)

ret = isNewVersion('2.0.0.0', '2.0.0')
console.log(ret)
assert.strictEqual(ret, -53)

ret = isNewVersion('x', 'v')
console.log(ret)
assert.strictEqual(ret, -99)
