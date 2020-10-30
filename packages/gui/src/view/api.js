import lodash from 'lodash'
import { ipcRenderer } from 'electron'
const doInvoke = (api, args) => {
  return ipcRenderer.invoke('apiInvoke', [api, args]).catch(err => {
    console.error('api invoke error:', err)
  })
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
let inited = false

export function apiInit () {
  if (!inited) {
    return doInvoke('getApiList').then(list => {
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
