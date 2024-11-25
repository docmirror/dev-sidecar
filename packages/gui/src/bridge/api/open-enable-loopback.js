/* global __static */
import DevSidecar from '@docmirror/dev-sidecar'
import sudoPrompt from '@vscode/sudo-prompt'
import { join } from 'node:path'
import log from '../../utils/util.log'

export default {
  open () {
    log.debug(`[sudo-prompt] 测试开启 loopback`)

    const options = {
      name: '设置loopback',
      icns: process.platform === 'darwin' ? join(__static, 'icon.icns') : undefined,
      env: { PARAM: 'VALUE' },
    }
    const exeFile = DevSidecar.api.shell.extraPath.getEnableLoopbackPath()
    return new Promise((resolve, reject) => {
      sudoPrompt.exec(
        exeFile,
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
