
const request = require('request')

/**
 * first step
 * @param {*} ipcMain
 */
const ebtMain = (ipcMain, isDevelopment) => {
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

/**
 * second step
 * @param {*} ipcRenderer
 * @param {*} siteId
 * @param {*} router
 */
const ebtRenderer = (ipcRenderer, siteId, router) => {
  /* istanbul ignore else */
  if (!(ipcRenderer && ipcRenderer.on && ipcRenderer.send)) {
    throw new TypeError('require ipcRenderer')
  }

  /* istanbul ignore else */
  if (!(siteId && typeof siteId === 'string')) {
    throw new TypeError('require siteId')
  }

  // step 4
  ipcRenderer.on('electron-baidu-tongji-reply', (_, { text, isDevelopment }) => {
    console.log('electron-baidu-tongji-reply')
    /* istanbul ignore else */
    if (isDevelopment) { document.body.classList.add('electron-baidu-tongji_dev') }

    window._hmt = window._hmt || []

    const hm = document.createElement('script')
    hm.text = text

    const head = document.getElementsByTagName('head')[0]
    head.appendChild(hm)

    // Vue单页应用时，监听router的每次变化
    // 把虚拟的url地址赋给百度统计的API接口

    /* istanbul ignore else */
    if (router && router.beforeEach) {
      router.beforeEach((to, _, next) => {
        /* istanbul ignore else */
        if (to.path) {
          window._hmt.push(['_trackPageview', '/#' + to.fullPath])
          console.log('baidu trace', to.fullPath)
        }

        next()
      })
    }
  })

  // step 1
  ipcRenderer.send('electron-baidu-tongji-message', siteId)
}

module.exports = { ebtMain, ebtRenderer }
