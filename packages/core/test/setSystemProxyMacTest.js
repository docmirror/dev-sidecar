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
    assert.strictEqual(setSystemProxy.parseMacNetworkServiceByDevice('', 'en0'), null)
    assert.strictEqual(setSystemProxy.parseMacNetworkServiceByDevice(networkServiceOrder, ''), null)
  })

  // eslint-disable-next-line no-undef
  it('should parse route device from route output', () => {
    const routeOutput = `
route to: default
interface: en0
flags: <UP,GATEWAY,DONE,STATIC,PRCLONING,GLOBAL>
`.trim()
    const device = setSystemProxy.parseMacRouteDevice(routeOutput)
    assert.strictEqual(device, 'en0')
    assert.strictEqual(setSystemProxy.parseMacRouteDevice(''), null)
    assert.strictEqual(setSystemProxy.parseMacRouteDevice(null), null)
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

  // eslint-disable-next-line no-undef
  it('should fallback to first service when preferred service is unavailable', () => {
    const listAllNetworkServicesOutput = `
USB 10/100/1000 LAN
Thunderbolt Bridge
`.trim()
    const service = setSystemProxy.pickMacNetworkService(listAllNetworkServicesOutput)
    assert.strictEqual(service, 'USB 10/100/1000 LAN')
  })

  // eslint-disable-next-line no-undef
  it('should support disabled service prefix and empty input', () => {
    const listAllNetworkServicesOutput = `
*Wi-Fi
Thunderbolt Bridge
`.trim()
    const service = setSystemProxy.pickMacNetworkService(listAllNetworkServicesOutput)
    assert.strictEqual(service, 'Wi-Fi')
    assert.strictEqual(setSystemProxy.pickMacNetworkService(''), null)
    assert.strictEqual(setSystemProxy.pickMacNetworkService(null), null)
  })

  // eslint-disable-next-line no-undef
  it('should ignore the "An asterisk" header line produced by networksetup -listallnetworkservices', () => {
    const fullOutput = `An asterisk (*) denotes that a network service is disabled.
Ethernet
Wi-Fi
Thunderbolt Bridge`
    assert.strictEqual(setSystemProxy.pickMacNetworkService(fullOutput), 'Wi-Fi')

    const fullOutputEthernetOnly = `An asterisk (*) denotes that a network service is disabled.
Ethernet
Thunderbolt Bridge`
    assert.strictEqual(setSystemProxy.pickMacNetworkService(fullOutputEthernetOnly), 'Ethernet')
  })
})
