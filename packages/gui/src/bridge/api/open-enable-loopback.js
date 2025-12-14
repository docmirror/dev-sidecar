/* global __static */
import DevSidecar from '@docmirror/dev-sidecar'
import { join } from 'node:path'

export default {
  open() {
    const options = {
      name: 'EnableLoopback',
      icns: process.platform === 'darwin' ? join(__static, 'icon.icns') : undefined,
      env: { PARAM: 'VALUE' },
    }
    const exeFile = DevSidecar.api.shell.extraPath.getEnableLoopbackPath()
    const sudoCommand = `"${exeFile}"`

    return DevSidecar.api.shell.sudo(sudoCommand, options)
  },
}
