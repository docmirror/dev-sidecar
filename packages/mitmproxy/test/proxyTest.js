const http = require('node:http')

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
  },
  lookup (hostname, options, callback) {
    const ip = '106.52.191.148'
    console.log('lookup')
    callback(null, ip, 4)
  },
}

const request = http.get('http://test.target/', options, (response) => {
  response.on('data', (data) => {
    process.stdout.write(data)
  })
})

request.on('error', (error) => {
  console.log(error)
})
