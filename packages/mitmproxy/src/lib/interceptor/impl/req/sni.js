module.exports = {
  name: 'sni',
  priority: 123,
  requestIntercept (context, interceptOpt, req, res, _ssl, _next) {
    const { rOptions, log } = context

    // 配置 sni: "" 时，不发送 SNI（Node 在 servername 为空字符串时不会发送 SNI 扩展）。
    // 实测 production.cloudflare.docker.com / character.ai 等 Cloudflare 域名在 TLS1.2 下可用。
    if (interceptOpt.sni === '') {
      rOptions.servername = ''
      res.setHeader('DS-Interceptor', 'sni: (disabled)')
      log.info(`sni intercept: SNI 已禁用: ${rOptions.hostname}`)
      return true
    }

    let unVerifySsl = rOptions.agent && rOptions.agent.options.rejectUnauthorized === false

    rOptions.servername = interceptOpt.sni
    if (rOptions.agent && rOptions.agent.options.rejectUnauthorized && rOptions.agent.unVerifySslAgent) {
      // rOptions.agent.options.rejectUnauthorized = false // 不能直接在agent上进行修改属性值，因为它采用了单例模式，所有请求共用这个对象的
      rOptions.agent = rOptions.agent.unVerifySslAgent
      unVerifySsl = true
    }

    const unVerifySslStr = unVerifySsl ? ', unVerifySsl' : ''
    res.setHeader('DS-Interceptor', `sni: ${interceptOpt.sni}${unVerifySslStr}`)

    log.info(`sni intercept: sni replace servername: ${rOptions.hostname} ➜ ${rOptions.servername}${unVerifySslStr}`)
    return true
  },
  is (interceptOpt) {
    // 注意：sni 为空字符串时也要生效，用于显式禁用 SNI
    return interceptOpt.sni !== undefined && interceptOpt.sni !== null && !interceptOpt.proxy // proxy生效时，sni不需要生效，因为proxy中也会使用sni覆盖 rOptions.servername
  },
}
