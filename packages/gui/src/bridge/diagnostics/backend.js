import fs from 'node:fs'
import electron from '../../electron.js'

const sessions = new Map()
const requestSessions = new Map()
const partition = 'persist:dev-sidecar-diagnostics'
let activeSessionId = null
let registered = false
const MAX_ENTRIES = 2000

function appendEntry (sessionId, entry) {
  const entries = getSession(sessionId)
  // sessionId 必须随条目一起返回/发送：前端 onDiagnosticEvent 用它过滤本会话事件，
  // 缺了它实时日志一条都进不了面板（issue #742 之外的「网页诊断日志不显示」缺陷）
  entries.push({ sessionId, timestamp: new Date().toISOString(), ...entry })
  if (entries.length > MAX_ENTRIES)
    entries.splice(0, entries.length - MAX_ENTRIES)
  return entries[entries.length - 1]
}

function getSession (id) {
  if (typeof id !== 'string' || !/^[A-Z0-9-]{1,100}$/i.test(id))
    throw new Error('诊断会话无效')
  if (!sessions.has(id))
    sessions.set(id, [])
  return sessions.get(id)
}

const diagnosticsApi = {
  record (sessionId, entry) {
    if (!sessionId)
      return null
    return appendEntry(sessionId, entry)
  },
  install ({ ipcMain, dialog, log }) {
    ipcMain.handle('diagnostics', async (event, message = {}) => {
      try {
        const session = getSession(message.sessionId)
        if (message.action === 'start') {
          log.info('网页诊断 start:', JSON.stringify({ sessionId: message.sessionId, previousActiveSessionId: activeSessionId }))
          activeSessionId = message.sessionId
          if (!registered) {
            const diagnosticSession = electron.session.fromPartition(partition)
            diagnosticSession.webRequest.onBeforeSendHeaders({ urls: ['<all_urls>'] }, (details, callback) => {
              const sessionId = activeSessionId
              log.info('网页诊断 request hook:', JSON.stringify({ sessionId, id: details.id, url: details.url, webContentsId: details.webContentsId }))
              if (sessionId && details.webContentsId !== -1) {
                requestSessions.set(details.id, sessionId)
                details.requestHeaders['X-Dev-Sidecar-Diagnostics-Session'] = sessionId
              }
              callback({ requestHeaders: details.requestHeaders })
            })
            const recordWebview = (details) => {
              const sessionId = requestSessions.get(details.id) || activeSessionId
              requestSessions.delete(details.id)
              if (!sessionId)
                return
              const entry = appendEntry(sessionId, {
                source: 'webview',
                phase: 'response',
                url: details.url,
                method: details.method,
                statusCode: details.statusCode,
                error: details.error || '',
                resourceType: details.resourceType,
                browserIp: details.ip || null,
                requestId: details.id || null,
                responseHeaders: details.responseHeaders || {},
              })
              event.sender.send('diagnostics', entry)
            }
            diagnosticSession.webRequest.onCompleted({ urls: ['<all_urls>'] }, recordWebview)
            diagnosticSession.webRequest.onErrorOccurred({ urls: ['<all_urls>'] }, recordWebview)
            registered = true
          }
          return { ok: true }
        }
        if (message.action === 'stop') {
          log.info('网页诊断 stop:', JSON.stringify({ sessionId: message.sessionId, activeSessionId }))
          if (activeSessionId === message.sessionId)
            activeSessionId = null
          return { ok: true }
        }
        if (message.action === 'clear') {
          session.length = 0
          return { ok: true }
        }
        if (message.action === 'get')
          return session.slice()
        if (message.action === 'trace') {
          const entry = appendEntry(message.sessionId, { source: 'gui', phase: 'trace', message: message.message || '', details: message.details || null })
          event.sender.send('diagnostics', entry)
          log.info('网页诊断追踪:', JSON.stringify(entry))
          return { ok: true }
        }
        if (message.action === 'export') {
          const result = await dialog.showSaveDialog({ defaultPath: 'dev-sidecar-web-diagnostics.json', filters: [{ name: 'JSON', extensions: ['json'] }] })
          if (result.canceled || !result.filePath)
            return { canceled: true }
          fs.writeFileSync(result.filePath, JSON.stringify({ exportedAt: new Date().toISOString(), sessionId: message.sessionId, entries: session }, null, 2), 'utf8')
          return { path: result.filePath }
        }
        throw new Error('未知诊断操作')
      } catch (error) {
        log.error('网页诊断操作失败:', error)
        throw error
      }
    })
  },
}

export { diagnosticsApi }
export default diagnosticsApi
