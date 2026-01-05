'use strict'

import { createRequire } from 'node:module'
import log from './util.log.gui'

const require = createRequire(import.meta.url)
const { installNetworkInterfacesFallback } = require('./os-network-fallback.cjs')

installNetworkInterfacesFallback(log)
