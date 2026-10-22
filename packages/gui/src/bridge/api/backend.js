import fs from 'node:fs'
// 内核身份（构建期烘焙的提交 SHA），供底栏展示；内核 version 已废弃，不展示
import { KERNEL_SHA_FULL, KERNEL_SHA_SHORT } from '../../generated/kernel-info.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import DevSidecar from '@blue-frontier/dev-sidecar'
import electron from '../../electron.js'
const { app, ipcMain, shell } = electron
import lodash from 'lodash'
import jsonApi from '@blue-frontier/mitmproxy/src/json.js'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const pk = require('../../../package.json')
import configLoader from '@blue-frontier/dev-sidecar/src/config/local-config-loader.js'
import loggerFactory from '@blue-frontier/dev-sidecar/src/utils/util.logger.js'
import log from '../../utils/util.log.gui.js'
import dateUtil from '@blue-frontier/dev-sidecar/src/utils/util.date.js'
import coreConfig from '@blue-frontier/dev-sidecar/src/config/index.js'
import serviceGroup from '@blue-frontier/dev-sidecar/src/service-group.js'

const { defaultConfig: coreDefaultConfig } = coreConfig
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mitmproxyPath = path.join(__dirname, '../mitmproxy.js')
// extra/ 在打包后位于 resources/extra（extraResources，asar 外）；开发时在项目根 extra/
// 不能用 getAppPath()：打包后它是 app.asar，exe 在 asar 内无法执行
process.env.DS_EXTRA_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'extra')
  : path.join(app.getAppPath(), 'extra')
let currentWin

const getDefaultConfigBasePath = function () {
  return DevSidecar.api.config.get().server.setting.userBasePath
}

function getMetaInfo (config, fallbackId) {
  const metaInfo = lodash.get(config, 'app.metaInfo') || lodash.get(config, 'metaInfo') || {}
  return {
    id: metaInfo.id || fallbackId,
    version: metaInfo.version || 0,
    updateLog: metaInfo.updateLog || '',
    showLabel: metaInfo.showLabel !== false && metaInfo.showLabel !== 'false', // 个人配置可以使用此配置隐藏footer中的 '当前配置：' 字样
  }
}

function emitConfigChanged () {
  if (currentWin) {
    currentWin.webContents.send('config.changed')
  }
}

