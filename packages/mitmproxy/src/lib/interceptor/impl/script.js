module.exports = {
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log } = context
    const script = `
      <script>
      try{
          ${interceptOpt.script}
      }catch (err){
          console.error('脚本执行出错：',err)
      }
      </script>
      `
    log.info('responseIntercept: append script', rOptions.hostname, rOptions.path)
    return {
      head: script
    }
  },
  is (interceptOpt) {
    return interceptOpt.script
  }
}
