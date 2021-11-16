import Sudoer from 'electron-sudo'
import DevSidecar from '@docmirror/dev-sidecar'
export default {
  async open () {
    const options = { name: '设置loopback' }
    const sudoer = new Sudoer(options)
    const exeFile = DevSidecar.api.shell.extraPath.getEnableLoopbackPath()
    await sudoer.exec(
      exeFile, { env: { PARAM: 'VALUE' } }
    )
  }
}
