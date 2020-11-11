<template>
  <a-drawer
    :title="title"
    placement="right"
    :closable="false"
    :visible="visible"
    :after-visible-change="afterVisibleChange"
    @close="onClose"
    width="650px"
    height="100%"
    wrapClassName="json-wrapper"
  >

    <a-tabs
      default-active-key="1"
      tab-position="left"
      :style="{ height: '100%' }"
    >
      <a-tab-pane tab="拦截设置" key="1"  >
        <vue-json-editor  style="height:100%;" ref="editor" v-model="targetConfig.intercepts" mode="code" :show-btns="false" :expandedOnStart="true" @json-change="onJsonChange" ></vue-json-editor>
      </a-tab-pane>
      <a-tab-pane tab="DNS设置" key="2">
        <div>
          <div>某些域名有时候需要通过其他DNS服务器获取到的IP才可以访问</div>
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
      <a-tab-pane tab="环境变量" key="3">
        <div>
          <div>某些库需要自己设置镜像变量，才能下载，比如：electron</div>
          <div>
            <a-form-item label="镜像环境变量" >
              <a-switch  v-model="targetConfig.setting.startup.variables.npm"  default-checked   v-on:click="(checked)=>{targetConfig.setting.startup.variables.npm = checked}">
                <a-icon slot="checkedChildren" type="check" />
                <a-icon slot="unCheckedChildren" type="close" />
              </a-switch>
              启动后自动检查设置

              <a-button style="margin-left:10px" @click="doSetNpmVariablesNow">立即设置</a-button>
            </a-form-item>
          </div>
          <a-row :gutter="10" style="margin-top: 10px" v-for="(item,index) of npmVariables" :key = 'index'>
            <a-col :span="10">
              <a-input :disabled="item.key ===false" v-model="item.key"></a-input>
            </a-col>
            <a-col :span="10">
              <a-input :disabled="item.value ===false" v-model="item.value"></a-input>
            </a-col>
            <a-col :span="4">
              <a-icon v-if="item.exists" style="color:green" type="check" />
              <a-icon v-if="!item.exists" title="还未设置" style="color:red" type="exclamation-circle" />
            </a-col>
          </a-row>
        </div>
      </a-tab-pane>

      <a-tab-pane tab="启动设置" key="4" >
        <div>启动应用程序后自动启动</div>
        <a-form style="margin-top: 20px"  :label-col="{ span: 5 }" :wrapper-col="{ span: 12 }" >
          <a-form-item label="代理服务" >
            <a-switch  v-model="targetConfig.setting.startup.server"  default-checked   v-on:click="(checked)=>{targetConfig.setting.startup.server = checked}">
              <a-icon slot="checkedChildren" type="check" />
              <a-icon slot="unCheckedChildren" type="close" />
            </a-switch>
          </a-form-item>

          <a-form-item  v-for="(item,key) in targetConfig.setting.startup.proxy" :key="key" :label="key">
            <a-switch  v-model="targetConfig.setting.startup.proxy[key]"  default-checked   v-on:click="(checked)=>{targetConfig.setting.startup.proxy[key] = checked}">
              <a-icon slot="checkedChildren" type="check" />
              <a-icon slot="unCheckedChildren" type="close" />
            </a-switch>
          </a-form-item>
        </a-form>
      </a-tab-pane>
    </a-tabs>

  </a-drawer>
</template>

<script>
import vueJsonEditor from 'vue-json-editor'
import lodash from 'lodash'
import api from '../api'
export default {
  name: 'setting',
  components: {
    vueJsonEditor
  },
  props: {
    config: {
      type: Object
    },
    title: {
      type: String,
      default: '编辑'
    },
    visible: {
      type: Boolean
    }
  },
  data () {
    return {
      targetConfig: {},
      dnsMappings: [],
      npmVariables: []
    }
  },
  created () {
    this.resetConfig()
  },
  methods: {
    resetConfig () {
      this.targetConfig = lodash.cloneDeep(this.config)
      console.log('targetConfig', this.targetConfig)
      this.dnsMappings = []
      for (const key in this.targetConfig.dns.mapping) {
        const value = this.targetConfig.dns.mapping[key]
        this.dnsMappings.push({
          key, value
        })
      }

      api.config.getVariables('npm').then(ret => {
        this.npmVariables = ret
      })
    },
    onJsonChange (config) {
    },
    afterVisibleChange (val) {
      console.log('visible', val)
      if (val === true) {
        this.resetConfig()
      }
    },
    showDrawer () {
      this.$emit('update:visible', true)
    },
    onClose () {
      if (this.isChanged()) {
        this.$confirm({
          title: '提示',
          content: '是否需要保存？',
          cancelText: '取消',
          okText: '确定',
          onOk: () => {
            this.doSave()
          },
          onCancel () {}
        })
      }

      this.$emit('update:visible', false)
    },
    syncTargetConfig () {
      const mapping = {}
      for (const item of this.dnsMappings) {
        mapping[item.key] = item.value
      }
      this.targetConfig.dns.mapping = mapping

      const variables = {}
      for (const item of this.npmVariables) {
        variables[item.key] = item.value
      }
      this.targetConfig.variables.npm = variables
    },
    isChanged () {
      this.syncTargetConfig()
      return !lodash.isEqual(this.config, this.targetConfig)
    },
    doSave () {
      return api.config.save(this.targetConfig).then(ret => {
        this.$emit('change', ret)
      })
    },
    deleteDnsMapping (item, index) {
      this.dnsMappings.splice(index, 1)
    },
    restoreDefDnsMapping (item, index) {

    },
    addDnsMapping () {
      this.dnsMappings.unshift({ key: '', value: 'usa' })
    },
    doSetNpmVariablesNow () {
      this.syncTargetConfig()
      this.doSave().then(() => {
        return api.config.setVariables('npm')
      }).then(() => {
        return api.config.getVariables('npm').then(ret => {
          this.npmVariables = ret
        })
      }).then(() => {
        this.$message.info('设置成功')
      })
    },
    addNpmVariable () {
      this.npmVariables.push({ key: '', value: '', exists: false })
    }
  }
}
</script>

<style>
.json-wrapper .ant-drawer-wrapper-body{
  display: flex;
  flex-direction: column;
}
.json-wrapper .ant-drawer-wrapper-body .ant-drawer-body{
  flex: 1;
  height: 0;
}
.json-wrapper .jsoneditor-vue{
  height:100%
}
.json-wrapper .ant-tabs{
  height: 100%;
}
.json-wrapper .ant-tabs-content{
  height: 100%;
}
.json-wrapper .ant-tabs-tabpane-active{
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.a-form{
  margin-bottom: 10px;
}
</style>
