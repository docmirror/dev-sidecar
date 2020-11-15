module.exports = function createInterceptor (context) {
  const { log } = context
  return {
    responseIntercept (interceptOpt, rOptions, req, res, proxyReq, proxyRes, ssl) {
      const script = `
      <script>
      try{
          ${interceptOpt.script}
      }catch (err){
          console.error('脚本执行出错：',err)
      }
      </script>
      `
      log.info('responseIntercept: body script', rOptions.hostname, rOptions.path)
      return {
        body: script
      }
    },
    is (interceptOpt) {
      return interceptOpt.script
    }
  }
}
