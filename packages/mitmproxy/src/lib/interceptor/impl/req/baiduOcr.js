function getTomorrow () {
  const now = new Date()
  const tomorrow = new Date(now)

  // 设置日期为明天
  tomorrow.setDate(now.getDate() + 1)
  // 重置时间为凌晨 0 点 0 分 0 秒
  tomorrow.setHours(0, 0, 0, 0)

  return tomorrow.getTime()
}
// function getNextMonth () {
//   const now = new Date()
//   const currentYear = now.getFullYear()
//   const currentMonth = now.getMonth()
//
//   // 如果当前月份是12月，年份增加1，并且月份设为0（1月）
//   const nextMonth = (currentMonth + 1) % 12
//   const nextYear = nextMonth === 0 ? currentYear + 1 : currentYear
//
//   return new Date(nextYear, nextMonth, 1, 0, 0, 0, 0).getTime()
// }

const AipOcrClient = require('baidu-aip-sdk').ocr

const AipOcrClientMap = {}
const apis = [
  'accurateBasic', // 调用通用文字识别（高精度版）
  'accurate', // 调用通用文字识别（含位置高精度版）
  'handwriting', // 手写文字识别
]
const limitMap = {}

function createBaiduOcrClient (config) {
  const key = config.id
  if (AipOcrClientMap[key]) {
    return AipOcrClientMap[key]
  }
  const client = new AipOcrClient(config.id, config.ak, config.sk)
  AipOcrClientMap[key] = client
  return client
}

let count = 0

function getConfig (interceptOpt, tryCount, log) {
  tryCount = tryCount || 1

  let config
  if (typeof (interceptOpt.baiduOcr) && interceptOpt.baiduOcr.length > 0) {
    config = interceptOpt.baiduOcr[count++ % interceptOpt.baiduOcr.length]

    if (tryCount < interceptOpt.baiduOcr.length) {
      if (!config || !config.id || !config.ak || !config.sk) {
        return getConfig(interceptOpt, tryCount + 1, log) // 递归找到有效的配置
      }
    }

    // 避免count值过大，造成问题
    if (count >= 100000) {
      count = 0
    }
  } else {
    config = interceptOpt.baiduOcr
    tryCount = null // 将tryCount设置为null代表只有一个配置
  }

  if (!config || !config.id || !config.ak || !config.sk) {
    return null // 没有配置或配置错误，直接返回null
  }

  // 获取当前配置可用的API
  for (let i = 0; i < apis.length; i++) {
    const api = apis[i]
    if (!checkIsLimitConfig(config.id, api)) {
      config.api = api
      break
    }
    log.warn(`百度云账号 ${config.id} 的接口 ${api} 已超出限额`)
  }

  // 如果当前配置的所有API均不可用，则返回null
  if (config.api == null) {
    if (tryCount == null) {
      return null // 只配置了一个账号，没有更多账号可以选择了，直接返回null
    } else {
      if (tryCount < interceptOpt.baiduOcr.length) {
        // 递归找到有效的配置
        return getConfig(interceptOpt, tryCount + 1, log)
      } else {
        return null
      }
    }
  }

  return config
}

function limitConfig (id, api) {
  const key = `${id}_${api}`
  limitMap[key] = getTomorrow()
  // limitMap[key] = Date.now() + 5000 // 测试用，5秒后解禁
}

function checkIsLimitConfig (id, api) {
  const key = `${id}_${api}`
  const limitTime = limitMap[key]
  return limitTime && limitTime > Date.now()
}

module.exports = {
  name: 'baiduOcr',
  priority: 131,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    }

    // 获取配置
    const config = getConfig(interceptOpt, null, log)
    if (!config) {
      res.writeHead(200, headers)
      res.write('{"error_code": 99917, "error_msg": "dev-sidecar中，未配置百度云账号，或所有百度云账号的免费额度都已用完！！！"}')
      res.end()
      return true
    }
    if (!config.id || !config.ak || !config.sk) {
      res.writeHead(200, headers)
      res.write('{"error_code": 999500, "error_msg": "dev-sidecar中，baiduOcr的 id 或 ak 或 sk 配置为空"}')
      res.end()
      return true
    }

    headers['DS-Interceptor'] = `baiduOcr: id=${config.id}, api=${config.api || apis[0]}, account=${config.account}`

    // 获取图片的base64编码
    let imageBase64 = rOptions.path.substring(rOptions.path.indexOf('?') + 1)
    if (!imageBase64) {
      res.writeHead(200, headers)
      res.write('{"error_code": 999400, "error_msg": "图片Base64参数为空"}')
      res.end()
      return true
    }
    imageBase64 = decodeURIComponent(imageBase64)

    // 调用百度云 “文字识别” 相关接口，根据 `config.api` 调用不同的接口
    const client = createBaiduOcrClient(config)
    const options = {
      recognize_granularity: 'big',
      detect_direction: 'false',
      paragraph: 'false',
      probability: 'false',
      ...(config.options || {}),
    }
    log.info('发起百度ocr请求', req.hostname)
    client[config.api || apis[0]](imageBase64, options).then((result) => {
      if (result.error_code != null) {
        log.error('baiduOcr error:', result)
        if (result.error_code === 17) {
          // 当前百度云账号，达到当日调用次数上限
          limitConfig(config.id, config.api)
          log.error(`当前百度云账号的接口 ${config.api}，已达到当日调用次数上限，暂时禁用它，明天会自动放开:`, config)
        }
      } else {
        log.info('baiduOcr success:', result)
      }

      res.writeHead(200, headers)
      res.write(JSON.stringify(result)) // 格式如：{"words_result":[{"words":"6525"}],"words_result_num":1,"log_id":1818877093747960000}
      res.end()
      if (next) {
        next() // 异步执行完继续next
      }
    }).catch((err) => {
      log.error('baiduOcr error:', err)
      res.writeHead(200, headers)
      res.write(`{"error_code": 999500, "error_msg": "${err}"}`) // 格式如：{"words_result":[{"words":"6525"}],"words_result_num":1,"log_id":1818877093747960000}
      res.end()
      if (next) {
        next() // 异步执行完继续next
      }
    })

    log.info('proxy baiduOcr: hostname:', req.hostname)

    return 'no-next'
  },
  is (interceptOpt) {
    return !!interceptOpt.baiduOcr
  },
}
