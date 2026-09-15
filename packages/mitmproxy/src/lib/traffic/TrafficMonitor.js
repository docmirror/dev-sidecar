const log = require('../../utils/util.log.server')

const DEFAULT_PROXY_PORTS = [31180, 31181]
const ENTRY_TTL = 60 * 1000
const BLOCKED_HOST_TTL = 5 * 60 * 1000
const DOMAIN_MAP_MAX = 5000
const DOMAIN_IDLE_TTL = 60 * 60 * 1000

function normalizeHost (host) {
  if (!host) {
    return 'unknown'
  }
  let value = String(host).trim()
  if (value.startsWith('[')) {
    const closeIdx = value.indexOf(']')
    value = value.slice(1, closeIdx >= 0 ? closeIdx : value.length)
  } else if (value.includes(':')) {
    value = value.slice(0, value.indexOf(':'))
  }
  return value || 'unknown'
}

function isLoopbackAddress (address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

class TrafficMonitor {
  constructor () {
    this.entries = new Map() // clientPort -> entry
    this.domainMap = new Map() // host -> { requests, errors, lastSeen }
    this.blockedHosts = new Map() // host -> 过期时间戳（Adblock 拦截域名）
    this.internalPortMap = new Map() // MITM fakeServer 本地端口 -> 真实客户端端口
    this.proxyPorts = DEFAULT_PROXY_PORTS
    this.timer = null
    this.lastSampleTime = Date.now()
    // 终身累计字节（条目过期删除后仍保留，避免 UI 上“累计流量”回落）
    this.lifetimeBytesUp = 0
    this.lifetimeBytesDown = 0
  }

  start (proxyPorts) {
    if (this.timer) {
      return
    }
    if (proxyPorts && proxyPorts.length > 0) {
      this.proxyPorts = proxyPorts
    }
    this.lastSampleTime = Date.now()
    this.timer = setInterval(() => this.sampleAndSend(), 1000)
    if (this.timer.unref) {
      this.timer.unref()
    }
    log.info(`[traffic] 流量统计已启动，代理端口: ${this.proxyPorts.join(', ')}`)
  }

  stop () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.internalPortMap.clear()
  }

  // MITM：将 fakeServer 连接的本地端口映射回真实客户端端口，便于进程归属
  mapInternalToClient (internalPort, clientPort) {
    if (internalPort != null && clientPort != null) {
      this.internalPortMap.set(internalPort, clientPort)
    }
  }

  resolveClientPort (socket) {
    if (!socket) {
      return null
    }
    const remotePort = socket.remotePort
    if (!remotePort) {
      return null
    }
    // 内部连接（连到本地 fakeServer）时，映射回真实客户端端口
    if (isLoopbackAddress(socket.remoteAddress) && this.internalPortMap.has(remotePort)) {
      return this.internalPortMap.get(remotePort)
    }
    return remotePort
  }

  setProcessName (clientPort, name) {
    const entry = this.entries.get(clientPort)
    if (entry && name) {
      entry.processName = name
      entry.lastActive = Date.now()
    }
  }

  getActiveClientPorts () {
    return [...this.entries.keys()]
  }

  attachRequest (req, res) {
    const socket = req.socket || (req.stream && req.stream.session && req.stream.session.socket)
    if (!socket) {
      return
    }
    const clientPort = this.resolveClientPort(socket)
    if (!clientPort) {
      return
    }
    const host = normalizeHost(req.headers.host || req.authority || req.url)
    // MITM 内部连接只更新 host/请求计数，字节统计仍走已关联的客户端 socket
    const isInternal = isLoopbackAddress(socket.remoteAddress) && this.internalPortMap.has(socket.remotePort)
    this.ensureEntry(socket, clientPort, host, { keepExistingSocket: isInternal })
    this.markRequest(clientPort, host)

    res.once('finish', () => {
      if (res.statusCode >= 400) {
        this.markError(clientPort, host)
      }
    })
    res.once('close', () => {
      if (!res.writableFinished) {
        this.markError(clientPort, host)
      }
    })
  }

  attachConnect (req, cltSocket) {
    const clientPort = cltSocket.remotePort
    if (!clientPort) {
      return
    }
    const host = normalizeHost(req.url)
    this.ensureEntry(cltSocket, clientPort, host)
    this.markRequest(clientPort, host)
    cltSocket.once('error', () => {
      this.markError(clientPort, host)
    })
  }

  markConnectError (host) {
    const normalized = normalizeHost(host)
    this.markError(null, normalized)
  }

  ensureEntry (socket, clientPort, host, options = {}) {
    const now = Date.now()
    let entry = this.entries.get(clientPort)
    if (!entry) {
      entry = {
        clientPort,
        host,
        processName: '未知进程',
        socket,
        bytesUp: 0,
        bytesDown: 0,
        lastBytesUp: socket.bytesRead || 0,
        lastBytesDown: socket.bytesWritten || 0,
        lastSampleBytesUp: 0,
        lastSampleBytesDown: 0,
        speedUp: 0,
        speedDown: 0,
        requests: 0,
        errors: 0,
        lastActive: now,
      }
      this.entries.set(clientPort, entry)
    } else {
      // keep-alive 复用：先把上次采样后的增量记入累计值，再重置基线，避免丢字节
      if (!options.keepExistingSocket) {
        const bytesRead = socket.bytesRead || 0
        const bytesWritten = socket.bytesWritten || 0
        const deltaUp = Math.max(0, bytesRead - entry.lastBytesUp)
        const deltaDown = Math.max(0, bytesWritten - entry.lastBytesDown)
        entry.bytesUp += deltaUp
        entry.bytesDown += deltaDown
        this.lifetimeBytesUp += deltaUp
        this.lifetimeBytesDown += deltaDown
        entry.lastBytesUp = bytesRead
        entry.lastBytesDown = bytesWritten
        entry.socket = socket
      }
      entry.host = host
      entry.lastActive = now
    }
    if (!options.keepExistingSocket) {
      // 同一 socket 只挂一次 close，避免 keep-alive 请求叠加监听器
      const flagKey = Symbol.for('dev-sidecar.traffic.closeAttached')
      if (!socket[flagKey]) {
        socket[flagKey] = true
        socket.once('close', () => {
          this.finalizeSocket(clientPort, socket)
        })
      }
    }
    return entry
  }

  finalizeSocket (clientPort, closedSocket) {
    const entry = this.entries.get(clientPort)
    if (!entry) {
      return
    }
    // 端口被新 socket 复用时，旧 socket 的 close 事件不应影响新条目
    if (closedSocket && entry.socket && entry.socket !== closedSocket) {
      return
    }
    const socket = entry.socket
    if (socket) {
      const deltaUp = Math.max(0, (socket.bytesRead || 0) - entry.lastBytesUp)
      const deltaDown = Math.max(0, (socket.bytesWritten || 0) - entry.lastBytesDown)
      entry.bytesUp += deltaUp
      entry.bytesDown += deltaDown
      this.lifetimeBytesUp += deltaUp
      this.lifetimeBytesDown += deltaDown
      entry.lastBytesUp = socket.bytesRead || 0
      entry.lastBytesDown = socket.bytesWritten || 0
      entry.socket = null
    }
    entry.lastActive = Date.now()
  }

  touchDomain (normalized) {
    let domain = this.domainMap.get(normalized)
    if (!domain) {
      domain = { requests: 0, errors: 0, lastSeen: Date.now() }
      this.domainMap.set(normalized, domain)
      this.evictDomainMapIfNeeded()
    } else {
      domain.lastSeen = Date.now()
    }
    return domain
  }

  evictDomainMapIfNeeded () {
    if (this.domainMap.size <= DOMAIN_MAP_MAX) {
      return
    }
    const now = Date.now()
    for (const [host, domain] of this.domainMap) {
      if (now - (domain.lastSeen || 0) > DOMAIN_IDLE_TTL) {
        this.domainMap.delete(host)
      }
    }
    // 仍超限时按插入序淘汰最旧条目（Map 保持插入顺序）
    while (this.domainMap.size > DOMAIN_MAP_MAX) {
      const oldest = this.domainMap.keys().next()
      if (oldest.done) {
        break
      }
      this.domainMap.delete(oldest.value)
    }
  }

  markRequest (clientPort, host) {
    const normalized = normalizeHost(host)
    if (this.isBlockedHost(normalized)) {
      return
    }
    const now = Date.now()
    if (clientPort != null) {
      const entry = this.entries.get(clientPort)
      if (entry) {
        entry.requests++
        entry.lastActive = now
      }
    }
    this.touchDomain(normalized).requests++
  }

  markError (clientPort, host) {
    const normalized = normalizeHost(host)
    if (this.isBlockedHost(normalized)) {
      return
    }
    const now = Date.now()
    if (clientPort != null) {
      const entry = this.entries.get(clientPort)
      if (entry) {
        entry.errors++
        entry.lastActive = now
      }
    }
    this.touchDomain(normalized).errors++
  }

  // Adblock 规则命中时 DNS 返回 0.0.0.0 / ::，这类请求/错误不应进入域名错误统计
  markBlocked (host) {
    const normalized = normalizeHost(host)
    if (normalized === 'unknown') {
      return
    }
    const wasBlocked = this.isBlockedHost(normalized)
    this.blockedHosts.set(normalized, Date.now() + BLOCKED_HOST_TTL)
    this.domainMap.delete(normalized)
    if (!wasBlocked) {
      log.info(`[traffic] 已忽略 Adblock 拦截域名: ${normalized}`)
    }
  }

  isBlockedHost (normalized) {
    const expiresAt = this.blockedHosts.get(normalized)
    if (!expiresAt) {
      return false
    }
    if (Date.now() < expiresAt) {
      return true
    }
    this.blockedHosts.delete(normalized)
    return false
  }

  sweepBlockedHosts (now) {
    for (const [host, expiresAt] of this.blockedHosts) {
      if (now >= expiresAt) {
        this.blockedHosts.delete(host)
      }
    }
  }

  sampleAndSend () {
    const now = Date.now()
    const dt = Math.max(1, (now - this.lastSampleTime) / 1000)
    this.lastSampleTime = now
    this.sweepBlockedHosts(now)

    for (const entry of this.entries.values()) {
      const socket = entry.socket
      if (socket && !socket.destroyed) {
        const bytesRead = socket.bytesRead || 0
        const bytesWritten = socket.bytesWritten || 0
        const deltaUp = Math.max(0, bytesRead - entry.lastBytesUp)
        const deltaDown = Math.max(0, bytesWritten - entry.lastBytesDown)
        entry.bytesUp += deltaUp
        entry.bytesDown += deltaDown
        this.lifetimeBytesUp += deltaUp
        this.lifetimeBytesDown += deltaDown
        entry.lastBytesUp = bytesRead
        entry.lastBytesDown = bytesWritten
      }

      entry.speedUp = Math.round(Math.max(0, entry.bytesUp - entry.lastSampleBytesUp) / dt)
      entry.speedDown = Math.round(Math.max(0, entry.bytesDown - entry.lastSampleBytesDown) / dt)
      entry.lastSampleBytesUp = entry.bytesUp
      entry.lastSampleBytesDown = entry.bytesDown
    }

    // 清理已关闭且长时间无活动的连接条目；字节已计入 lifetime，删除不会导致累计值回落
    for (const [clientPort, entry] of this.entries) {
      if (!entry.socket && now - entry.lastActive > ENTRY_TTL) {
        this.entries.delete(clientPort)
        if (this.internalPortMap.size > 0) {
          for (const [internalPort, mappedClientPort] of this.internalPortMap) {
            if (mappedClientPort === clientPort) {
              this.internalPortMap.delete(internalPort)
            }
          }
        }
      }
    }

    const processMap = new Map()
    let totalRequests = 0
    let totalErrors = 0
    for (const entry of this.entries.values()) {
      const name = entry.processName || '未知进程'
      let process = processMap.get(name)
      if (!process) {
        process = {
          processName: name,
          bytesUp: 0,
          bytesDown: 0,
          speedUp: 0,
          speedDown: 0,
          requests: 0,
          errors: 0,
          connections: 0,
        }
        processMap.set(name, process)
      }
      process.bytesUp += entry.bytesUp
      process.bytesDown += entry.bytesDown
      process.speedUp += entry.speedUp
      process.speedDown += entry.speedDown
      process.requests += entry.requests
      process.errors += entry.errors
      // 连接数只统计当前仍存活的 socket，socket 关闭后实时下降
      if (entry.socket && !entry.socket.destroyed) {
        process.connections += 1
      }
    }

    const domainStats = []
    for (const [host, domain] of this.domainMap) {
      totalRequests += domain.requests
      totalErrors += domain.errors
      domainStats.push({
        host,
        requests: domain.requests,
        errors: domain.errors,
        errorRate: domain.requests > 0 ? Number((domain.errors / domain.requests).toFixed(4)) : 0,
      })
    }
    domainStats.sort((a, b) => b.errors - a.errors || b.requests - a.requests)

    const stats = {
      processStats: [...processMap.values()].sort((a, b) => b.speedDown - a.speedDown || b.speedUp - a.speedUp || b.bytesDown - a.bytesDown),
      domainStats: domainStats.slice(0, 100),
      total: {
        requests: totalRequests,
        errors: totalErrors,
        errorRate: totalRequests > 0 ? Number((totalErrors / totalRequests).toFixed(4)) : 0,
        bytesUp: this.lifetimeBytesUp,
        bytesDown: this.lifetimeBytesDown,
      },
      updateTime: now,
    }

    this.send(stats)
  }

  send (stats) {
    if (typeof process.send !== 'function') {
      return
    }
    try {
      process.send({ type: 'traffic', event: { key: 'stats', value: stats } })
    } catch (e) {
      log.debug('[traffic] 发送流量统计失败:', e.message)
    }
  }
}

module.exports = new TrafficMonitor()
