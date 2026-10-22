function install (_app, api) {
  api.feedback = {
    report: options => api.ipc.invokeChannel('feedback', options || {}),
  }
}

export default { install }
