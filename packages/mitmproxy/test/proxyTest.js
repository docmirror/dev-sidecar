const https = require('https')

var options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
  }
}

var request = https.get('https://api.github.com/', options, function (response) {
  response.on('data', function (data) {
    process.stdout.write(data)
  })
})

request.on('error', function (error) {
  console.log(error)
})
