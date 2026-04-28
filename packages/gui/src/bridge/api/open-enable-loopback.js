import { app } from 'electron'
import DevSidecar from '@docmirror/dev-sidecar'
import sudoPrompt from '@vscode/sudo-prompt'
import { join } from 'node:path'
import log from '../../utils/util.log.gui.js'

const isDevelopment = process.env.NODE_ENV !== 'production'
const staticPath = isDevelopment
  ? join(process.cwd(), 'public')
  : join(app.getAppPath(), 'dist')

export default {
  open () {
    const options = {
      name: 'EnableLoopback',
      icns: process.platform === 'darwin' ? join(staticPath, 'icon.icns') : undefined,
      env: { PARAM: 'VALUE' },
    }
    const exeFile = DevSidecar.api.shell.extraPath.getEnableLoopbackPath()
    const sudoCommand = [`"${exeFile}"`]

    return new Promise((resolve, reject) => {
      sudoPrompt.exec(
        sudoCommand.join(' '),
        options,
        (error, _, stderr) => {
          if (stderr) {
            log.error(`[sudo-prompt] 发生错误: ${stderr}`)
          }

          if (error) {
            reject(error)
          } else {
            resolve(undefined)
          }
        },
      )
    })
  },
}
