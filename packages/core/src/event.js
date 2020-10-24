const listener = {}
let index = 1
function register (channel, handle, order = 10) {
  let handles = listener[channel]
  if (handles == null) {
    handles = listener[channel] = []
  }
  handles.push({ id: index, handle, order })
  handles.sort((a, b) => { return a.order - b.order })
  return index++
}
function fire (channel, event) {
  const handles = listener[channel]
  if (handles == null) {
    return
  }
  for (const item of handles) {
    item.handle(event)
  }
}

function unregister (id) {
  for (const key in listener) {
    const handlers = listener[key]
    for (let i = 0; i < handlers.length; i++) {
      const handle = handlers[i]
      if (handle.id === id) {
        handlers.splice(i)
        return
      }
    }
  }
}
const EventHub = {
  register,
  fire,
  unregister
}
module.exports = EventHub
