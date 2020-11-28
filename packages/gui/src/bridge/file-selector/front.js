
function install (app, api) {
  api.fileSelector = {
    open (value, options) {
      return new Promise((resolve, reject) => {
        api.ipc.send('file-selector', { key: 'open', value: value, ...options })
        api.ipc.on('file-selector', (event, message) => {
          console.log('selector', message)
          if (message.key === 'selected') {
            resolve(message.value)
          } else {
            reject(new Error('没有选择文件'))
          }
          api.ipc.on('file-selector', () => {})
        })
      })
    }
  }
}

export default {
  install
}
