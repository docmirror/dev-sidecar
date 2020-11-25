module.exports = {
  fireError (e) {
    process.send({ type: 'error', event: e })
  },
  fireStatus (status) {
    process.send({ type: 'status', event: status })
  }
}
