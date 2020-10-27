const cmd1 = require('node-cmd')
cmd1.get('set',
  function (err, data, stderr) {
    console.log('cmd complete:', err, data, stderr)
    if (err) {
      console.error('cmd 命令执行错误：', err, stderr)
    } else {
      console.log('cmd 命令执行结果：', data)
    }
  }
)

// var process = require('child_process')
//
// var cmd = 'set'
// process.exec(cmd, function (error, stdout, stderr) {
//   console.log('error:' + error)
//   console.log('stdout:' + stdout)
//   console.log('stderr:' + stderr)
// })
