const fs = require('fs')
const path = require('path')
const log = require('../../utils/util.log')
let scripts

function buildScript (sc, content) {
  const grant = sc.grant
  const pre = 'window.addEventListener("load",' +
      ' ()=> { \r\n'
  let grantSc = ''
  for (const item of grant) {
    grantSc += 'const ' + item + ' = window.__ds_global__[\'' + item + '\']\r\n'
  }
  const tail = ';' + content + '\r\n' +
      '})'
  return pre + grantSc + tail
}

function loadScript (content) {
  // @grant        GM_registerMenuCommand
  // @grant        GM_unregisterMenuCommand
  // @grant        GM_openInTab
  // @grant        GM_getValue
  // @grant        GM_setValue
  // @grant        GM_notification
  const annoFlag = '// ==/UserScript=='
  const arr = content.split(annoFlag)
  const start = 0

  const confStr = arr[start]
  const confItemArr = confStr.split('\n')
  const sc = {
    grant: [],
    match: [],
    content: ''
  }
  for (const string of confItemArr) {
    const reg = new RegExp('.*@([^\\s]+)\\s(.+)')
    const ret = string.match(reg)
    if (ret) {
      const key = ret[1].trim()
      const value = ret[2].trim()
      if (key === 'grant') {
        sc.grant.push(value)
      } else if (key === 'match') {
        sc.match.push(value)
      } else {
        sc[key] = value
      }
    }
  }
  const script = arr[start + 1].trim()

  sc.script = buildScript(sc, script)
  return sc
}

function readFile (rootDir, script) {
  const location = path.join(rootDir, './' + script)
  log.debug('script location:', location)
  return fs.readFileSync(location).toString()
}

const api = {
  get (rootDir) {
    if (scripts == null) {
      api.load(rootDir)
    }
    return scripts
  },
  load (rootDir) {
    scripts = {}
    scripts.github = loadScript(readFile(rootDir, 'github.script'))
    scripts.google = loadScript(readFile(rootDir, 'google.js'))
    scripts.jquery = { script: readFile(rootDir, 'jquery.min.js') }
    scripts.global = { script: readFile(rootDir, 'global.script') }
    return scripts
  }
}

module.exports = api
