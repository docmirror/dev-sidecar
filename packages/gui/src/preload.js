try {
  window.ipcRenderer = require('electron').ipcRenderer

  window.onerror = (message, source, lineno, colno, error) => {
    window.ipcRenderer.send(`[ERROR] JavaScript脚本异常：Error in ${source} at line ${lineno}: ${message}`, error)
  }
} catch (e) {
  console.error('load electron.ipcRenderer error:', e)
}
