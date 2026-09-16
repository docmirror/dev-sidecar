<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DsContainer',
})
</script>

<template>
  <div class="ds-container">
    <div class="body-wrapper">
      <div v-if="$slots.header" class="container-header">
        <span><slot name="header" /></span>
        <span style="color:#999"><slot name="header-right" /></span>
      </div>
      <div class="container-body">
        <slot />
      </div>
      <div class="container-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.ds-container {
  height: 100%;
  background-color: #fff;
  display: flex;
  position: relative;

  .body-wrapper {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .container-header {
    padding: 15px;
    border-bottom: 1px solid #eee;
    background-color: #fff;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .container-body {
    flex: 1;
    height: 0;
    overflow: auto;
    // 始终预留滚动条空间，避免子页面切换时滚动条出现/消失导致内容宽度变化、顶部卡片跳动
    scrollbar-gutter: stable;
    position: relative;
    padding: 15px;
  }
}
</style>
