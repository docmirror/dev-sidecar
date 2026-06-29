<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'

const props = defineProps({
  modelValue: { type: [Object, Array, String], default: undefined },
  mode: { type: String, default: 'tree' },
  modes: { type: Array, default: () => ['tree', 'code', 'form', 'text', 'view'] },
  showBtns: { type: Boolean, default: true },
  expandedOnStart: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'json-save', 'has-error'])

const containerRef = ref(null)
let editor = null
const uid = `jsoneditor-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`

function initEditor () {
  if (!containerRef.value) {
    return
  }

  const container = containerRef.value.querySelector('.jsoneditor-container')
  if (!container) {
    return
  }

  if (editor) {
    editor.destroy()
    editor = null
  }

  const options = {
    mode: props.mode,
    modes: props.modes,
    onChange () {
      try {
        const json = editor.get()
        emit('update:modelValue', json)
      } catch (e) {
        emit('has-error', e)
      }
    },
  }

  editor = new JSONEditor(container, options, props.modelValue)

  if (props.expandedOnStart) {
    try { editor.expandAll() } catch (_) { /* ignore */ }
  }
}

onMounted(() => {
  nextTick(() => {
    initEditor()
  })
})

onBeforeUnmount(() => {
  if (editor) {
    editor.destroy()
    editor = null
  }
})

watch(() => props.modelValue, (val) => {
  if (editor && val !== undefined) {
    try {
      // 避免 set 触发 onChange 导致的双向绑定循环
      const current = editor.get()
      if (JSON.stringify(current) !== JSON.stringify(val)) {
        editor.set(val)
      }
    } catch (_) { /* ignore */ }
  }
})
</script>

<template>
  <div ref="containerRef" class="json-editor-wrapper">
    <div :id="uid" class="jsoneditor-container" />
  </div>
</template>

<style scoped>
.json-editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}
.jsoneditor-container {
  flex: 1;
  min-height: 0;
}
</style>
