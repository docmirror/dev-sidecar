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
            <div>某些域名需要通过国外DNS服务器获取到IP列表中选取相对最优的IP进行访问</div>
            <a-row style="margin-top:10px">
              <a-col>
                <a-button  type="primary" icon="plus" @click="addDnsMapping()" />
              </a-col>
            </a-row>
            <a-row :gutter="10" style="margin-top: 10px" v-for="(item,index) of dnsMappings" :key = 'index'>
              <a-col :span="14">
                <a-input :disabled="item.value ===false" v-model="item.key"></a-input>
              </a-col>
              <a-col :span="5">
                <a-select :disabled="item.value ===false" v-model="item.value">
                  <a-select-option value="usa">USA DNS</a-select-option>
                  <a-select-option value="aliyun">Aliyun DNS</a-select-option>
                </a-select>
              </a-col>
              <a-col :span="3">
                <a-button v-if="item.value!==false" style="margin-left:10px" type="danger" icon="minus" @click="deleteDnsMapping(item,index)" />
                <a-button v-if="item.value===false" style="margin-left:10px" type="primary" icon="checked" @click="restoreDefDnsMapping(item,index)" ></a-button>
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
      dnsMappings: []
    }
  },
  created () {
  },
  mounted () {
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
