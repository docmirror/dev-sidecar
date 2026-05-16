function install (app, api) {
  api.fileSelector = {

    /**
     * 打开文件选择框
     *
     * 支持传参方式：
     * 1. open(String defaultPath)
     * 2. open(String defaultPath, String properties)
     * 3. open(null, String properties)
     * 4. open(String defaultPath, Object options)
     * 5. open(Object options)
     *
     * @param value
     * @param {Electron.OpenDialogOptions} options
     * @returns {Promise<unknown>} promise
     */
    open (value = null, options = null) {
      if (options == null && value && typeof value !== 'string') {
        options = { ...value }
        value = null
      } else {
        if (typeof options === 'string') {
          if (options === 'dir') {
            options = 'openDirectory'
          } else if (options === 'file') {
            options = 'openFile'
          }

          options = { properties: [options] } // options 为字符串时，视为 properties 属性的值
        } else {
          options = options || {}
        }
      }

      // 如果没有 defaultPath，则使用 value 作为 defaultPath
      if (!options.defaultPath && value && typeof value === 'string') {
        options.defaultPath = value
      }

      return new Promise((resolve, reject) => {
        api.ipc.send('file-selector', { key: 'open', options })
        api.ipc.on('file-selector', (event, message) => {
          console.log('selector', message)
          if (message.key === 'selected') {
            resolve(message.value)
          } else if (message.key === 'canceled') {
            resolve('') // 没有选择文件
          } else if (message.key === 'error') {
            reject(message.error)
          } else {
            reject(new Error('未知的响应'))
          }
          api.ipc.on('file-selector', () => {})
        })
      })
    },
  }
}

export default {
  install,
}
