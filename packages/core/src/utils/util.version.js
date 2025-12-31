function parseVersion (version) {
  const matched = version.match(/^v?(\d{1,2}(?:\.\d{1,2})*)(.*)$/)
  return {
    versions: matched[1].split('.'), // 版本号数组
    pre: matched[2], // 预发布版本号
  }
}

/**
 * 比较版本号
 *
 * @param onlineVersion  线上版本号
 * @param currentVersion 当前版本号
 * @param log            日志对象
 * @returns {number} 比较线上版本号是否为更新的版本，大于0=是|0=相等|小于0=否|-999=出现异常，比较结果未知
 */
function isNewVersion (onlineVersion, currentVersion, log = null) {
  if (onlineVersion === currentVersion) {
    return 0
  }

  try {
    const onlineVersionObj = parseVersion(onlineVersion)
    const curVersionObj = parseVersion(currentVersion)

    const { versions: versions1 } = onlineVersionObj
    const { versions: versions2 } = curVersionObj

    if (versions1.length !== versions2.length) {
      // 短的数组补0
      if (versions1.length < versions2.length) {
        for (let i = versions1.length; i < versions2.length; i++) {
          versions1.push('0')
        }
      } else if (versions1.length > versions2.length) {
        for (let i = versions2.length; i < versions1.length; i++) {
          versions2.push('0')
        }
      }
    }

    // 版本数组比对
    for (let i = 0; i < versions1.length; i++) {
      if (versions1[i] > versions2[i]) {
        return i + 1 // 为新版本，需要更新
      } else if (versions1[i] < versions2[i]) {
        return -(i + 1) // 为旧版本，无需更新
      }
    }

    // 版本号相同，继续比对预发布版本号
    if (onlineVersionObj.pre && curVersionObj.pre) {
      // 都为预发布版本时，直接比较预发布版本号字符串的大小
      if (onlineVersionObj.pre > curVersionObj.pre) {
        return 101
      } else if (onlineVersionObj.pre < curVersionObj.pre) {
        return -101
      }
    } else if (!onlineVersionObj.pre && curVersionObj.pre) {
      // 线上为正式版本，当前版本为预发布版本，需要更新
      return 102
    } else if (onlineVersionObj.pre && !curVersionObj.pre) {
      // 线上为预发布版本，当前版本为正式版本，无需更新
      return -102
    }

    return 0 // 相同版本，无需更新
  } catch (e) {
    (log || console).error(`比对版本失败，当前版本号：${currentVersion}，线上版本号：${onlineVersion}, error:`, e)
    return -999 // 比对异常
  }
}

module.exports = { isNewVersion }
