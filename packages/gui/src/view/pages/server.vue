<template>
  <ds-container>
    <template slot="header">
      系统代理设置
      <span>
      </span>
    </template>

    <div style="height: 100%" class="json-wrapper" >

      <a-tabs
        default-active-key="1"
        tab-position="left"
        :style="{ height: '100%' }"
        v-if="config"
      >
        <a-tab-pane tab="基本设置" key="1"  >
          <a-form-item label="代理服务:" :label-col="labelCol" :wrapper-col="wrapperCol">
            <a-checkbox v-model="config.server.enabled" >
              随应用启动
            </a-checkbox>
            <a-tag v-if="status.proxy.enabled" color="green">
              当前已启动
            </a-tag>
            <a-tag v-else color="red">
              当前未启动
            </a-tag>

            <a-button class="md-mr-10" icon="profile"   @click="openLog()">日志</a-button>
          </a-form-item>
          <a-form-item label="代理端口" :label-col="labelCol" :wrapper-col="wrapperCol" >
            <a-input v-model="config.server.port"/>
            <div>修改后需要重启应用</div>
          </a-form-item>
          <a-form-item label="校验SSL" :label-col="labelCol" :wrapper-col="wrapperCol">
            <a-checkbox v-model="config.server.setting.NODE_TLS_REJECT_UNAUTHORIZED">
              NODE_TLS_REJECT_UNAUTHORIZED
            </a-checkbox>
            <div>开启此项之后，被代理应用关闭SSL校验也问题不大了</div>
          </a-form-item>
          <a-form-item label="根证书：" :label-col="labelCol" :wrapper-col="wrapperCol">
             <a-input-search addon-before="Cert" enter-button="选择" @search="onCrtSelect"   v-model="config.server.setting.rootCaFile.certPath" />
             <a-input-search addon-before="Key" enter-button="选择" @search="onKeySelect" v-model="config.server.setting.rootCaFile.keyPath" />
          </a-form-item>
          <a-form-item label="启用拦截" :label-col="labelCol" :wrapper-col="wrapperCol">
            <a-tooltip title="关闭拦截，且关闭功能增强的话，就不需要安装根证书，本应用退化为dns优选，最安全">
              <a-checkbox v-model="config.server.intercept.enabled" >
                启用拦截
              </a-checkbox>
            </a-tooltip>
          </a-form-item>
          <a-form-item label="启用脚本" :label-col="labelCol" :wrapper-col="wrapperCol">
            <a-tooltip title="关闭后，github的clone加速链接复制也将关闭">
              <a-checkbox v-model="config.server.setting.script.enabled" >
                允许插入并运行脚本
              </a-checkbox>
            </a-tooltip>
          </a-form-item>
        </a-tab-pane>
        <a-tab-pane tab="拦截设置" key="2"  >
            <vue-json-editor  style="height:100%;" ref="editor" v-model="config.server.intercepts" mode="code" :show-btns="false" :expandedOnStart="true" @json-change="onJsonChange" ></vue-json-editor>
        </a-tab-pane>
        <a-tab-pane tab="DNS设置" key="3">
          <div>

            <a-row style="margin-top:10px">
              <a-col span="19">
                <div>这里配置哪些域名需要通过国外DNS服务器获取IP进行访问</div>
              </a-col>
              <a-col span="3">
                <a-button style="margin-left:8px" type="primary" icon="plus" @click="addDnsMapping()" />
              </a-col>
            </a-row>
            <a-row :gutter="10" style="margin-top: 10px" v-for="(item,index) of dnsMappings" :key = 'index'>
              <a-col :span="14">
                <a-input :disabled="item.value ===false" v-model="item.key"></a-input>
              </a-col>
              <a-col :span="5">
                <a-select :disabled="item.value ===false" v-model="item.value" style="width: 100%">
                  <a-select-option v-for="(item) of speedDnsOptions" :key="item.value" :value="item.value">{{item.value}}</a-select-option>
                </a-select>
              </a-col>
              <a-col :span="3">
                <a-button v-if="item.value!==false"  type="danger" icon="minus" @click="deleteDnsMapping(item,index)" />
                <a-button v-if="item.value===false"  type="primary" icon="checked" @click="restoreDefDnsMapping(item,index)" ></a-button>
              </a-col>
            </a-row>

          </div>
        </a-tab-pane>
        <a-tab-pane tab="IP测速" key="4">
          <div>
            <a-alert type="info" message="对从dns获取到的ip进行测速，使用速度最快的ip进行访问。（对使用增强功能的域名没啥用）"></a-alert>
            <a-form-item label="开启dns测速" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-checkbox v-model="getSpeedTestConfig().enabled" >
                启用
              </a-checkbox>
            </a-form-item>
            <a-form-item label="自动测试间隔" :label-col="labelCol" :wrapper-col="wrapperCol">
              <a-input-number id="inputNumber" v-model="getSpeedTestConfig().interval" :step="1000" :min="1" /> ms
            </a-form-item>
            <div>使用以下dns获取ip进行测速</div>
            <a-row style="margin-top:10px">
              <a-col span="24">
                <a-checkbox-group
                  v-model="getSpeedTestConfig().dnsProviders"
                  :options="speedDnsOptions"
                />
              </a-col>
            </a-row>
            <a-row :gutter="10" class="mt20" >
              <a-col :span="21">
                以下域名在启动后立即进行测速，其他域名在第一次访问时才测速
              </a-col>
              <a-col :span="2">
                <a-button  style="margin-left:10px" type="primary" icon="plus" @click="addSpeedHostname()" />
              </a-col>
            </a-row>
            <a-row :gutter="10" style="margin-top: 10px" v-for="(item,index) of getSpeedTestConfig().hostnameList" :key = 'index'>
              <a-col :span="21">
                <a-input  v-model="getSpeedTestConfig().hostnameList[index]"/>
              </a-col>
              <a-col :span="2">
                <a-button style="margin-left:10px" type="danger" icon="minus" @click="delSpeedHostname(item,index)" />
              </a-col>
            </a-row>

            <a-divider />
            <a-row :gutter="10" class="mt10">
              <a-col span="24">
                <a-button  type="primary" icon="plus" @click="reSpeedTest()" >立即重新测速</a-button>
                <a-button class="md-ml-10" type="primary" icon="reload" @click="reloadAllSpeedTester()" >刷新</a-button>
              </a-col>
            </a-row>

            <a-row :gutter="20">
              <a-col span="12" v-for="(item,key) of speedTestList" :key='key'>
                <a-card size="small" class="md-mt-10"    :title="key"  >
                  <a slot="extra" href="#">
                    <a-icon v-if="item.alive.length>0"  type="check" />
                    <a-icon v-else  type="info-circle" />
                  </a>
                  <a-tag style="margin:2px;" v-for="(element,index) of item.backupList"  :color="element.time?'green':'red'" :key = 'index'>{{element.host}} {{element.time}}{{element.time?'ms':''}}</a-tag>
                </a-card>
              </a-col>
            </a-row>

          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button class="md-mr-10" icon="sync"   @click="resetDefault()">恢复默认</a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">应用</a-button>
      </div>
    </template>
  </ds-container>

