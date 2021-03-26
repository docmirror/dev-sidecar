<template>
  <a-drawer
    placement="right"
    :closable="false"
    :visible="visible"
    :after-visible-change="afterVisibleChange"
    @close="onClose"
    width="660px"
    height="100%"
    :slots="{ title: 'title' }"
    wrapClassName="json-wrapper"
  >
    <template slot="title">
      {{title}}
      <a-button type="primary" style="float:right" @click="doSetup()">点此去安装</a-button>
    </template>
    <div>
      <b>本应用在非“安全模式”下必须安装和信任CA根证书</b>，该证书是应用启动时本地随机生成的<br/>
      <template v-if="this.systemPlatform === 'mac'">
        1、点击右上角“点此去安装按钮”，打开钥匙串<br/>
        2、然后按如下图步骤将随机生成的根证书设置为始终信任<br/>
        3、可能需要重新启动应用和浏览器才能生效<br/>
      </template>
      <template v-else>
        1、点击右上角“点此去安装按钮”，打开证书<br/>
        2、然后按如下图步骤将根证书添加到<b>信任的根证书颁发机构</b><br/>
      </template>
    </div>
    <img width="100%" :src="setupImage" />

  </a-drawer>
</template>

<script>
export default {
  name: 'setup-ca',
  components: {

  },
  props: {
    title: {
      type: String,
      default: '安装根证书'
    },
    visible: {
      type: Boolean
    }
  },
  data () {
    return {
      systemPlatform: 'win'
    }
  },
  async created () {
    const platform = await this.$api.info.getSystemPlatform()
    this.systemPlatform = platform
  },
  computed: {
    setupImage () {
      if (this.systemPlatform === 'mac') {
        return '/setup-mac.png'
      } else {
        return '/setup.png'
      }
    }
  },
  methods: {
    afterVisibleChange (val) {
    },
    showDrawer () {
      this.$emit('update:visible', true)
    },
    onClose () {
      this.$emit('update:visible', false)
    },
    async doSetup () {
      this.$emit('setup')
    }
  }
}
</script>

<style>
</style>
