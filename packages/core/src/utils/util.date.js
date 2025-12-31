export default {

  format (date, needMill = true) {
    if (date == null) {
      return 'null'
    }

    const year = date.getFullYear() // 获取年份
    const month = (date.getMonth() + 1).toString().padStart(2, '0') // 获取月份（注意月份从 0 开始计数）
    const day = date.getDate().toString().padStart(2, '0') // 获取天数
    const hours = date.getHours().toString().padStart(2, '0') // 获取小时
    const minutes = date.getMinutes().toString().padStart(2, '0') // 获取分钟
    const seconds = date.getSeconds().toString().padStart(2, '0') // 获取秒数
    const milliseconds = needMill ? `.${date.getMilliseconds().toString().padStart(3, '0')}` : '' // 获取毫秒

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${milliseconds}`
  },

  now (needMill = true) {
    return this.format(new Date(), needMill)
  },

};
