module.exports = {
  fireError (e) {
    if (process.send) {
      process.send({ type: 'error', event: e, message: e.message })
    }
  },
  fireStatus (status) {
    if (process.send) {
      process.send({ type: 'status', event: status })
    }
  }
}
