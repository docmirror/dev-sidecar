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
      <span>
        <a-button @click="openExternal('https://github.com/docmirror/dev-sidecar/issues/new/choose')">反馈问题</a-button>
      </span>
    </template>

    <div v-if="config" class="help-list">
      <TreeNode :tree-data="config.help.dataList" />
    </div>
  </ds-container>
</template>
