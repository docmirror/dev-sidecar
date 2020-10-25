const server = require('./server/index.js')
const proxy = require('./switch/proxy/index.js')
const status = require('./status')
const config = require('./config')
const event = require('./event')

async function proxyStartup ({ ip, port }) {
  for (const key in proxy) {
    if (config.get().setting.startup.proxy[key]) {
      await proxy[key].open({ ip, port })
    }
  }
}
async function proxyShutdown () {
  for (const key in proxy) {
    console.log('status', status)
    if (status.proxy[key] === false) {
      continue
    }
    await proxy[key].close()
  }
}
module.exports = {
  status,
  api: {
    server,
    proxy,
    config,
    startup: async (newConfig) => {
      if(newConfig){
        config.set(newConfig)
      }
    
      try {
        if (config.get().setting.startup.server) {
          server.start(newConfig)
        }
        await proxyStartup({ ip: '127.0.0.1', port: config.get().server.port })
      } catch (error) {
        console.log(error)
      }
    },
    shutdown: async () => {
      try {
        await proxyShutdown()
        return new Promise(resolve => {
          server.close()
          resolve()
        })
      } catch (error) {
        console.log(error)
      }
    },
    event
  }
}
