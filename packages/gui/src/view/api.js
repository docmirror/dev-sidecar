import lodash from 'lodash'
import { ipcRenderer, shell } from 'electron'

const invoke = (api, args) => {
  return ipcRenderer.invoke('apiInvoke', [api, args]).catch(err => {
    console.error('api invoke error:', err)
  })
}
const send = (channel, message) => {
  console.log('do send,', channel, message)
  return ipcRenderer.send(channel, message)
}

const bindApi = (api, param1) => {
  lodash.set(apiObj, api, (param2) => {
    return invoke(api, param2 || param1)
  })
}
const apiObj = {
  on (channel, callback) {
    ipcRenderer.on(channel, callback)
  },
  invoke,
  send,
  openExternal (href) {
    shell.openExternal(href)
  }
}
let inited = false

export function apiInit () {
  if (!inited) {
    return invoke('getApiList').then(list => {
      inited = true
      for (const item of list) {
        bindApi(item)
      }
      console.log('api inited:', apiObj)
      return apiObj
    })
  }

  return new Promise(resolve => {
    resolve(apiObj)
  })
}
export default apiObj
