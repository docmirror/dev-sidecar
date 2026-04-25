const assert = require('node:assert')
const setSystemProxy = require('../src/shell/scripts/set-system-proxy')

// eslint-disable-next-line no-undef
describe('set-system-proxy mac helpers', () => {
  // eslint-disable-next-line no-undef
  it('should parse service by device from listnetworkserviceorder output', () => {
    const networkServiceOrder = `
(1) Wi-Fi
(Hardware Port: Wi-Fi, Device: en0)
(2) Thunderbolt Bridge
(Hardware Port: Thunderbolt Bridge, Device: bridge0)
`.trim()
    const service = setSystemProxy.parseMacNetworkServiceByDevice(networkServiceOrder, 'en0')
    assert.strictEqual(service, 'Wi-Fi')
  })

  // eslint-disable-next-line no-undef
  it('should fallback to preferred Wi-Fi service when available', () => {
    const listAllNetworkServicesOutput = `
USB 10/100/1000 LAN
Wi-Fi
Thunderbolt Bridge
`.trim()
    const service = setSystemProxy.pickMacNetworkService(listAllNetworkServicesOutput)
    assert.strictEqual(service, 'Wi-Fi')
  })
})
