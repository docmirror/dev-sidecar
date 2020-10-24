import api from './api'
import lodash from 'lodash'
const status = {
  server: false,
  proxy: {
    system: false,
    npm: false
  }
}

api.on('status', (event, message) => {
  console.log('view on status', event, message)
  const value = message.value
  const key = message.key
  lodash.set(status, key, value)
})
export default status
