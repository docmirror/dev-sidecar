const LRUCache = require('lru-cache')
const log = require('../../utils/util.log')

const cacheSize = 1024

class ChoiceCache {
  constructor () {
    this.cache = new LRUCache({
      maxSize: cacheSize,
      sizeCalculation: () => {
        return 1
      },
    })
  }

  get (key) {
    return this.cache.get(key)
  }

  getOrCreate (key, backupList) {
    log.info('get counter:', key)
    let item = this.cache.get(key)
    if (item == null) {
      item = new DynamicChoice(key)
      item.setBackupList(backupList)
      this.cache.set(key, item)
    }
    return item
  }
}

class DynamicChoice {
  constructor (key) {
    this.key = key
    this.countMap = {} /* ip -> count { value, total, error, keepErrorCount, successRate }  */
    this.value = null // 当前使用的host
    this.backupList = [] // 备选host列表
    this.createTime = new Date()
  }

  doRank () {
    // 将count里面根据成功率排序
    const countList = []
    for (const key in this.countMap) {
      countList.push(this.countMap[key])
    }

    // 将countList根据成功率排序
    countList.sort((a, b) => {
      return b.successRate - a.successRate
    })

    log.info('Do rank:', JSON.stringify(countList))

    const newBackupList = countList.map(item => item.value)
    this.setBackupList(newBackupList)
  }

  /**
   * 设置新的backup列表
   * @param newBackupList 新的backupList
   */
  setBackupList (newBackupList) {
    this.backupList = newBackupList
    let defaultTotal = newBackupList.length
    for (const ip of newBackupList) {
      if (!this.countMap[ip]) {
        this.countMap[ip] = { value: ip, total: defaultTotal, error: 0, keepErrorCount: 0, successRate: 0.5 }
        defaultTotal--
      }
    }
    this.value = newBackupList.shift()
    this.doCount(this.value, false)
  }

  countStart (value) {
    this.doCount(value, false)
  }

  /**
   * 换下一个
   * @param count 计数器
   */
  changeNext (count) {
    log.info('切换backup', count, this.backupList)
    count.keepErrorCount = 0 // 清空连续失败
    count.total = 0
    count.error = 0

    const valueBackup = this.value
    if (this.backupList.length > 0) {
      this.value = this.backupList.shift()
      log.info(`切换backup完成: ${this.key}, ip: ${valueBackup} ➜ ${this.value}, this:`, this)
    } else {
      this.value = null
      log.info(`切换backup完成: ${this.key}, backupList为空了，设置this.value: from '${valueBackup}' to null. this:`, this)
    }
  }

  /**
   * 记录使用次数或错误次数
   * @param ip
   * @param isError
   */
  doCount (ip, isError) {
    let count = this.countMap[ip]
    if (count == null) {
      count = this.countMap[ip] = { value: ip, total: 5, error: 0, keepErrorCount: 0, successRate: 1 }
    }

    if (isError) {
      // 失败次数+1，累计连续失败次数+1
      count.error++
      count.keepErrorCount++
    } else {
      // 总次数+1
      count.total++
    }
    // 计算成功率
    count.successRate = 1.0 - (count.error / count.total)
    if (isError && this.value === ip) {
      // 连续错误3次，切换下一个
      if (count.keepErrorCount >= 3) {
        this.changeNext(count)
      }
      // 成功率小于40%,切换下一个
      if (count.successRate < 0.4) {
        this.changeNext(count)
      }
    }
  }
}

module.exports = {
  DynamicChoice,
  ChoiceCache,
}
