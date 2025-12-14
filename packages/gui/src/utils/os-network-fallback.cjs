'use strict'

const os = require('node:os')

function installNetworkInterfacesFallback(logger = console) {
    const logWarn = (logger && logger.warn) ? logger.warn.bind(logger) : console.warn

    // Avoid double-patching
    if (os.networkInterfaces && os.networkInterfaces.__dsPatched) {
        return os.networkInterfaces
    }

    const originalNetworkInterfaces = os.networkInterfaces

    const safeNetworkInterfaces = function networkInterfacesSafe() {
        try {
            return originalNetworkInterfaces.call(os)
        } catch (err) {
            logWarn('os.networkInterfaces failed, using fallback loopback stub:', err)
            return {
                lo: [
                    {
                        address: '127.0.0.1',
                        netmask: '255.0.0.0',
                        family: 'IPv4',
                        mac: '00:00:00:00:00:00',
                        internal: true,
                        cidr: '127.0.0.1/8',
                    },
                ],
            }
        }
    }

    safeNetworkInterfaces.__dsPatched = true
    os.networkInterfaces = safeNetworkInterfaces
    return safeNetworkInterfaces
}

// Install immediately when required (for NODE_OPTIONS preload)
installNetworkInterfacesFallback()

module.exports = { installNetworkInterfacesFallback }
