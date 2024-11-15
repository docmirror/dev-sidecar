const lodash = require('lodash')

/**
 * 找出 newObj 相对于 oldObj 有差异的部分
 *
 * @param oldObj
 * @param newObj
 * @returns {{}|*}
 */
function doDiff (oldObj, newObj) {
  if (newObj == null) {
    return oldObj
  }

  // 临时的对象，用于找出被删除的数据
  const tempObj = { ...oldObj }
  // 删除空项，使差异对象更干净一些，体现出用户自定义内容
  deleteNullItems(tempObj)

  // 保存差异的对象
  const diffObj = {}

  // 读取新对象，并解析
  for (const key in newObj) {
    const newValue = newObj[key]
    const oldValue = oldObj[key]

    // 新值不为空，旧值为空时，直接取新值
    if (newValue != null && oldValue == null) {
      diffObj[key] = newValue
      continue
    }
    // 新旧值相等时，忽略
    if (lodash.isEqual(newValue, oldValue)) {
      delete tempObj[key]
      continue
    }
    // 新的值为数组时，直接取新值
    if (lodash.isArray(newValue)) {
      diffObj[key] = newValue
      delete tempObj[key]
      continue
    }

    // 新的值为对象时，递归合并
    if (lodash.isObject(newValue)) {
      diffObj[key] = doDiff(oldValue, newValue)
      delete tempObj[key]
      continue
    }

    // 基础类型，直接覆盖
    delete tempObj[key]
    diffObj[key] = newValue
  }

  // tempObj 里面剩下的是被删掉的数据
  lodash.forEach(tempObj, (oldValue, key) => {
    // 将被删除的属性设置为null，目的是为了merge时，将被删掉的对象设置为null，达到删除的目的
    diffObj[key] = null
  })

  return diffObj
}

function deleteNullItems (target) {
  lodash.forEach(target, (item, key) => {
    if (item == null || item === '[delete]') {
      delete target[key]
    }
    if (lodash.isObject(item)) {
      deleteNullItems(item)
    }
  })
}

module.exports = {
  doMerge (oldObj, newObj) {
    return lodash.mergeWith(oldObj, newObj, (objValue, srcValue) => {
      if (lodash.isArray(objValue)) {
        return srcValue
      }
    })
  },
  doDiff,
  deleteNullItems
}
