<script>
import Plugin from '../mixins/plugin'

export default {
  name: 'Help',
  mixins: [Plugin],
  data () {
    return {
      key: 'help',
    }
  },
  methods: {
    ready (config) {
    },
    async openLog () {
      const dir = await this.$api.info.getConfigDir()
      this.$api.ipc.openPath(`${dir}/logs/`)
    },
    async applyBefore () {
      if (!this.config.app.showHideShortcut) {
        this.config.app.showHideShortcut = '无'
      }
    },
    async applyAfter () {
    },
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
  },
}
</script>

<template>
  <ds-container>
    <template slot="header">
      帮助中心
      <span>
        <a-button type="primary" @click="openExternal('https://github.com/docmirror/dev-sidecar/issues/new/choose')">反馈问题</a-button>
      </span>
    </template>

    <div v-if="config">
      啊啊啊
    </div>
  </ds-container>
</template>
