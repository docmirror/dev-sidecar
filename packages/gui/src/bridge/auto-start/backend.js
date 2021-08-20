import DevSidecar from '@docmirror/dev-sidecar'

async function setAutoStartForLinux (app, enable = true) {
  const path = app.getPath('exe')
  if (enable) {
    const cmd = `
mkdir -p ~/.config/autostart/
cat >> ~/.config/autostart/dev-sidecar.desktop <<EOF
[Desktop Entry]
Type=Application
Exec=${path}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name[en_US]=DevSidecar
Name=DevSidecar
Comment[en_US]=
Comment=
EOF
`
    await DevSidecar.api.shell.exec(cmd)
  } else {
    const removeStart = 'sudo rm ~/.config/autostart/dev-sidecar.desktop -rf'
    await DevSidecar.api.shell.exec(removeStart)
  }
}
export default {
  install (context) {
    const { ipcMain, dialog, log, app } = context

    const ex = app.getPath('exe')

    // 定义事件，渲染进程中直接使用

    // 开启 开机自启动
    ipcMain.on('auto-start', async (event, message) => {
      console.log('auto start', message)
      const isLinux = DevSidecar.api.shell.getSystemPlatform() === 'linux'
      if (message.value) {
        if (isLinux) {
          await setAutoStartForLinux(app, true)
        } else {
          app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true,
            args: [
              '--hideWindow', '"true"'
            ]
          })
        }

        event.sender.send('auto-start', { key: 'enabled', value: true })
      } else {
        if (isLinux) {
          await setAutoStartForLinux(app, false)
        } else {
          app.setLoginItemSettings({
            openAtLogin: false,
            openAsHidden: false,
            args: []
          })
        }

        event.sender.send('auto-start', { key: 'enabled', value: false })
      }
    })
  }
}
