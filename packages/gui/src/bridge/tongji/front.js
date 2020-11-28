
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

export default {
  install (app, api, router) {
    const BAIDU_SITE_ID = 'f2d170ce560aef0005b689f28697f852'
    // 百度统计
    const { ipcRenderer } = require('electron')
    ebtRenderer(ipcRenderer, BAIDU_SITE_ID, router)
  },
  ebtRenderer
}