const localApi = {
  /**
   * 返回所有api列表，供vue来ipc调用
   * @returns {[]} api列表
   */
  getApiList () {
    const core = lodash.cloneDeep(DevSidecar.api)
    const local = lodash.cloneDeep(localApi)
    lodash.merge(core, local)
    const list = []
    _deepFindFunction(list, core, '')
    // log.info('api list:', list)
    return list
  },
  info: {
    get () {
      const runtimeConfig = DevSidecar.api.config.get()
      const remoteConfig = lodash.get(runtimeConfig, 'app.remoteConfig') || {}

      const internal = getMetaInfo(coreDefaultConfig, '')
      const user = getMetaInfo(configLoader.getUserConfig(), '')
      const sharedRemote = getMetaInfo(configLoader.getRemoteConfig(), '')
      const personalRemote = getMetaInfo(configLoader.getRemoteConfig('_personal'), '')
      const selection = configLoader.getRemoteSelection()
      const history = configLoader.getRemoteConfigVersions('')
      const personalHistory = configLoader.getRemoteConfigVersions('_personal')
      // 选择记录可能指向已被删除的历史快照，这种情况下实际生效的是 live 文件，
      // 选择器应回落到「最新版本」，而不是显示一个列表里不存在的值。
      const normalizeSelected = (list, selected) => {
        return selected && list.some(item => item.version === selected) ? selected : ''
      }

      return {
        // 源码运行时由 electron-dev.mjs 注入 `<base>-dev.<指纹>`，仅用于展示
        version: process.env.DEV_SIDECAR_DISPLAY_VERSION || pk.version,
        // 内核身份只用提交 SHA（version 已废弃）
        kernel: { sha: KERNEL_SHA_SHORT, shaFull: KERNEL_SHA_FULL },
        configProfiles: {
          internal,
          user,
          sharedRemote: {
            ...sharedRemote,
            url: remoteConfig.url || '',
            enabled: remoteConfig.enabled === true && Boolean(remoteConfig.url),
          },
          personalRemote: {
            ...personalRemote,
            url: remoteConfig.personalUrl || '',
            enabled: remoteConfig.enabled === true && Boolean(remoteConfig.personalUrl),
          },
          selectedVersion: normalizeSelected(history, selection.shared),
          // core 的 setRemoteSelection 用 suffix 作为键：共享是 shared，个人是 _personal。
          personalSelectedVersion: normalizeSelected(personalHistory, selection._personal),
          history,
          personalHistory,
        },
      }
    },
    getConfigDir () {
      return getDefaultConfigBasePath()
    },
    getLogDir () {
      return loggerFactory.getLogDir()
    },
    /** 迁移 2.2.0 → 3.0.0（migrations/v3.0.0）：密钥入 SecretStore，删明文 */
    async securityMigrate () {
      const migrate = require('@blue-frontier/dev-sidecar/src/utils/util.security-migrate')
      return migrate.runMigration_to3_0_0()
    },
    /** 一键脱敏历史日志 */
    async redactLogs () {
      const dir = loggerFactory.getLogDir()
      const { redactLogDir } = require('@blue-frontier/dev-sidecar/src/utils/util.redact-logs')
      return redactLogDir(dir)
    },
    getSystemPlatform (throwIfUnknown = false) {
      return DevSidecar.api.shell.getSystemPlatform(throwIfUnknown)
    },
  },
  /**
   * 软件设置
   */
  setting: {
    load () {
      const settingPath = _getSettingsPath()
      let setting = {}
      if (fs.existsSync(settingPath)) {
        const file = fs.readFileSync(settingPath)
        try {
          setting = jsonApi.parse(file.toString())
          log.info('读取 setting.json 成功:', settingPath)
        } catch (e) {
          log.error('读取 setting.json 失败:', settingPath, ', error:', e)
        }
        if (setting == null) {
          setting = {}
        }
      }
      if (setting.overwall == null) {
        setting.overwall = false
      }

      if (setting.installTime == null) {
        // 设置安装时间
        setting.installTime = dateUtil.now()

        // 初始化 rootCa.setuped
        if (setting.rootCa == null) {
          setting.rootCa = {
            setuped: false,
            desc: '根证书未安装',
          }
        }

        // 保存 setting.json
        localApi.setting.save(setting)
      }
      return setting
    },
    save (setting = {}) {
      const settingPath = _getSettingsPath()
      try {
        fs.writeFileSync(settingPath, jsonApi.stringify(setting))
        log.info('保存 setting.json 配置文件成功:', settingPath)
      } catch (e) {
        log.error('保存 setting.json 配置文件失败:', settingPath, ', error:', e)
      }
    },
  },
  config: {
    get () {
      return DevSidecar.api.config.get()
    },
    save (newConfig) {
      const result = DevSidecar.api.config.save(newConfig)
      emitConfigChanged()
      return result
    },
    reload () {
      const result = DevSidecar.api.config.reload()
      emitConfigChanged()
      return result
    },
    /**
     * 下载远程配置。
     *
     * 下载失败是非致命的：本地已缓存的远程配置（或内置配置）仍然可用，代理不受影响。
     * 因此这里不向上抛异常，而是返回 `{ ok: true, updated }` 或 `{ ok: false, error }`，
     * 否则界面会弹出通用的「Api invoke error」提示——看起来像功能坏了，实际不影响使用。
     * @returns {Promise<{ok: boolean, updated?: boolean, error?: string}>}
     */
    async downloadRemoteConfig () {
      try {
        const updated = await DevSidecar.api.config.downloadRemoteConfig()
        return { ok: true, updated: updated === true }
      } catch (e) {
        log.error('下载远程配置失败（继续使用本地缓存/内置配置）:', e)
        return { ok: false, error: e && e.message ? e.message : String(e) }
      }
    },
    update (partConfig) {
      const result = DevSidecar.api.config.update(partConfig)
      emitConfigChanged()
      return result
    },
    resetDefault (key) {
      const result = DevSidecar.api.config.resetDefault(key)
      emitConfigChanged()
      return result
    },
    async removeUserConfig () {
      const result = await DevSidecar.api.config.removeUserConfig()
      emitConfigChanged()
      return result
    },
  },
  /**
   * 服务分组：按配置文件里的 `//` 注释分组，批量启停服务
   */
  serviceGroups: {
    /**
     * 列出所有服务分组
     */
    list () {
      return serviceGroup.listCatalog(DevSidecar.api.config.get(), {
        enhancedEnabled: localApi.setting.load().overwall === true,
      })
    },
    /**
     * 启用/停用服务
     * @param options 参数
     * @param options.ids 服务id列表
     * @param options.enabled 是否启用
     * @returns {object} { count, catalog }
     */
    setEnabled (options) {
      const { ids, enabled } = options
      const config = lodash.cloneDeep(DevSidecar.api.config.get())
      const count = serviceGroup.applyEnabled(config, ids, enabled, {
        enhancedEnabled: localApi.setting.load().overwall === true,
      })
      if (count > 0) {
        DevSidecar.api.config.save(config)
        emitConfigChanged()
      }
      return {
        count,
        catalog: localApi.serviceGroups.list(),
      }
    },
    /**
     * 修改用户自己添加/修改的配置项的值
     * @param options 参数
     * @param options.ids 服务id列表
     * @param options.section 分区名（如 intercepts、preSetIpList、dnsMapping 等）
     * @param options.text 配置值的JSON文本
     * @returns {object} { ok, error, catalog } 修改失败时 ok 为 false，error 为错误信息
     */
    setPartValue (options) {
      const { ids, section, text } = options
      let value
      try {
        value = jsonApi.parse(text)
      } catch (e) {
        return { ok: false, error: `配置格式错误：${e.message}` }
      }
      if (value === undefined) {
        return { ok: false, error: '配置值不能为空' }
      }
      const config = lodash.cloneDeep(DevSidecar.api.config.get())
      const count = serviceGroup.setPartValue(config, ids, section, value, {
        enhancedEnabled: localApi.setting.load().overwall === true,
      })
      if (count === 0) {
        return { ok: false, error: '没有找到可修改的配置项' }
      }
      DevSidecar.api.config.save(config)
      emitConfigChanged()
      return {
        ok: true,
        catalog: localApi.serviceGroups.list(),
      }
    },
    /**
     * 把用户自己添加/修改的配置项恢复为默认值（内置 + 远程配置），默认配置里不存在时直接删除
     * @param options 参数
     * @param options.ids 服务id列表
     * @param options.sections 需要恢复的分区名列表（不传表示该服务的全部配置项）
     * @returns {object} { count, catalog } count 为被恢复的配置项数量
     */
    resetItems (options) {
      const { ids, sections } = options
      const config = lodash.cloneDeep(DevSidecar.api.config.get())
      const count = serviceGroup.resetParts(config, ids, sections, {
        enhancedEnabled: localApi.setting.load().overwall === true,
      })
      if (count > 0) {
        DevSidecar.api.config.save(config)
        emitConfigChanged()
      }
      return {
        count,
        catalog: localApi.serviceGroups.list(),
      }
    },
    /**
     * 查找会作用于指定域名的所有服务（匹配规则与代理一致，支持通配符与正则匹配串）
     * @param {object} options { domain }
     * @param {string} options.domain 待查找的域名
     * @returns {object} { domain, ids } ids 为命中的服务 id 列表
     */
    matchHostname (options) {
      const { domain } = options
      const catalog = localApi.serviceGroups.list()
      return {
        domain,
        ids: serviceGroup.matchCatalog(catalog, domain).map(item => item.id),
      }
    },
  },
  /**
   * 启动所有
   * @returns {Promise<void>}
   */
  startup () {
    return DevSidecar.api.startup({ mitmproxyPath, setting: localApi.setting.load() })
  },
  server: {
    /**
     * 启动代理服务
     * @returns {Promise<{port: *}>}
     */
    start () {
      return DevSidecar.api.server.start({ mitmproxyPath, setting: localApi.setting.load() })
    },
    /**
     * 重启代理服务
     * @returns {Promise<void>}
     */
    restart () {
      return DevSidecar.api.server.restart({ mitmproxyPath, setting: localApi.setting.load() })
    },
  },
  shell: {
    /**
     * 使用 Electron 主进程原生 API 打开文件（避免 cmd.exe start 权限问题）
     */
    openPath (filePath) {
      return shell.openPath(path.resolve(filePath))
    },
  },
}

