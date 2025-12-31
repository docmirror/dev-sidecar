import assert from 'node:assert';
import lodash from 'lodash';
import mergeApi from '../src/merge.js';

// 默认配置
const defConfig = {
  a: {
    aa: { value: 1 },
    bb: { value: 2 },
  },
  b: { c: 2 },
  c: 1,
  d: [1, 2, 3],
  e: {
    aa: 2,
    ee: 5,
  },
  f: {
    x: 1,
  },
  g: [1, 2],
  h: null,
  i: null,
}

// 自定义配置
const customConfig = {
  a: {
    bb: { value: 2 },
    cc: { value: 3 },
  },
  b: { c: 2 },
  c: null,
  d: [1, 2, 3, 4],
  e: {
    aa: 2,
    ee: 5,
    ff: 6,
  },
  f: {},
  g: [1, 2],
  h: null,
}

// doDiff
const doDiffResult = mergeApi.doDiff(defConfig, customConfig)
console.log('doDiffResult:', JSON.stringify(doDiffResult, null, 2))
console.log('\r')
// 校验doDiff结果
const doDiffExpect = {
  a: {
    aa: null,
    cc: { value: 3 },
  },
  c: null,
  d: [1, 2, 3, 4],
  e: {
    ff: 6,
  },
  f: {
    x: null,
  },
}
console.log('check diff result:', lodash.isEqual(doDiffResult, doDiffExpect))
console.log('\r')

// doMerge
const doMergeResult = mergeApi.doMerge(defConfig, doDiffResult)
// delete null item
mergeApi.deleteNullItems(doMergeResult)
console.log('running:', JSON.stringify(doMergeResult, null, 2))
// 校验doMerge结果
const doMergeExpect = {
  a: {
    bb: { value: 2 },
    cc: { value: 3 },
  },
  b: { c: 2 },
  d: [1, 2, 3, 4],
  e: {
    aa: 2,
    ee: 5,
    ff: 6,
  },
  f: {},
  g: [1, 2],
}

const result = lodash.isEqual(doMergeResult, doMergeExpect)
console.log('check merge result:', result)
console.log('\r')
assert.strictEqual(result, true)
