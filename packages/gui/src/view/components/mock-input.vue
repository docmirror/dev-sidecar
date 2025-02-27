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
  <span ref="input" class="ant-input" contenteditable="true" spellcheck="false" :title="value" @blur="onBlur" @keydown="onKeydown" v-html="value" />
</template>
