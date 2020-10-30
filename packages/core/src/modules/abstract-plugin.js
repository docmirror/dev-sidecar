class AbstractPlugin {
  constructor (context) {
    this._context = context
  }

  _getConfig () {
    return this._context.config.get()
  }

  _getShell () {
    return this._context.shell
  }

  _fireStatus (event) {
    this._context.event.fire('status', event)
  }
}

module.exports = AbstractPlugin
