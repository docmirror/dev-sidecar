<script>
import _ from 'lodash'
import VueJsonEditor from 'vue-json-editor-fix-cn'
import Plugin from '../mixins/plugin'

export default {
  name: 'Server',
  components: {
    VueJsonEditor,
  },
  mixins: [Plugin],
  data () {
    return {
      key: 'server',
      dnsMappings: [],
      speedTestList: [],
      whiteList: [],
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
  methods: {
    async onCrtSelect () {
      const value = await this.$api.fileSelector.open()
      if (value != null && value.length > 0) {
        this.config.server.setting.rootCaFile.certPath = value[0]
      }
    },
    async onKeySelect () {
      const value = await this.$api.fileSelector.open()
      if (value != null && value.length > 0) {
        this.config.server.setting.rootCaFile.keyPath = value[0]
      }
    },
    ready () {
      this.initDnsMapping()
      this.initWhiteList()
      if (this.config.server.dns.speedTest.dnsProviders) {
        this.speedDns = this.config.server.dns.speedTest.dnsProviders
      }
    },
    async applyBefore () {
      this.submitDnsMapping()
      this.submitWhiteList()
    },
    async applyAfter () {
      if (this.status.server.enabled) {
        return this.$api.server.restart()
      }
    },
    // dnsMapping
    initDnsMapping () {
      this.dnsMappings = []
      for (const key in this.config.server.dns.mapping) {
        const value = this.config.server.dns.mapping[key]
        this.dnsMappings.push({
          key,
          value,
        })
      }
    },
    submitDnsMapping () {
      const dnsMapping = {}
      for (const item of this.dnsMappings) {
        if (item.key) {
          dnsMapping[item.key] = item.value
        }
      }
      this.config.server.dns.mapping = dnsMapping
    },
    deleteDnsMapping (item, index) {
      this.dnsMappings.splice(index, 1)
    },
    restoreDefDnsMapping (item, index) {

    },
    addDnsMapping () {
      this.dnsMappings.unshift({ key: '', value: 'quad9' })
    },

    // whiteList
    initWhiteList () {
      this.whiteList = []
      for (const key in this.config.server.whiteList) {
        const value = this.config.server.whiteList[key]
        this.whiteList.push({
          key,
          value,
        })
      }
    },
    submitWhiteList () {
      const whiteList = {}
      for (const item of this.whiteList) {
        if (item.key) {
          whiteList[item.key] = item.value
        }
      }
      this.config.server.whiteList = whiteList
    },
    deleteWhiteList (item, index) {
      this.whiteList.splice(index, 1)
    },
    addWhiteList () {
      this.whiteList.unshift({ key: '', value: true })
    },
    async openLog () {
      const dir = await this.$api.info.getConfigDir()
      this.$api.ipc.openPath(`${dir}/logs/`)
    },
    getSpeedTestConfig () {
      return this.config.server.dns.speedTest
    },
    addSpeedHostname () {
      this.getSpeedTestConfig().hostnameList.unshift('')
    },
    delSpeedHostname (item, index) {
      this.getSpeedTestConfig().hostnameList.splice(index, 1)
    },
    reSpeedTest () {
      this.$api.server.reSpeedTest()
    },
    registerSpeedTestEvent () {
      const listener = async (event, message) => {
        console.log('get speed event', event, message)
        if (message.key === 'getList') {
          this.speedTestList = message.value
        }
      }
      this.$api.ipc.on('speed', listener)
      const interval = this.startSpeedRefreshInterval()
      this.reloadAllSpeedTester()

      this.$once('hook:beforeDestroy', () => {
        clearInterval(interval)
        this.$api.ipc.removeAllListeners('speed')
      })
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
      if (key !== '2' && key !== '3' && key !== '5' && key !== '6' && key !== '7') {
        return
      }

      // 规避 vue-json-editor 内容只填充输入框一半的问题
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 10)
    },
  },
}
</script>

<template>
  <ds-container>
    <template slot="header">
      加速服务设置
    </template>

    <div style="height: 100%" class="json-wrapper">
      <a-tabs
        v-if="config"
        default-active-key="1"
        tab-position="left"
        :style="{ height: '100%' }"
        @change="handleTabChange"
      >
        <a-tab-pane key="1" tab="基本设置">
          <div style="padding-right:10px">
            <a-form-item label="代理服务:" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model="config.server.enabled">
                随应用启动
              </a-checkbox>
              <a-tag v-if="status.proxy.enabled" color="green">
                当前已启动
              </a-tag>
              <a-tag v-else color="red">
                当前未启动
              </a-tag>
              <a-button class="md-mr-10" icon="profile" @click="openLog()">
                日志
              </a-button>
            </a-form-item>
            <a-form-item label="绑定IP" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input v-model="config.server.host" />
              <div class="form-help">
                你可以设置为<code>0.0.0.0</code>，让其他电脑可以使用此代理服务
              </div>
            </a-form-item>
            <a-form-item label="代理端口" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model="config.server.port" :min="0" :max="65535" />
              <div class="form-help">
                修改后需要重启应用
              </div>
            </a-form-item>
            <hr>
            <a-form-item label="全局校验SSL" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model="config.server.setting.NODE_TLS_REJECT_UNAUTHORIZED">
                NODE_TLS_REJECT_UNAUTHORIZED
              </a-checkbox>
              <div class="form-help">
                高风险操作，没有特殊情况请勿关闭
              </div>
            </a-form-item>
            <a-form-item label="代理校验SSL" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model="config.server.setting.verifySsl">
                校验加速目标网站的ssl证书
              </a-checkbox>
              <div class="form-help">
                如果目标网站证书有问题，但你想强行访问，可以临时关闭此项
              </div>
            </a-form-item>
            <a-form-item label="根证书" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-search
                v-model="config.server.setting.rootCaFile.certPath" addon-before="Cert" enter-button="选择"
                :title="config.server.setting.rootCaFile.certPath"
                @search="onCrtSelect"
              />
              <a-input-search
                v-model="config.server.setting.rootCaFile.keyPath" addon-before="Key" enter-button="选择"
                :title="config.server.setting.rootCaFile.keyPath"
                @search="onKeySelect"
              />
            </a-form-item>
            <hr>
            <a-form-item label="启用拦截" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model="config.server.intercept.enabled">
                启用拦截
              </a-checkbox>
              <div class="form-help">
                关闭拦截，且关闭功能增强时，就不需要安装根证书，退化为安全模式
              </div>
            </a-form-item>
            <a-form-item label="启用脚本" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model="config.server.setting.script.enabled">
                允许插入并运行脚本
              </a-checkbox>
              <div class="form-help">
                关闭后，<code>Github油猴脚本</code>也将关闭
              </div>
            </a-form-item>
          </div>
        </a-tab-pane>
        <a-tab-pane key="2" tab="拦截设置">
          <VueJsonEditor
            ref="editor" v-model="config.server.intercepts" style="height:100%" mode="code"
            :show-btns="false" :expanded-on-start="true"
          />
        </a-tab-pane>
        <a-tab-pane key="3" tab="超时时间设置">
          <div style="height:100%;display:flex;flex-direction:column;padding-right:10px">
            <a-form-item label="默认超时时间" :label-col="labelCol" :wrapper-col="wrapperCol">
              请求：<a-input-number v-model="config.server.setting.defaultTimeout" :step="1000" :min="1000" /> ms，对应<code>timeout</code>配置<br>
              连接：<a-input-number v-model="config.server.setting.defaultKeepAliveTimeout" :step="1000" :min="1000" /> ms，对应<code>keepAliveTimeout</code>配置
            </a-form-item>
            <hr style="margin-bottom:15px">
            <div>这里指定域名的超时时间：<span class="form-help">（域名配置可使用通配符或正则）</span></div>
            <VueJsonEditor
              ref="editor" v-model="config.server.setting.timeoutMapping" style="flex-grow:1;min-height:300px;margin-top:10px" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="4" tab="域名白名单">
          <a-row style="margin-top:10px">
            <a-col span="19">
              <div>这里配置的域名不会通过代理</div>
            </a-col>
            <a-col span="3">
              <a-button style="margin-left:8px" type="primary" icon="plus" @click="addWhiteList()" />
            </a-col>
          </a-row>
          <a-row v-for="(item, index) of whiteList" :key="index" :gutter="10" style="margin-top: 5px">
            <a-col :span="19">
              <a-input v-model="item.key" :disabled="item.value === false" />
            </a-col>
            <a-col :span="3">
              <a-button v-if="item.value !== false" type="danger" icon="minus" @click="deleteWhiteList(item, index)" />
            </a-col>
          </a-row>
        </a-tab-pane>
        <a-tab-pane key="5" tab="自动兼容程序">
          <div style="height:100%;display:flex;flex-direction:column">
            <div>
              说明：<code>自动兼容程序</code>会自动根据错误信息进行兼容性调整，并将兼容设置保存在 <code>~/.dev-sidecar/automaticCompatibleConfig.json</code> 文件中。但并不是所有的兼容设置都是正确的，所以需要通过以下配置来覆盖错误的兼容设置。
            </div>
            <VueJsonEditor
              ref="editor" v-model="config.server.compatible" style="flex-grow:1;min-height:300px;margin-top:10px;" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="6" tab="IP预设置">
          <div style="height:100%;display:flex;flex-direction:column">
            <div>
              提示：<code>IP预设置</code>功能，优先级高于 <code>DNS设置</code>
              <span class="form-help">（域名配置可使用通配符或正则）</span>
            </div>
            <VueJsonEditor
              ref="editor" v-model="config.server.preSetIpList" style="flex-grow:1;min-height:300px;margin-top:10px;" mode="code"
              :show-btns="false" :expanded-on-start="true"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="7" tab="DNS服务管理">
          <VueJsonEditor
            ref="editor" v-model="config.server.dns.providers" style="height:100%" mode="code"
            :show-btns="false" :expanded-on-start="true"
          />
        </a-tab-pane>
        <a-tab-pane key="8" tab="DNS设置">
          <div>
            <a-row style="margin-top:10px">
              <a-col span="19">
                <div>这里配置哪些域名需要通过国外DNS服务器获取IP进行访问</div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" icon="plus" @click="addDnsMapping()" />
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of dnsMappings" :key="index" :gutter="10" style="margin-top: 5px">
              <a-col :span="14">
                <a-input v-model="item.key" :disabled="item.value === false" />
              </a-col>
              <a-col :span="5">
                <a-select v-model="item.value" :disabled="item.value === false" style="width: 100%">
                  <a-select-option v-for="(item) of speedDnsOptions" :key="item.value" :value="item.value">
                    {{ item.value }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="3">
                <a-button v-if="item.value !== false" type="danger" icon="minus" @click="deleteDnsMapping(item, index)" />
                <a-button v-if="item.value === false" type="primary" icon="checked" @click="restoreDefDnsMapping(item, index)" />
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
        <a-tab-pane key="9" tab="IP测速">
          <div class="ip-tester" style="padding-right: 10px">
            <a-alert type="info" message="对从DNS获取到的IP进行测速，使用速度最快的IP进行访问（注意：对使用了增强功能的域名没啥用）" />
            <a-form-item label="开启DNS测速" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model="getSpeedTestConfig().enabled">
                启用
              </a-checkbox>
            </a-form-item>
            <a-form-item label="自动测试间隔" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model="getSpeedTestConfig().interval" :step="1000" :min="1" /> ms
            </a-form-item>
            <!-- <a-form-item label="慢速IP阈值" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number v-model="config.server.setting.lowSpeedDelay" :step="10" :min="100"/> ms
            </a-form-item> -->
            <div>使用以下DNS获取IP进行测速</div>
            <a-row style="margin-top:10px">
              <a-col span="24">
                <a-checkbox-group
                  v-model="getSpeedTestConfig().dnsProviders"
                  :options="speedDnsOptions"
                />
              </a-col>
            </a-row>
            <a-row :gutter="10" class="mt20">
              <a-col :span="21">
                以下域名在启动后立即进行测速，其他域名在第一次访问时才测速
              </a-col>
              <a-col :span="2">
                <a-button style="margin-left:10px" type="primary" icon="plus" @click="addSpeedHostname()" />
              </a-col>
            </a-row>
            <a-row
              v-for="(item, index) of getSpeedTestConfig().hostnameList" :key="index" :gutter="10"
              style="margin-top: 5px"
            >
              <a-col :span="21">
                <a-input v-model="getSpeedTestConfig().hostnameList[index]" />
              </a-col>
              <a-col :span="2">
                <a-button style="margin-left:10px" type="danger" icon="minus" @click="delSpeedHostname(item, index)" />
              </a-col>
            </a-row>

            <a-divider />
            <a-row :gutter="10" class="mt10">
              <a-col span="24">
                <a-button type="primary" icon="plus" @click="reSpeedTest()">
                  立即重新测速
                </a-button>
                <a-button class="md-ml-10" type="primary" icon="reload" @click="reloadAllSpeedTester()">
                  刷新
                </a-button>
              </a-col>
            </a-row>

            <a-row :gutter="20">
              <a-col v-for="(item, key) of speedTestList" :key="key" span="12">
                <a-card size="small" class="md-mt-10" :title="key">
                  <a slot="extra" href="#">
                    <a-icon v-if="item.alive.length > 0" type="check" />
                    <a-icon v-else type="info-circle" />
                  </a>
                  <a-tag
                    v-for="(element, index) of item.backupList" :key="index" style="margin:2px;"
                    :title="element.dns" :color="element.time ? (element.time > config.server.setting.lowSpeedDelay ? 'orange' : 'green') : 'red'"
                  >
                    {{ element.host }} {{ element.time }}{{ element.time ? 'ms' : '' }} {{ element.dns }}
                  </a-tag>
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button :loading="resetDefaultLoading" class="md-mr-10" icon="sync" @click="resetDefault()">
          恢复默认
        </a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">
          应用
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

  .jsoneditor-vue {
    height: 100%;
  }

  .ant-tabs {
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
}
</style>
