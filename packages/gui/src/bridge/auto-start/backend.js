export default {
  install (context) {
    const { ipcMain, dialog, log, app } = context

    const ex = process.execPath

    // 定义事件，渲染进程中直接使用

    // 开启 开机自启动
    ipcMain.on('auto-start', (event, message) => {
      console.log('updateExe', ex)
      if (message.value) {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: ex,
          args: [
            '--hideWindow', '"true"'
          ]
        })
        event.sender.send('auto-start', { key: 'enabled', value: true })
      } else {
        app.setLoginItemSettings({
          openAtLogin: false,
          path: ex,
          args: []
        })
        event.sender.send('auto-start', { key: 'enabled', value: false })
      }
    })
  }
}
