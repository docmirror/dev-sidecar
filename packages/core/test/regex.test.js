import assert from 'node:assert'
import { expect } from 'chai'
// eslint-disable-next-line no-undef
describe('test', () => {
  // eslint-disable-next-line no-undef
  it('regexp', () => {
    const test = '^/[^/]+/[^/]+(?:/releases(?:/.*)?)?$'
    const reg = new RegExp(test)

    const ret = reg.test('/docmirror/dev-sidecar/releases/tag')
    console.log(ret)
    assert.strictEqual(ret, true)

    expect(ret).be.ok
  })
})
