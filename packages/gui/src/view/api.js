import lodash from 'lodash'
import { ipcRenderer } from 'electron'
const doInvoke = (api, args) => {
  return ipcRenderer.invoke('apiInvoke', [api, args])
}

const bindApi = (api, param1) => {
  lodash.set(apiObj, api, (param2) => {
    return doInvoke(api, param2 || param1)
  })
}
const apiObj = {
  on (channel, callback) {
    ipcRenderer.on(channel, callback)
  },
  doInvoke
}

bindApi('startup')
bindApi('shutdown')

bindApi('config.set')
bindApi('config.get')
bindApi('config.save')
bindApi('config.reload')

bindApi('server.start')
bindApi('server.close')

bindApi('proxy.system.open')
bindApi('proxy.system.close')

bindApi('proxy.npm.open')
bindApi('proxy.npm.close')

export default apiObj
