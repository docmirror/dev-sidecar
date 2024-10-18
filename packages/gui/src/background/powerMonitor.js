import { powerMonitor as _powerMonitor, BrowserWindow } from 'electron'
import { setMainWindowHandle, insertWndProcHook, removeWndProcHook, acquireShutdownBlock, releaseShutdownBlock } from '@natmri/platform-napi'

class PowerMonitor {
  constructor() {
    this.setup = false
    this._listeners = []
    this._shutdownCallback = null
  }

  /**
   *
   * @param {BrowserWindow} window
   */
  setupMainWindow(window) {
    if(!this.setup) {
      setMainWindowHandle(window.getNativeWindowHandle().readBigInt64LE())
      this.setup = true
    }
  }

  addListener(event, listener) {
    return this.on(event, listener)
  }

  removeListener(event, listener) {
    return this.off(event, listener)
  }

  removeAllListeners(event) {
    if(event === 'shutdown' && process.platform === 'win32') {
      this._listeners = []
      if(this._shutdownCallback) {
        removeWndProcHook()
        releaseShutdownBlock()
        this._shutdownCallback = null
      }
    } else {
      return _powerMonitor.removeAllListeners(event)
    }
  }

  on(event, listener) {
    if(event === 'shutdown' && process.platform === 'win32') {
      if(!this._shutdownCallback) {
        this._shutdownCallback = async () => {
          await Promise.all(this._listeners.map((fn) => fn()))
          releaseShutdownBlock()
        }
        insertWndProcHook(this._shutdownCallback)
        acquireShutdownBlock("正在停止 DevSidecar 代理")
      }
      this._listeners.push(listener)
    } else {
      return _powerMonitor.on(event, listener)
    }
  }

  off(event, listener) {
    if(event === 'shutdown' && process.platform === 'win32') {
      this._listeners = this._listeners.filter((fn) => fn !== listener)
    } else {
      return _powerMonitor.off(event, listener)
    }
  }

  once(event, listener) {
    if(event === 'shutdown' && process.platform === 'win32') {
      return this.on(event, listener)
    } else {
      return _powerMonitor.once(event, listener)
    }
  }

  emit(event, ...args) {
    return _powerMonitor.emit(event, ...args)
  }

  eventNames() {
    return _powerMonitor.eventNames()
  }

  getMaxListeners() {
    return _powerMonitor.getMaxListeners()
  }

  listeners(event) {
    return _powerMonitor.listeners(event)
  }

  rawListeners(event) {
    return _powerMonitor.rawListeners(event)
  }

  listenerCount(event, listener) {
    return _powerMonitor.listenerCount(event, listener)
  }

  /**
   * @returns {boolean}
   */
  get onBatteryPower() {
    return _powerMonitor.onBatteryPower
  }

  /**
   * @param {number} idleThreshold
   * @returns {'active'|'idle'|'locked'|'unknown'}
   */
  getSystemIdleState(idleThreshold) {
    return _powerMonitor.getSystemIdleState(idleThreshold)
  }

  /**
   * @returns {number}
   */
  getSystemIdleTime() {
    return _powerMonitor.getSystemIdleTime()
  }

  /**
   * @returns {'unknown'|'nominal'|'fair'|'serious'|'critical'}
   */
  getCurrentThermalState() {
    return _powerMonitor.getCurrentThermalState()
  }

  /**
   * @returns {boolean}
   */
  isOnBatteryPower() {
    return _powerMonitor.isOnBatteryPower()
  }
}

export const powerMonitor = new PowerMonitor()
