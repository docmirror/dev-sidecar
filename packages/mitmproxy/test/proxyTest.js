const http = require('http')

var options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
  },
  lookup (hostname, options, callback) {
    const ip = '106.52.191.148'
    console.log('lookup')
    callback(null, ip, 4)
  }
}

var request = http.get('http://test.target/', options, function (response) {
  response.on('data', function (data) {
    process.stdout.write(data)
  })
})

request.on('error', function (error) {
  console.log(error)
})
