module.exports = {
  name: 'Git.exe代理',
  enabled: false,
  tip: '如果你没有安装git命令行则不需要启动它',
  setting: {
    proxyHttp: false, // Git.exe 是否代理HTTP请求
    sslVerify: true // Git.exe 是否关闭sslVerify，true=关闭 false=开启
  }
}
