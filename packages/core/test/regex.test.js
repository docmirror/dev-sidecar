const expect = require('chai').expect
// eslint-disable-next-line no-undef
describe('test', () => {
  // eslint-disable-next-line no-undef
  it('regexp', () => {
    const test = '^/[^/]+/[^/]+(/releases(/.*)?)?$'
    const reg = new RegExp(test)

    const ret = reg.test('/docmirror/dev-sidecar/releases/tag')
    // eslint-disable-next-line no-unused-expressions
    expect(ret).be.ok
  })
})
