const https = require('node:https')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'

function request () {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'test1.gagedigital.com',
      port: 443,
      path: '/ssltest.php',
      method: 'GET',
      rejectUnauthorized: true,
    }
    console.log('ssl test: gagedigital')
    const req = https.request(options, (res) => {
      console.log('statusCode:', res.statusCode)
      console.log('headers:', res.headers)

      res.on('data', (d) => {
        process.stdout.write(d)
        resolve()
      })
    })

    req.on('error', (e) => {
      console.error(e)
      reject(e)
    })
    req.end()
  })
}
// eslint-disable-next-line no-undef
describe('ssl.verify', () => {
  // eslint-disable-next-line no-undef
  it('regex.test.js', async () => {
    // https.request('https://test1.gagedigital.com/ssltest.php')
    await request()

    // expect(ret).be.ok
  })
})
