<template>
  <ds-container>
    <template slot="header">
      系统代理设置
      <span>
      </span>
    </template>

    <div style="height: 100%" >

      <a-tabs
        default-active-key="1"
        tab-position="left"
        :style="{ height: '100%' }"
        v-if="config"
      >
        <a-tab-pane tab="基本设置" key="1"  >
          <a-form-item label="启用代理服务" >
            <a-checkbox :checked="config.server.enabled" @change="config.server.enabled = $event">
              自动开启代理服务
            </a-checkbox>
            当前状态：
            <a-tag v-if="status.plugin.node.enabled" color="green">
              已启动
            </a-tag>
          </a-form-item>
          <a-form-item label="代理端口" >
            <a-input v-model="config.server.port"/>
          </a-form-item>
        </a-tab-pane>
        <a-tab-pane tab="拦截设置" key="2"  >
          <vue-json-editor  style="height:100%;" ref="editor" v-model="config.server.intercepts" mode="code" :show-btns="false" :expandedOnStart="true" @json-change="onJsonChange" ></vue-json-editor>
        </a-tab-pane>
        <a-tab-pane tab="DNS设置" key="3">
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
      </a-tabs>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button  type="primary" @click="submit()">应用</a-button>
      </div>
    </template>
  </ds-container>

</template>

<script>
import vueJsonEditor from 'vue-json-editor'
import DsContainer from '../components/container'
import api from '../api'
import status from '../status'
export default {
  name: 'Server',
  components: {
    DsContainer, vueJsonEditor
  },
  data () {
    return {
      config: undefined,
      status: status,
      dnsMappings: []
    }
  },
  created () {
    api.config.reload().then(ret => {
      this.config = ret
      this.dnsMappings = []
      for (const key in this.config.server.dns.mapping) {
        const value = this.config.server.dns.mapping[key]
        this.dnsMappings.push({
          key, value
        })
      }
    })
  },
  mounted () {
  },
  methods: {
    onJsonChange (json) {
    },
    submit () {
      api.config.set(this.config).then(() => {
        this.$message.info('设置已保存')
      })
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
