<!--
  组件：模拟输入框（当前为简易版本，只添加了value属性）
  作用：全文检索（SearchBar）组件，无法检索 `<a-input/>` 的内容，所以使用 `<span contenteditable="true"></span>` 代替。
-->
<script>
export default {
  name: 'MockInput',
  props: {
    value: {
      type: String,
      default: '',
      required: false,
    },
  },
  methods: {
    onKeydown (event) {
      // 不允许输入换行符
      if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault()
      }
    },
    onBlur () {
      if (this.$refs.input.textContent !== this.value) {
        this.$emit('input', this.$refs.input.textContent)
      }
    },
  },
}
</script>

<template>
  <span ref="input" class="fake-input" contenteditable="true" spellcheck="false" :title="value" @blur="onBlur" @keydown="onKeydown" v-html="value" />
</template>

<style lang="scss">
.fake-input {
  /* 鼠标样式 */
  cursor: text;

  /* 内容不换行 */
  white-space: nowrap;
  overflow: hidden;
  vertical-align: middle;

  /* 复制 ant-input 样式 */
  box-sizing: border-box;
  margin: 0;
  padding: 4px 11px;
  font-variant: tabular-nums;
  list-style: none;
  font-feature-settings: 'tnum';
  position: relative;
  display: inline-block;
  width: 100%;
  height: 32px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
  line-height: 1.5;
  background-color: #fff;
  background-image: none;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}
.fine-tuning .fake-input {
  margin-top: -2px;
}
</style>
