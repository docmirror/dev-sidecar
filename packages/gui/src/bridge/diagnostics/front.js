function install (_app, api) {
  api.diagnostics = {
    start: sessionId => api.ipc.invokeChannel('diagnostics', { action: 'start', sessionId }),
    stop: sessionId => api.ipc.invokeChannel('diagnostics', { action: 'stop', sessionId }),
    clear: sessionId => api.ipc.invokeChannel('diagnostics', { action: 'clear', sessionId }),
    getLogs: sessionId => api.ipc.invokeChannel('diagnostics', { action: 'get', sessionId }),
    export: ({ sessionId }) => api.ipc.invokeChannel('diagnostics', { action: 'export', sessionId }),
    trace: (sessionId, message, details) => api.ipc.invokeChannel('diagnostics', { action: 'trace', sessionId, message, details }),
  }
}

export default { install }
