const fs = require('fs')
const path = require('path')
const log = require('../../utils/util.log')
let scripts

function buildScript (sc, content, scriptName) {
  let grantStr = ''
  for (const item of sc.grant) {
    if (grantStr.length > 0) {
      grantStr += '\r\n'
    }
    grantStr += (item.indexOf('.') > 0 ? '' : 'const ') + item + ' = window.__ds_global__[\'' + item + '\']'
  }

  return 'window.addEventListener("load", ()=> {\r\n' +
    grantStr + ';\r\n' +
    content +
    (scriptName ? `\r\nconsole.log("ds_${scriptName} completed")` : '') +
    '\r\n})' +
    (scriptName ? `\r\nconsole.log("ds_${scriptName} loaded")` : '')
}

function loadScript (content, scriptName) {
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
    script: ''
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

  sc.script = buildScript(sc, script, scriptName)
  return sc
}

function readFile (rootDir, script) {
  log.info('read script, script root location:', path.resolve('./'))
  const location = path.join(rootDir, './' + script)
  log.info('read script, the script location:', location)
  return fs.readFileSync(location).toString()
}

const api = {
  get (rootDir) {
    if (scripts == null) {
      return api.load(rootDir)
    }
    return scripts
  },
  load (rootDir) {
    scripts = {}
    scripts.github = loadScript(readFile(rootDir, 'github.script'), 'github')
    scripts.google = loadScript(readFile(rootDir, 'google.js'), 'google')
    // scripts.jquery = { script: readFile(rootDir, 'jquery.min.js') }
    scripts.global = { script: readFile(rootDir, 'global.script') }
    return scripts
  },
  loadScript
}

module.exports = api
