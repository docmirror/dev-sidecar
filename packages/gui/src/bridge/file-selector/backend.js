export default {
  install (context) {
    const { ipcMain, dialog, log } = context
    ipcMain.on('file-selector', (event, message) => {
      if (message.key === 'open') {
        const options = message.options || {}
        if (options.properties == null || options.properties.length === 0) {
          options.properties = ['openFile']
        }

        dialog.showOpenDialog(options).then((result) => {
          if (result.canceled) {
            event.sender.send('file-selector', { key: 'canceled' })
          } else {
            event.sender.send('file-selector', { key: 'selected', value: result.filePaths })
          }
        }).catch((err) => {
          log.error('选择文件失败:', err)
          event.sender.send('file-selector', { key: 'error', error: err })
        })
      }
    })
  },
}
