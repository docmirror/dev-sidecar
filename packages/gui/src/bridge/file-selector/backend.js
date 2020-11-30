export default {
  install (context) {
    const { ipcMain, dialog, log } = context
    ipcMain.on('file-selector', function (event, message) {
      if (message.key === 'open') {
        dialog.showOpenDialog({
          properties: ['openFile'],
          ...message
        }).then(result => {
          if (result.canceled) {
            event.sender.send('file-selector', { key: 'canceled' })
          } else {
            event.sender.send('file-selector', { key: 'selected', value: result.filePaths })
          }
        }).catch(err => {
          log.error('选择文件失败', err)
        })
      }
    })
  }
}
