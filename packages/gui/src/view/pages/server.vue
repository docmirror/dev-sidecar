<script>
import { defineComponent } from 'vue';

import _ from 'lodash'
import JsonEditor from '@/view/components/JsonEditor.vue'
import { CheckOutlined, CloudOutlined, InfoCircleOutlined, PlusOutlined, MinusOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import Plugin from '../mixins/plugin'

export default defineComponent({
  name: 'Server',

  components: {
    JsonEditor,
    CheckOutlined,
    CloudOutlined,
    InfoCircleOutlined,
    PlusOutlined,
    MinusOutlined,
    SyncOutlined,
    ReloadOutlined,
  },

  mixins: [Plugin],

  data () {
    return {
      key: 'server',
      activeTabKey: '1',
      dnsMappings: [],
      speedTestList: [],
      whiteList: [],
      echDomains: [],
      echPreSetIpDomains: [],
      nat64Domains: [],
      tlsMappings: [],
      speedRefreshInterval: null,
      tlsVersionOptions: [
        {
          label: 'TLS 1.2',
          value: 'TLSv1.2',
        },
        {
          label: 'TLS 1.3',
          value: 'TLSv1.3',
        },
      ],
      cfRouteDomains: [],
      cfRouteModeOptions: [
        {
          label: '黑名单模式（名单内不重定向）',
          value: 'blacklist',
        },
        {
          label: '白名单模式（仅名单内重定向）',
          value: 'whitelist',
        },
      ],
      whiteListOptions: [
        {
          label: '不代理',
          value: 'true',
        },
        {
          label: '代理',
          value: 'false',
        },
      ],
      familyOptions: [
        {
          label: 'IPv4',
          value: '4',
        },
        {
          label: 'IPv6',
          value: '6',
        },
      ],
    }
  },

  computed: {
    speedDnsOptions () {
      const options = []
      if (!this.config || !this.config.server || !this.config.server.dns || !this.config.server.dns.providers) {
        return options
      }
      _.forEach(this.config.server.dns.providers, (dnsConfig, key) => {
        options.push({
          value: key,
          label: key,
        })
      })
      return options
    },
  },

  created () {
  },

  mounted () {
    this.registerSpeedTestEvent()
  },

  beforeUnmount () {
    // 清理事件监听器
    this.$api.ipc.removeAllListeners('speed')
    if (this.speedRefreshInterval) {
      clearInterval(this.speedRefreshInterval)
    }
  },

  methods: {
    async onCrtSelect () {
      const value = await this.$api.fileSelector.open(this.config.server.setting.rootCaFile.certPath, 'file')
      if (value != null && value.length > 0) {
        this.config.server.setting.rootCaFile.certPath = value[0]
      }
    },
    async onKeySelect () {
      const value = await this.$api.fileSelector.open(this.config.server.setting.rootCaFile.keyPath, 'file')
      if (value != null && value.length > 0) {
        this.config.server.setting.rootCaFile.keyPath = value[0]
      }
    },
    ready () {
      this.initDnsMapping()
      this.initWhiteList()
      this.initEchDomains()
      this.initEchPreSetIpDomains()
      this.initNat64Domains()
      this.initTlsMappings()
      this.initCfRouteDomains()
      if (this.config.server.dns.speedTest.dnsProviders) {
        this.speedDns = this.config.server.dns.speedTest.dnsProviders
      }
    },
    async applyBefore () {
      this.submitDnsMappings()
      this.submitWhiteList()
      this.submitEchDomains()
      this.submitEchPreSetIpDomains()
      this.submitNat64Domains()
      this.submitTlsMappings()
      this.submitCfRouteDomains()
      this.delEmptySpeedHostname()
    },
    async applyAfter () {
      if (this.status.server.enabled) {
        return this.$api.server.restart()
      }
    },
    // dnsMapping
    initDnsMapping () {
      this.dnsMappings = []
      const familyMapping = this.config.server.dns.familyMapping || {}
      for (const key in this.config.server.dns.mapping) {
        const value = this.config.server.dns.mapping[key]
        this.dnsMappings.push({
          key,
          value,
          family: `${familyMapping[key] || '4'}`, // 转成字符串
        })
      }
    },
    submitDnsMappings () {
      const dnsMapping = {}
      const familyMapping = {}
      for (const item of this.dnsMappings) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            dnsMapping[hostname] = item.value
            if (item.family === '6' || (this.config.server.dns.familyMapping != null && this.config.server.dns.familyMapping[hostname] != null)) {
              familyMapping[hostname] = item.family
            }
          }
        }
      }
      this.config.server.dns.mapping = dnsMapping
      this.config.server.dns.familyMapping = familyMapping
    },
    deleteDnsMapping (item, index) {
      this.dnsMappings.splice(index, 1)
    },
    addDnsMapping () {
      let defaultDns
      const dnsArr = ['quad9', 'safe360', 'aliyun']
      for (const dnsName of dnsArr) {
        if (this.config.server.dns.providers[dnsName]) {
          defaultDns = dnsName
          break
        }
      }

      this.dnsMappings.unshift({ key: '', value: defaultDns, family: '4' })
      this.focusFirst(this.$refs.dnsMappings)
    },

    // whiteList
    initWhiteList () {
      this.whiteList = []
      for (const key in this.config.server.whiteList) {
        const value = this.config.server.whiteList[key]
        this.whiteList.push({
          key: key || '',
          value: value === true ? 'true' : 'false',
        })
      }
    },
    addWhiteList () {
      this.whiteList.unshift({ key: '', value: 'true' })
      this.focusFirst(this.$refs.whiteList)
    },
    deleteWhiteList (item, index) {
      this.whiteList.splice(index, 1)
    },
    submitWhiteList () {
      const whiteList = {}
      for (const item of this.whiteList) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            whiteList[hostname] = (item.value === 'true')
          }
        }
      }
      this.config.server.whiteList = whiteList
    },

    // ECH（Encrypted Client Hello）
    getEchConfig () {
      const dns = this.config.server.dns || (this.config.server.dns = {})
      return dns.ech || (dns.ech = {})
    },
    // 把配置里的域名列表转成表格行（兼容数组与对象两种写法）
    toDomainRows (domains) {
      const rows = []
      if (Array.isArray(domains)) {
        for (const domain of domains) {
          if (typeof domain === 'string' && domain) {
            rows.push({ key: domain })
          }
        }
      } else if (domains != null && typeof domains === 'object') {
        // 兼容对象写法： { 'example.com': true }
        for (const key in domains) {
          if (domains[key] !== false && domains[key] != null) {
            rows.push({ key })
          }
        }
      }
      return rows
    },
    toDomains (rows) {
      const domains = []
      for (const item of rows) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname && !domains.includes(hostname)) {
            domains.push(hostname)
          }
        }
      }
      return domains
    },
    initEchDomains () {
      this.echDomains = this.toDomainRows(this.getEchConfig().domains)
    },
    addEchDomain () {
      this.echDomains.unshift({ key: '' })
      this.focusFirst(this.$refs.echDomains)
    },
    deleteEchDomain (item, index) {
      this.echDomains.splice(index, 1)
    },
    initEchPreSetIpDomains () {
      this.echPreSetIpDomains = this.toDomainRows(this.getEchConfig().preSetIpDomains)
    },
    addEchPreSetIpDomain () {
      this.echPreSetIpDomains.unshift({ key: '' })
      this.focusFirst(this.$refs.echPreSetIpDomains)
    },
    deleteEchPreSetIpDomain (item, index) {
      this.echPreSetIpDomains.splice(index, 1)
    },
    submitEchDomains () {
      const echConfig = this.getEchConfig()
      echConfig.domains = this.toDomains(this.echDomains)
      // 未选择ECH专用DNS时，归一化为空字符串（与默认配置保持一致，便于差分保存）
      echConfig.dns = echConfig.dns || ''
      // 共享ECH配置的来源域名：去掉空格与协议前缀
      echConfig.publicName = (echConfig.publicName || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    },
    submitEchPreSetIpDomains () {
      this.getEchConfig().preSetIpDomains = this.toDomains(this.echPreSetIpDomains)
    },

    // NAT64（把真实IPv4嵌入NAT64前缀，走IPv6直连）
    getNat64Config () {
      const dns = this.config.server.dns || (this.config.server.dns = {})
      return dns.nat64 || (dns.nat64 = {})
    },
    initNat64Domains () {
      const nat64Config = this.getNat64Config()
      if (nat64Config.dns == null) {
        // 「解析用DNS」与「ECH专用DNS」一致：空表示不指定
        nat64Config.dns = ''
      }
      this.nat64Domains = this.toDomainRows(nat64Config.domains)
    },
    addNat64Domain () {
      this.nat64Domains.unshift({ key: '' })
      this.focusFirst(this.$refs.nat64Domains)
    },
    deleteNat64Domain (item, index) {
      this.nat64Domains.splice(index, 1)
    },
    submitNat64Domains () {
      const nat64Config = this.getNat64Config()
      nat64Config.domains = this.toDomains(this.nat64Domains)
      nat64Config.prefix = (nat64Config.prefix || '').trim()
    },

    // TLS版本设置
    initTlsMappings () {
      this.tlsMappings = []
      const tlsVersionMapping = this.config.server.setting.tlsVersionMapping || {}
      for (const key in tlsVersionMapping) {
        const conf = tlsVersionMapping[key]
        if (typeof conf === 'string') {
          this.tlsMappings.push({
            key: key || '',
            value: conf === 'TLSv1.3' ? 'TLSv1.3' : 'TLSv1.2',
            enabled: true,
          })
        } else if (conf && typeof conf === 'object') {
          this.tlsMappings.push({
            key: key || '',
            value: conf.version === 'TLSv1.3' ? 'TLSv1.3' : 'TLSv1.2',
            enabled: conf.enabled !== false,
          })
        }
      }
    },
    addTlsMapping () {
      this.tlsMappings.unshift({ key: '', value: 'TLSv1.2', enabled: true })
      this.focusFirst(this.$refs.tlsMappings)
    },
    deleteTlsMapping (item, index) {
      this.tlsMappings.splice(index, 1)
    },
    submitTlsMappings () {
      const tlsVersionMapping = {}
      for (const item of this.tlsMappings) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            tlsVersionMapping[hostname] = {
              enabled: item.enabled !== false,
              version: item.value === 'TLSv1.3' ? 'TLSv1.3' : 'TLSv1.2',
            }
          }
        }
      }
      this.config.server.setting.tlsVersionMapping = tlsVersionMapping
    },

    // Cloudflare 路由重定向
    initCfRouteDomains () {
      this.cfRouteDomains = []
      const cfRoute = this.config.server.cloudflareRoute || (this.config.server.cloudflareRoute = {})
      if (!cfRoute.mode) {
        cfRoute.mode = 'blacklist'
      }
      if (!cfRoute.domains) {
        cfRoute.domains = {}
      }
      for (const key in cfRoute.domains) {
        if (cfRoute.domains[key]) {
          this.cfRouteDomains.push({ key: key || '' })
        }
      }
    },
    addCfRouteDomain () {
      this.cfRouteDomains.unshift({ key: '' })
      this.focusFirst(this.$refs.cfRouteDomains)
    },
    deleteCfRouteDomain (item, index) {
      this.cfRouteDomains.splice(index, 1)
    },
    submitCfRouteDomains () {
      const cfRoute = this.config.server.cloudflareRoute || (this.config.server.cloudflareRoute = {})
      const domains = {}
      for (const item of this.cfRouteDomains) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            domains[hostname] = true
          }
        }
      }
      cfRoute.domains = domains
      if (!cfRoute.mode || (cfRoute.mode !== 'whitelist' && cfRoute.mode !== 'blacklist')) {
        cfRoute.mode = 'blacklist'
      }
    },
    getSpeedTestConfig () {
      return this.config.server.dns.speedTest
    },
    addSpeedHostname () {
      this.getSpeedTestConfig().hostnameList.unshift('')
      this.focusFirst(this.$refs.hostnameList)
    },
    delSpeedHostname (item, index) {
      this.getSpeedTestConfig().hostnameList.splice(index, 1)
    },
    delEmptySpeedHostname () {
      for (let i = this.getSpeedTestConfig().hostnameList.length - 1; i >= 0; i--) {
        const hostname = this.handleHostname(this.getSpeedTestConfig().hostnameList[i])
        if (!hostname) {
          this.getSpeedTestConfig().hostnameList.splice(i, 1)
        }
      }
    },
    reSpeedTest () {
      this.$api.server.reSpeedTest()
    },
    hasCf (item) {
      if (!item) {
        return false
      }
      const list = (item.alive || []).concat(item.backupList || [])
      return list.some((element) => element.cf === true)
    },
    registerSpeedTestEvent () {
      const listener = async (event, message) => {
        if (message.key === 'getList') {
          // 数据验证和标准化
          const validatedData = {}
          for (const hostname in message.value) {
            const item = message.value[hostname]
            if (!item.backupList) {
              console.warn(`Missing backupList for ${hostname}`)
              continue
            }

            validatedData[hostname] = {
              alive: item.alive || [],
              backupList: item.backupList.map(ipObj => {
                // 标准化IP地址格式；保留 Cloudflare 元数据，供 hasCf / 模板展示
                const standardized = {
                  host: ipObj.host,
                  port: ipObj.port || 443,
                  dns: ipObj.dns || 'unknown',
                  time: ipObj.time || null,
                  cf: ipObj.cf === true,
                  cfOriginalHost: ipObj.cfOriginalHost
                }
                return standardized
              })
            }
          }

          this.speedTestList = validatedData
        }
      }
      this.$api.ipc.on('speed', listener)
      this.speedRefreshInterval = this.startSpeedRefreshInterval()
      this.reloadAllSpeedTester()
    },
    async reloadAllSpeedTester () {
      this.$api.server.getSpeedTestList()
    },
    startSpeedRefreshInterval () {
      return setInterval(() => {
        this.reloadAllSpeedTester()
      }, 5000)
    },
    async handleTabChange (key) {
      this.activeTabKey = key
      if (key !== '2' && key !== '3' && key !== '5' && key !== '6' && key !== '7') {
        // 没有 JsonEditor，启用SearchBar
        window.config.disableSearchBar = false
      } else {
        // 有 JsonEditor，禁用SearchBar
        window.config.disableSearchBar = true
      }
    },
  },
});
</script>

