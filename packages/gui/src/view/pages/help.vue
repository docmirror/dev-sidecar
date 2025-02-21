<script>
import Plugin from '../mixins/plugin'
import TreeNode from '../components/tree-node'

export default {
  name: 'Help',
  components: {
    TreeNode,
  },
  mixins: [Plugin],
  data () {
    return {
      key: 'help',
    }
  },
  methods: {
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
    </template>
    <template slot="header-right">
      <a-button class="md-mr-10" @click="openExternal('https://github.com/docmirror/dev-sidecar/issues/new/choose')">反馈问题</a-button>
      <a-button class="md-mr-10" icon="profile" @click="openLog()">查看日志</a-button>
    </template>

    <div v-if="config" class="help-list">
      <TreeNode :tree-data="config.help.dataList" />
    </div>
  </ds-container>
</template>
