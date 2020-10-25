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
        <vue-json-editor  style="height:100%;" ref="editor" v-model="targetConfig.intercepts" :show-btns="false" :expandedOnStart="true" @json-change="onJsonChange" ></vue-json-editor>
      </a-tab-pane>
      <a-tab-pane tab="DNS设置" key="2">
        <div>
          <div>某些域名有时候需要通过其他DNS服务器获取到的IP才可以访问</div>
          <a-row :gutter="10" style="margin-top: 10px" v-for="(item,index) in dnsMappings" :key = 'item.key'>
            <a-col :span="16">
              <a-input v-model="item.key"></a-input>
            </a-col>
            <a-col :span="6">
              <a-select v-model="item.value">
                <a-select-option value="usa">USA</a-select-option>
                <a-select-option value="aliyun">Aliyun</a-select-option>
              </a-select>
              <a-button style="margin-left:10px" type="danger" icon="minus" @click="deleteDnsMapping(item,index)" />
            </a-col>
          </a-row>
          <a-row style="margin-top:10px">
            <a-col>
              <a-button  type="primary" icon="plus" @click="addDnsMapping(item)" />
            </a-col>
          </a-row>

        </div>
      </a-tab-pane>
      <a-tab-pane tab="启动设置" key="3" >
        <div>启动应用程序后自动启动</div>
        <a-form style="margin-top: 20px"  :label-col="{ span: 5 }" :wrapper-col="{ span: 12 }" >
          <a-form-item label="代理服务" style="margin-bottom: 10px">
            <a-switch  v-model="targetConfig.setting.startup.server"  default-checked   v-on:click="(checked)=>{targetConfig.setting.startup.server = checked}">
              <a-icon slot="checkedChildren" type="check" />
              <a-icon slot="unCheckedChildren" type="close" />
            </a-switch>
          </a-form-item>

          <a-form-item style="margin-bottom: 10px" v-for="(item,key) in targetConfig.setting.startup.proxy" :key="key" :label="key">
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
export default {
  name: 'App',
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
      changed: false
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
    },
    onJsonChange (config) {
      this.changed = true
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
      if (this.changed) {
        this.$confirm({
          title: '提示',
          content: '是否需要保存？',
          onOk: () => {
            this.doSave()
          },
          onCancel () {}
        })
      }

      this.$emit('update:visible', false)
    },
    doSave () {
      const mapping = {}
      for (const item of this.dnsMappings) {
        mapping[item.key] = item.value
      }
      this.targetConfig.dns.mapping = mapping
      this.$emit('change', this.targetConfig)
    },
    deleteDnsMapping (item, index) {
      this.dnsMappings.splice(index, 1)
    },
    addDnsMapping () {
      this.dnsMappings.push({ key: '', value: 'usa' })
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
}
</style>
