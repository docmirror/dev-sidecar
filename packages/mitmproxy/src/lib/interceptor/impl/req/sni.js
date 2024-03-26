module.exports = {
  requestIntercept (context, interceptOpt) {
    const { rOptions } = context
    if (interceptOpt.sni != null) {
      rOptions.servername = interceptOpt.sni
      console.log('sni replace', rOptions.hostname, rOptions.servername)
    }
    return true
  },
  is (interceptOpt) {
    return !!interceptOpt.sni
  }
}
