
/**
 * first step
 * @param {*} ipcMain
 */
const ebtMain = (ipcMain) => {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const request = require('request')
  /* istanbul ignore else */
  if (!(ipcMain && ipcMain.on)) {
    throw new TypeError('require ipcMain')
  }

  // step 2
  ipcMain.on('electron-baidu-tongji-message', (event, arg) => {
    // electron 生产模式下是直接请求文件系统，没有 http 地址
    // 前台拿不到 hm.js 的内容
    request({
      url: `https://hm.baidu.com/hm.js?${arg}`,
      method: 'GET',
      headers: {
        Referer: 'https://hm.baidu.com/'
      }
    },
    (err, response, body) => {
      if (err) {
        console.error('百度统计请求出错', err)
        return
      }
      const rource = '(h.c.b.su=h.c.b.u||document.location.href),h.c.b.u=f.protocol+"//"+document.location.host+'
      /* istanbul ignore else */
      if (body && body.indexOf(rource) >= 0) {
        // step 3
        let text = body

        /* istanbul ignore else */
        if (!isDevelopment) {
          // 百度统计可能改规则了，不统计 file:// 开始的请求
          // 这里强制替换为 https
          const target = '(h.c.b.su=h.c.b.u||"https://"+c.dm[0]+a[1]),h.c.b.u="https://"+c.dm[0]+'
          const target2 = '"https://"+c.dm[0]+window.location.pathname+window.location.hash'
          text = body.replace(rource, target).replace(/window.location.href/g, target2)
        }
        console.log('baidu tonji: ret')
        event.sender.send('electron-baidu-tongji-reply', { text, isDevelopment })
      }
    })
  })
}

export default {
  install (context) {
    ebtMain(context.ipcMain)
  }
}
