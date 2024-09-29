module.exports = {
  name: 'sni',
  priority: 122,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    let unVerifySsl = rOptions.agent.options.rejectUnauthorized === false

    rOptions.servername = interceptOpt.sni
    if (rOptions.agent.options.rejectUnauthorized && rOptions.agent.unVerifySslAgent) {
      // rOptions.agent.options.rejectUnauthorized = false // 不能直接在agent上进行修改属性值，因为它采用了单例模式，所有请求共用这个对象的
      rOptions.agent = rOptions.agent.unVerifySslAgent
      unVerifySsl = true
    }
    res.setHeader('DS-Interceptor', `sni: ${interceptOpt.sni}${unVerifySsl ? ', unVerifySsl' : ''}`)

    log.info('sni intercept: sni replace servername:', rOptions.hostname, '➜', rOptions.servername, (unVerifySsl ? ', unVerifySsl' : ''))
    return true
  },
  is (interceptOpt) {
    return !!interceptOpt.sni && !interceptOpt.proxy // proxy生效时，sni不需要生效，因为proxy中也会使用sni覆盖 rOptions.servername
  }
}
