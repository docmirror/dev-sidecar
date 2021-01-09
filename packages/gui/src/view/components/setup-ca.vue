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
      请按如下步骤将<b>本地随机生成</b>的根证书添加到<b>信任的根证书颁发机构</b><br/>
      证书是本地随机生成，所以信任它是安全的
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
    console.log('11', platform)
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