</template>

<script>
import vueJsonEditor from 'vue-json-editor'
import Plugin from '../mixins/plugin'
import _ from 'lodash'
export default {
  name: 'Server',
  components: {
    vueJsonEditor
  },
  mixins: [Plugin],
  data () {
    return {
      key: 'server',
      labelCol: { span: 4 },
      wrapperCol: { span: 20 },
      dnsMappings: [],
      speedTestList: []
    }
  },
  created () {
  },
  mounted () {
    this.registerSpeedTestEvent()
  },
  computed: {
    speedDnsOptions () {
      const options = []
      console.log('this.config', this.config)
      if (!this.config || !this.config.server || !this.config.server.dns || !this.config.server.dns.providers) {
        return options
      }
      _.forEach(this.config.server.dns.providers, (dnsConf, key) => {
        options.push({
          value: key,
          label: key
        })
      })
      return options
    }
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
    onJsonChange (json) {
    },
    ready () {
      this.dnsMappings = []
      for (const key in this.config.server.dns.mapping) {
        const value = this.config.server.dns.mapping[key]
        this.dnsMappings.push({
          key, value
        })
      }
      if (this.config.server.dns.speedTest.dnsProviders) {
        this.speedDns = this.config.server.dns.speedTest.dnsProviders
      }
    },
    async applyBefore () {
      const dnsMapping = {}
      for (const item of this.dnsMappings) {
        if (item.key) {
          dnsMapping[item.key] = item.value
        }
      }
      this.config.server.dns.mapping = dnsMapping
    },
    async applyAfter () {
      if (this.status.server.enabled) {
        return this.$api.server.restart()
      }
    },
    deleteDnsMapping (item, index) {
      this.dnsMappings.splice(index, 1)
    },
    restoreDefDnsMapping (item, index) {

    },
    addDnsMapping () {
      this.dnsMappings.unshift({ key: '', value: 'usa' })
    },
    async openLog () {
      const dir = await this.$api.info.getConfigDir()
      this.$api.ipc.openPath(dir + '/logs/')
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
    }
  }
}
</script>
<style lang="scss">
.json-wrapper {
  .ant-drawer-wrapper-body{
    display: flex;
    flex-direction: column;

    .ant-drawer-body{
      flex: 1;
      height: 0;
    }
  }

  .jsoneditor-vue{
    height:100%
  }
  .ant-tabs{
    height: 100%;
  }
  .ant-tabs-content{
    height: 100%;
  }
  .ant-tabs-tabpane-active{
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }
}
</style>