function _deepFindFunction (list, parent, parentKey) {
  for (const key in parent) {
    const item = parent[key]
    if (item instanceof Function) {
      list.push(parentKey + key)
    } else if (item instanceof Object) {
      _deepFindFunction(list, item, `${parentKey + key}.`)
    }
  }
}

function _getSettingsPath () {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  } else {
    // 兼容1.7.3及以下版本的配置文件处理逻辑
    const newFilePath = path.join(dir, '/setting.json')
    const oldFilePath = path.join(dir, '/setting.json5')
    if (!fs.existsSync(newFilePath) && fs.existsSync(oldFilePath)) {
      return oldFilePath // 如果新文件不存在，且旧文件存在，则返回旧文件路径
    }
    return newFilePath
  }
  return path.join(dir, '/setting.json')
}

function invoke (api, param) {
  let target = lodash.get(localApi, api)
  if (target == null) {
    target = lodash.get(DevSidecar.api, api)
  }
  if (typeof target !== 'function') {
    // 明确 reject：让调用方 await 的 IPC Promise 能拿到可定位的错误，
    // 而不是在 main 进程同步抛 TypeError（undefined(param)）
    log.error(`找不到此接口方法：${api}`)
    throw new Error(`api 接口不存在: ${api}`)
  }
  const ret = target(param)
  // log.info('api:', api, 'ret:', ret)
  return ret
}

