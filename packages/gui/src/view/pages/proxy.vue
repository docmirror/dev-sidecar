<template>
  <ds-container>
    <template slot="header">
      系统代理设置
      <span>
      </span>
    </template>

    <div v-if="config">
      <a-form-item label="启用系统代理" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.proxy.enabled" >
          随应用启动
        </a-checkbox>
        <a-tag v-if="status.proxy.enabled" color="green">
          当前已启动
        </a-tag>
        <a-tag v-else color="red">
          当前未启动
        </a-tag>
      </a-form-item>
      <a-form-item v-if="isWindows()" label="设置环境变量" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.proxy.setEnv" >
          是否同时修改HTTPS_PROXY环境变量（不好用，不建议勾选）
        </a-checkbox>
        <div class="form-help">当发现某些应用并没有走加速通道或者加速报错时，可以尝试勾选此选项，并重新开启系统代理开关</div>
        <div class="form-help">注意：当前已打开的命令行并不会实时生效，需要重新打开一个新的命令行窗口</div>
      </a-form-item>
      <a-form-item v-if="isWindows()" label="设置loopback" :label-col="labelCol" :wrapper-col="wrapperCol">
       <a-button @click="loopbackVisible=true">去设置</a-button>
        <div class="form-help">解决OneNote、MicrosoftStore、Outlook等UWP应用开启代理后无法访问网络的问题</div>
      </a-form-item>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button class="md-mr-10" icon="sync"   @click="resetDefault()">恢复默认</a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">应用</a-button>
      </div>
    </template>

    <a-drawer
      placement="right"
      :closable="false"
      :visible.sync="loopbackVisible"
      width="660px"
      height="100%"
      @close="loopbackVisible=false"
      :slots="{ title: 'title' }"
      wrapClassName="json-wrapper"
    >
      <template slot="title">
        设置Loopback  <a-button style="float:right;margin-right:10px;" @click="openEnableLoopback()">打开EnableLoopback</a-button>
      </template>
      <div>
        <div>1、此设置用于解决OneNote、MicrosoftStore、Outlook等UWP应用无法访问网络的问题。</div>
        <div>2、点击右上方按钮，打开EnableLoopback，然后按下图所示操作即可</div>
        <div>3、注意：此操作需要<b style="color:red">DevSidecar以管理员身份启动</b>，才能打开下面的EnableLoopback设置界面</div>
        <img style="margin-top:20px;border:1px solid #eee" width="80%" src="loopback.png" />
      </div>

    </a-drawer>
  </ds-container>

</template>

<script>
import Plugin from '../mixins/plugin'
export default {
  name: 'Proxy',
  mixins: [Plugin],
  data () {
    return {
      key: 'proxy',
      loopbackVisible: false
    }
  },
  async created () {
  },
  mounted () {
  },
  methods: {
    async applyAfter () {
      await this.$api.proxy.restart()
    },
    async openEnableLoopback () {
      try {
        await this.$api.proxy.setEnableLoopback()
      } catch (e) {
        if (e.message.indexOf('EACCES') !== -1) {
          this.$message.error('请将DevSidecar关闭后，以管理员身份重新打开，再尝试此操作')
          return
        }
        this.$message.error('打开失败：' + e.message)
      }
    }
  }
}
</script>
<style lang="sass">
</style>
