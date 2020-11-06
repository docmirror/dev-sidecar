import lodash from "lodash";

const defConfig = {a:{aa:1,bb:2},b:{c:2},d:[1,2,3],e:{ee:1,aa:2}}
const newConfig = {a:{aa:1,bb:2},d:[5],e:{bb:2,ee:2,aa:2}}

const result = { d: [ 5 ],e:{ee:2} }

const load = {a:1,d:[5,1,2,3]}
const DELETE =  '____DELETE____'
// lodash.mergeWith(defConfig,newConfig, (objValue, srcValue, key, object, source, stack) => {
//     console.log('stack', stack,'key',key)
//
//     if (lodash.isArray(srcValue)) {
//         return srcValue
//     }
//     if(lodash.isEqual(objValue,srcValue)){
//        //如何删除
//         return DELETE
//     }
// })

function doMerge (defObj, newObj) {
    const defObj2 = { ...defObj }
    const newObj2 = {}
    lodash.forEach(newObj,(newValue,key)=>{
       // const newValue = newObj[key]
        const defValue = defObj[key]
        if (lodash.isEqual(newValue, defValue)) {
            delete defObj2[key]
            return
        }

        if (lodash.isArray(newValue)) {
            delete defObj2[key]
            newObj2[key] = newValue
            return
        }
        if (lodash.isObject(newValue)) {
            newObj2[key] = doMerge(defValue, newValue)
            delete defObj2[key]
        } else {
            // 基础类型，直接覆盖
            delete defObj2[key]
            newObj2[key] = newValue
        }
    })
    // defObj 里面剩下的是被删掉的
    lodash.forEach(defObj2, (defValue, key) => {
        newObj2[key] = null
    })
    return newObj2
}

console.log(doMerge(defConfig,newConfig))



