const AgentOrigin = require('agentkeepalive')

module.exports = class Agent extends AgentOrigin {
  // Hacky
  getName (option) {
    let name = AgentOrigin.prototype.getName.call(this, option)
    name += ':'
    if (option.customSocketId) {
      name += option.customSocketId
    }
    return name
  }
}
