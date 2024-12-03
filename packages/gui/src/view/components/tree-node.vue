<script>
export default {
  name: 'TreeNode',
  props: {
    treeData: Array,
  },
  methods: {
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
  },
}
</script>

<template>
  <ul>
    <li v-for="node in treeData" :key="node.title">
      <div v-if="node.url && (node.url.startsWith('http://') || node.url.startsWith('https://'))" :class="node.rowClass" :style="node.rowStyle">
        <a :title="node.tip || node.title" :class="node.labelClass" :style="node.labelStyle" @click="openExternal(node.url)">{{ node.title }}</a>
      </div>
      <div v-else :class="node.rowClass" :style="node.rowStyle">
        <label :title="node.tip || node.title" :class="node.labelClass" :style="node.labelStyle">{{ node.title }}</label>
      </div>
      <tree-node v-if="node.children && node.children.length > 0" :tree-data="node.children" class="child-node" />
    </li>
  </ul>
</template>