async function doStart () {
  // 远程配置异步下载：有更新时自动 reload 并通知界面，不阻塞四个开关/代理启动
  DevSidecar.api.config.startAutoDownloadRemoteConfig({
    onUpdated: () => {
      emitConfigChanged()
    },
  })
  emitConfigChanged()
  // 启动所有（首页开关无需等待配置下载）
  localApi.startup()
}

export default {
  install ({ win }) {
    currentWin = win
    // 接收view的方法调用
    ipcMain.handle('apiInvoke', async (event, args) => {
      const api = args[0]
      let param
      if (args.length >= 2) {
        param = args[1]
      }
      return invoke(api, param)
    })
    // 注册从core里来的事件，并转发给view
    DevSidecar.api.event.register('status', (event) => {
      log.info('bridge on status, event:', event)
      if (win) {
        win.webContents.send('status', { ...event })
      }
    })
    DevSidecar.api.event.register('error', (event) => {
      log.error('bridge on error, event:', event)
      if (win) {
        win.webContents.send('error.core', event)
      }
    })
    DevSidecar.api.event.register('speed', (event) => {
      if (win) {
        win.webContents.send('speed', event)
      }
    })
    DevSidecar.api.event.register('traffic', (event) => {
      if (win) {
        win.webContents.send('traffic', event)
      }
    })

    // 合并用户配置
    DevSidecar.api.config.reload()
    doStart()
  },
  devSidecar: DevSidecar,
  invoke,
}