<template>
  <ds-container>
    <template #header>
      加速服务设置
    </template>

    <div style="height: 100%" class="json-wrapper">
      <a-tabs
        v-if="config"
        :default-active-key="activeTabKey"
        tab-position="left"
        :style="{ height: '100%' }"
        @change="handleTabChange"
      >
        <a-tab-pane key="1" tab="基本设置">
          <div v-if="activeTabKey === '1'" style="padding-right:10px">
            <a-form-item label="代理服务:" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="config.server.enabled">
                随应用启动
              </a-checkbox>
              <a-tag v-if="status.server.enabled" color="green">
                当前已启动
              </a-tag>
              <a-tag v-else color="red">
                当前未启动
              </a-tag>
            </a-form-item>
            <a-form-item label="绑定IP" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input v-model:value="config.server.host" spellcheck="false" />
              <div class="form-help">
                你可以设置为<code>0.0.0.0</code>，让其他电脑可以使用此代理服务。<br>
                这里控制的是<b>代理端口</b>的监听地址（谁能连你的代理）；MITM 证书相关的本地内部服务始终只在 <code>127.0.0.1</code>，不受此项影响。
              </div>
            </a-form-item>
            <a-form-item label="代理端口" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="config.server.port" :min="0" :max="65535" :precision="0" spellcheck="false" />
              <div class="form-help">
                修改后需要重启应用
              </div>
            </a-form-item>
            <hr>
            <a-form-item label="全局校验SSL" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="config.server.setting.NODE_TLS_REJECT_UNAUTHORIZED">
                NODE_TLS_REJECT_UNAUTHORIZED
              </a-checkbox>
              <div class="form-help">
                高风险操作，没有特殊情况请勿关闭
              </div>
            </a-form-item>
            <a-form-item label="代理校验SSL" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="config.server.setting.verifySsl">
                校验加速目标网站的ssl证书
              </a-checkbox>
              <div class="form-help">
                如果目标网站证书有问题，但你想强行访问，可以临时关闭此项
              </div>
            </a-form-item>
            <a-form-item label="允许TLS1.2" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="config.server.setting.allowTls12">
                允许使用TLS1.2访问目标网站
              </a-checkbox>
              <div class="form-help">
                ⚠️ 警告：启用后会允许降级到TLS1.2，TLS1.2会泄露目标网站证书，从而暴露访问网站足迹；在网络受到严重监控的环境下有高度隐私风险，除非必须兼容旧站点请勿开启。
              </div>
            </a-form-item>
            <a-form-item label="根证书" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-search
                v-model:value="config.server.setting.rootCaFile.certPath" addon-before="Cert" enter-button="选择"
                :title="config.server.setting.rootCaFile.certPath" spellcheck="false"
                @search="onCrtSelect"
              />
              <a-input-search
                v-model:value="config.server.setting.rootCaFile.keyPath" addon-before="Key" enter-button="选择"
                :title="config.server.setting.rootCaFile.keyPath" spellcheck="false"
                @search="onKeySelect"
              />
            </a-form-item>
            <hr>
            <a-form-item label="启用拦截" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="config.server.intercept.enabled">
                启用拦截
              </a-checkbox>
              <div class="form-help">
                关闭拦截，且关闭增强功能时，就不需要安装根证书，退化为安全模式
              </div>
            </a-form-item>
            <a-form-item label="启用脚本" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="config.server.setting.script.enabled">
                允许插入并运行脚本
              </a-checkbox>
              <div class="form-help">
                关闭后，<code>Github油猴脚本</code>也将关闭
              </div>
            </a-form-item>
          </div>
        </a-tab-pane>
        <a-tab-pane key="2" tab="拦截设置">
          <div v-if="activeTabKey === '2'" style="height:100%">
            <JsonEditor
              v-model="config.server.intercepts" style="height:100%" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="3" tab="超时时间设置">
          <div v-if="activeTabKey === '3'" style="height:100%;display:flex;flex-direction:column">
            <a-form-item label="默认超时时间" :label-col="labelCol" :wrapper-col="wrapperCol">
              请求：<a-input-number v-model:value="config.server.setting.defaultTimeout" :step="1000" :min="1000" :precision="0" spellcheck="false" /> ms，对应<code>timeout</code>配置<br>
              连接：<a-input-number v-model:value="config.server.setting.defaultKeepAliveTimeout" :step="1000" :min="1000" :precision="0" spellcheck="false" /> ms，对应<code>keepAliveTimeout</code>配置
            </a-form-item>
            <hr style="margin-bottom:15px">
            <div>这里指定域名的超时时间：<span class="form-help">（域名配置可使用通配符或正则）</span></div>
            <JsonEditor
              v-model="config.server.setting.timeoutMapping" style="flex-grow:1;min-height:300px;margin-top:10px" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="tls" tab="TLS版本设置">
          <div v-if="activeTabKey === 'tls'">
            <a-row style="margin-top:10px">
              <a-col span="21">
                <div>指定域名使用的 TLS 版本：<span class="form-help">（域名配置可使用通配符或正则）</span></div>
                <div class="form-help">
                  例如 <code>production.cloudflare.docker.com</code> 选择 <code>TLS 1.2</code>。每行右侧开关可单独启用/停用；远程下发的规则会显示为停用状态，由你自行启用。未匹配到或停用的域名遵循“允许TLS1.2”开关。
                </div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" @click="addTlsMapping()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of tlsMappings" ref="tlsMappings" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="13">
                <a-input v-model:value="item.key" spellcheck="false" placeholder="例如 production.cloudflare.docker.com" />
              </a-col>
              <a-col :span="5">
                <a-select v-model:value="item.value" class="w100">
                  <a-select-option v-for="(item2) of tlsVersionOptions" :key="item2.value" :value="item2.value">
                    {{ item2.label }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="3">
                <a-switch v-model:checked="item.enabled" />
              </a-col>
              <a-col :span="3">
                <a-button type="danger" @click="deleteTlsMapping(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
        <a-tab-pane key="4" tab="域名白名单">
          <div v-if="activeTabKey === '4'">
            <a-row style="margin-top:10px">
              <a-col span="21">
                <div>配置为<code>不代理</code>的域名不会通过代理</div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" @click="addWhiteList()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of whiteList" ref="whiteList" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="16">
                <a-input v-model:value="item.key" spellcheck="false" />
              </a-col>
              <a-col :span="5">
                <a-select v-model:value="item.value" class="w100">
                  <a-select-option v-for="(item2) of whiteListOptions" :key="item2.value" :value="item2.value">
                    {{ item2.label }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="3">
                <a-button type="danger" @click="deleteWhiteList(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
        <a-tab-pane key="5" tab="自动兼容程序">
          <div v-if="activeTabKey === '5'" style="height:100%;display:flex;flex-direction:column">
            <div>
              说明：<code>自动兼容程序</code>会自动根据错误信息进行兼容性调整，并将兼容设置保存在 <code>~/.dev-sidecar/automaticCompatibleConfig.json</code> 文件中。但并不是所有的兼容设置都是正确的，所以需要通过以下配置来覆盖错误的兼容设置。
            </div>
            <JsonEditor
              v-model="config.server.compatible" style="flex-grow:1;min-height:300px;margin-top:10px;" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="6" tab="IP预设置">
          <div v-if="activeTabKey === '6'" style="height:100%;display:flex;flex-direction:column">
            <div>
              提示：<code>IP预设置</code>功能，优先级高于 <code>DNS设置</code>
              <span class="form-help">（域名配置可使用通配符或正则）</span>
            </div>
            <JsonEditor
              v-model="config.server.preSetIpList" style="flex-grow:1;min-height:300px;margin-top:10px;" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="7" tab="DNS服务管理">
          <div v-if="activeTabKey === '7'" style="height:100%">
            <JsonEditor
              v-model="config.server.dns.providers" style="height:100%" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="8" tab="DNS设置">
          <div v-if="activeTabKey === '8'">
            <a-row style="margin-top:10px">
              <a-col span="21">
                <div>这里配置哪些域名需要通过国外DNS服务器获取IP进行访问</div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" @click="addDnsMapping()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of dnsMappings" ref="dnsMappings" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="11">
                <a-input v-model:value="item.key" spellcheck="false" />
              </a-col>
              <a-col :span="6">
                <a-select v-model:value="item.value" :disabled="item.value === false" class="w100">
                  <a-select-option v-for="(item2) of speedDnsOptions" :key="item2.value" :value="item2.value">
                    {{ item2.value }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="4">
                <a-select v-model:value="item.family" class="w100">
                  <a-select-option v-for="(item2) of familyOptions" :key="item2.value" :value="item2.value">
                    {{ item2.label }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="3">
                <a-button type="danger" @click="deleteDnsMapping(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
        <a-tab-pane key="11" tab="ECH设置">
          <div v-if="activeTabKey === '11'" style="padding-right:10px">
            <a-alert
              type="info"
              message="ECH（Encrypted Client Hello）会把TLS握手中的SNI加密，使中间网络无法看到你访问的真实域名。只有目标网站支持ECH（其DNS下发了HTTPS记录）时才会生效，任何一步失败都会自动降级为普通TLS，不影响访问。"
            />
            <a-alert
              type="warning"
              style="margin-top:5px"
              message="名单中的域名会被自动拦截（无需再配置拦截器），并强制忽略修改SNI等配置：上游TLS握手固定使用真实SNI，避免ECH因SNI被改写而失效；预设IP与IP测速结果默认也被忽略（可在下方为个别域名开例外）。"
            />
            <a-form-item label="启用ECH" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="getEchConfig().enabled">
                从DNS的HTTPS记录获取ECH参数
              </a-checkbox>
              <div class="form-help">
                关闭后不再查询ECH参数，也不使用ECH
              </div>
            </a-form-item>
            <a-form-item label="ECH专用DNS" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-select v-model:value="getEchConfig().dns" style="width: 260px" placeholder="不指定">
                <a-select-option value="">
                  不指定（由域名映射或系统DNS决定）
                </a-select-option>
                <a-select-option v-for="item of speedDnsOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
              <div class="form-help">
                从上方「DNS服务管理」中选择一个DNS，名单中的域名只从该DNS获取ECH参数与IP解析结果（不再使用其它DNS），查询更快也更准确；已在下方开例外的域名仍会使用预设IP
              </div>
            </a-form-item>
            <a-form-item label="共享ECH配置" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input v-model:value="getEchConfig().publicName" style="width: 260px" spellcheck="false" placeholder="cloudflare-ech.com" />
              <div class="form-help">
                域名自己没有下发ECH记录时，用该域名的ECH配置兜底（默认<code>cloudflare-ech.com</code>，Cloudflare 的共享配置对所有 Cloudflare 站点通用，例如 character.ai 这类站点就是靠它启用ECH）；留空表示不使用兜底
              </div>
            </a-form-item>
            <a-form-item label="上游使用ECH" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="getEchConfig().use">
                在「代理 ➜ 源站」的TLS握手中使用ECH
              </a-checkbox>
              <div class="form-help">
                关闭后只查询ECH参数，但不使用
              </div>
            </a-form-item>
            <a-form-item label="尝试其它DNS" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="getEchConfig().tryAllProviders">
                映射DNS未下发时，尝试其它DNS
              </a-checkbox>
              <div class="form-help">
                未指定「ECH专用DNS」时：域名映射到的DNS未下发ECH参数时，自动尝试其它DNS
              </div>
            </a-form-item>
            <a-form-item label="并发查询延迟" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="getEchConfig().parallelDelay" :min="0" :step="50" :precision="0" spellcheck="false" /> ms
              <div class="form-help">
                并发查询多个DNS时，除第一个DNS外的其它DNS的延迟启动时间，设为<code>0</code>表示全部同时查询；指定「ECH专用DNS」后不再并发查询
              </div>
            </a-form-item>
            <hr>
            <a-row style="margin-top:10px">
              <a-col span="21">
                <div>需要使用<code>ECH</code>的域名<span class="form-help">（域名配置可使用通配符或正则，填法与“域名白名单”一致；名单为空表示不启用，此时不会有任何额外开销）</span></div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" @click="addEchDomain()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of echDomains" ref="echDomains" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="21">
                <a-input v-model:value="item.key" spellcheck="false" placeholder="例如 crypto.cloudflare.com 或 *.cloudflare.com" />
              </a-col>
              <a-col :span="3">
                <a-button type="danger" @click="deleteEchDomain(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
            <hr>
            <a-row style="margin-top:10px">
              <a-col span="21">
                <div>其中<code>使用预设IP</code>的域名<span class="form-help">（默认忽略「IP预设置」与「IP测速」的结果，因为预设IP通常是域名自己的源站IP、可能不支持ECH；这里填写的域名例外，可用它把被阻断的域名指到一组可用的 Cloudflare IP，填法与上方一致）</span></div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" @click="addEchPreSetIpDomain()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of echPreSetIpDomains" ref="echPreSetIpDomains" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="21">
                <a-input v-model:value="item.key" spellcheck="false" placeholder="例如 character.ai" />
              </a-col>
              <a-col :span="3">
                <a-button type="danger" @click="deleteEchPreSetIpDomain(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
            <hr>
            <div>缓存设置：<span class="form-help">（从一个域名的HTTPS记录中获取到的ECH参数会被缓存，避免每次访问都查询DNS）</span></div>
            <a-form-item label="缓存条数" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="getEchConfig().cacheSize" :min="0" :precision="0" spellcheck="false" />
            </a-form-item>
            <a-form-item label="无ECH缓存" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="getEchConfig().emptyTtl" :min="0" :step="60000" :precision="0" spellcheck="false" /> ms
              <div class="form-help">
                DNS未下发ECH参数时的缓存时间
              </div>
            </a-form-item>
            <a-form-item label="最短缓存" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="getEchConfig().minTtl" :min="0" :step="60000" :precision="0" spellcheck="false" /> ms
            </a-form-item>
            <a-form-item label="最长缓存" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="getEchConfig().maxTtl" :min="0" :step="60000" :precision="0" spellcheck="false" /> ms
            </a-form-item>
          </div>
        </a-tab-pane>
        <a-tab-pane key="12" tab="NAT64直连">
          <div v-if="activeTabKey === '12'" style="padding-right:10px">
            <a-alert
              type="info"
              message="NAT64 会把域名解析出的真实IPv4地址嵌入一个IPv6前缀，通过IPv6网络访问该站点。"
            />
            <a-form-item label="启用NAT64" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="getNat64Config().enabled">
                通过NAT64直连名单中的域名
              </a-checkbox>
              <div class="form-help">
                是否可用取决于所在网络能否访问下面的NAT64前缀；不可用时会自动回退为普通解析，不影响其它域名
              </div>
            </a-form-item>
            <a-form-item label="NAT64前缀" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input v-model:value="getNat64Config().prefix" style="width: 320px" spellcheck="false" placeholder="请输入NAT64服务提供的IPv6前缀" />
              <div class="form-help">
                IPv6前缀，域名的真实IPv4会被嵌入到最末32位；请填写所使用的NAT64服务提供的前缀
              </div>
            </a-form-item>
            <a-form-item label="解析用DNS" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-select v-model:value="getNat64Config().dns" style="width: 260px" placeholder="不指定">
                <a-select-option value="">
                  不指定（自动使用内置的公共DoH）
                </a-select-option>
                <a-select-option v-for="item of speedDnsOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
              <div class="form-help">
                从上方「DNS服务管理」中选择一个DNS（<b>需为DoH类型，即地址以 <code>https://</code> 开头</b>），
                域名的真实A记录与ECH参数都<b>经NAT64通道</b>向它查询（所以即使本机DNS被投毒也能拿到真实IP）；
                该DNS不可用时会自动回退到内置的公共DoH（<code>dns.alidns.com</code>、<code>cloudflare-dns.com</code>、<code>dns.google</code>）
              </div>
            </a-form-item>
            <a-form-item label="A记录缓存" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="getNat64Config().cacheTtl" :min="0" :step="60000" :precision="0" spellcheck="false" /> ms
              <div class="form-help">
                真实A记录的缓存时间，避免每次解析都查询一次DoH
              </div>
            </a-form-item>
            <hr>
            <a-row style="margin-top:10px">
              <a-col span="21">
                <div>需要通过<code>NAT64</code>直连的域名<span class="form-help">（域名配置可使用通配符或正则，填法与“域名白名单”一致；名单为空表示不启用，此时不会有任何额外开销）</span></div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" @click="addNat64Domain()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of nat64Domains" ref="nat64Domains" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="21">
                <a-input v-model:value="item.key" spellcheck="false" placeholder="例如 chatgpt.com 或 *.openai.com" />
              </a-col>
              <a-col :span="3">
                <a-button type="danger" @click="deleteNat64Domain(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
        <a-tab-pane key="9" tab="IP测速">
          <div v-if="activeTabKey === '9'" class="ip-tester" style="padding-right: 10px">
            <a-alert type="info" message="对从DNS获取到的IP进行测速，使用速度最快的IP进行访问（注意：对使用了增强功能的域名没啥用）" />
            <a-form-item label="开启DNS测速" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="getSpeedTestConfig().enabled">
                启用
              </a-checkbox>
            </a-form-item>
            <a-form-item label="自动测试间隔" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="getSpeedTestConfig().interval" :step="1000" :min="1" :precision="0" spellcheck="false" /> ms
            </a-form-item>
            <!-- <a-form-item label="慢速IP阈值" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model:value="config.server.setting.lowSpeedDelay" :step="10" :min="100" :precision="0" spellcheck="false" /> ms
            </a-form-item> -->
            <div>使用以下DNS获取IP进行测速</div>
            <a-row style="margin-top:10px">
              <a-col span="24">
                <a-checkbox-group
                  v-model:value="getSpeedTestConfig().dnsProviders"
                  :options="speedDnsOptions"
                />
              </a-col>
            </a-row>
            <a-row :gutter="10" class="mt20">
              <a-col :span="21">
                以下域名在启动后立即进行测速，其他域名在第一次访问时才测速
              </a-col>
              <a-col :span="2">
                <a-button style="margin-left:10px" type="primary" @click="addSpeedHostname()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of getSpeedTestConfig().hostnameList" ref="hostnameList" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="21">
                <a-input v-model:value="getSpeedTestConfig().hostnameList[index]" spellcheck="false" />
              </a-col>
              <a-col :span="2">
                <a-button style="margin-left:10px" type="danger" @click="delSpeedHostname(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>

            <a-divider />
            <a-row :gutter="10" class="mt10">
              <a-col span="24">
                <a-button type="primary" @click="reSpeedTest()">
                  <PlusOutlined />立即重新测速
                </a-button>
                <a-button class="ml10" type="primary" @click="reloadAllSpeedTester()">
                  <ReloadOutlined />刷新
                </a-button>
              </a-col>
            </a-row>

            <a-row :gutter="20">
              <a-col v-for="(item, key) of speedTestList" :key="key" span="12">
                <a-card size="small" class="mt10" :title="key">
                  <template #extra>
                    <a href="javascript:void(0)" :title="key" style="cursor:default">
                      <CloudOutlined v-if="hasCf(item)" style="color:#faad14;margin-right:4px" />
                      <CheckOutlined v-if="item.alive.length > 0" />
                      <InfoCircleOutlined v-else />
                    </a>
                  </template>
                  <a-tag
                    v-for="(element, index) of item.backupList" :key="index" style="margin:2px;"
                    :title="element.title || `测速中：${element.host}`" :color="element.time ? (element.time > config.server.setting.lowSpeedDelay ? 'orange' : 'green') : (element.title ? 'red' : '')"
                  >
                    <CloudOutlined v-if="element.cf" style="margin-right:2px" />
                    {{ element.host }} {{ element.time ? `${element.time}ms` : (element.title ? '' : '测速中') }} {{ element.dns }}
                  </a-tag>
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
        <a-tab-pane key="10" tab="Cloudflare路由重定向">
          <div v-if="activeTabKey === '10'" style="padding-right:10px">
            <a-alert type="info" message="根据 Cloudflare 官方 IP 段（运行时动态获取），若访问域名解析到 Cloudflare IP，则自动改写为你指定的优选地址。预设 IP 优先级最高，不会被重定向。" />
            <a-form-item label="启用功能" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model:checked="config.server.cloudflareRoute.enabled">
                启用
              </a-checkbox>
            </a-form-item>
            <a-form-item label="优选地址" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input
                v-model:value="config.server.cloudflareRoute.preferredEndpoint"
                placeholder="可填写 IP 地址或 CNAME 域名，例如 1.2.3.4 或 example.com"
                spellcheck="false"
              />
              <div class="form-help">
                可填写 IP 地址或 CNAME 域名；留空则不进行重写。
              </div>
            </a-form-item>
            <a-form-item label="模式" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-select v-model:value="config.server.cloudflareRoute.mode" class="w100">
                <a-select-option v-for="(item2) of cfRouteModeOptions" :key="item2.value" :value="item2.value">
                  {{ item2.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <hr>
            <a-row style="margin-top:10px">
              <a-col span="21">
                <div>域名名单：<span class="form-help">（域名配置可使用通配符或正则，填法与“域名白名单”一致）</span></div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" @click="addCfRouteDomain()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of cfRouteDomains" ref="cfRouteDomains" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="21">
                <a-input v-model:value="item.key" spellcheck="false" placeholder="例如 production.cloudflare.docker.com" />
              </a-col>
              <a-col :span="3">
                <a-button type="danger" @click="deleteCfRouteDomain(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
    <template #footer>
      <div class="footer-bar">
        <a-button :loading="resetDefaultLoading" class="mr10" @click="resetDefault()">
          <SyncOutlined />恢复默认
        </a-button>
        <a-button :loading="applyLoading" type="primary" @click="apply()">
          <CheckOutlined />应用
        </a-button>
      </div>
    </template>
  </ds-container>
</template>

<style lang="scss">
.json-wrapper {
  .ant-drawer-wrapper-body {
    display: flex;
    flex-direction: column;

    .ant-drawer-body {
      flex: 1;
      height: 0;
    }
  }

  .json-editor-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
  }

  .ant-tabs {
    height: 100%;
  }

  .ant-tabs-content-holder {
    height: 100%;
  }

  .ant-tabs-content {
    height: 100%;
  }

  .ant-tabs-tabpane-active {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .ant-input-group-addon:first-child {
    width: 45px;
  }
}
.ipv6-tag {
  position: relative;
  padding-right: 45px !important;
  margin-right: 5px !important;
  display: inline-flex !important;
  align-items: center !important;
  min-width: 200px !important;
}
.ipv6-badge {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  background: #1890ff;
  color: white;
  padding: 0 4px;
  border-radius: 3px;
  line-height: 16px;
  height: 16px;
}
.ip-box {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  margin-top: 8px;
  max-width: 100%;
  overflow: hidden;
}
.ip-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
  max-width: calc(100% - 16px);
  flex: 1 1 auto;
  min-width: 0;
}
.ip-item .ip-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ip-item .ip-speed {
  margin-left: 8px;
  white-space: nowrap;
}
.ip-item .ip-speed.success {
  color: #52c41a;
}
.ip-item .ip-speed.warning {
  color: #faad14;
}
.ip-item .ip-speed.error {
  color: #ff4d4f;
}
.domain-box {
  margin-bottom: 16px;
  padding: 12px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 2px 8px var(--shadow-color);
  overflow: hidden;
}
.domain-box .domain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.domain-box .domain-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.domain-box .domain-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
  flex-shrink: 0;
}
</style>
