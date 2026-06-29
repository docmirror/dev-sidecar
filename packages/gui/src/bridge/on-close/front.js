import { h, reactive } from 'vue'
import { ipcRenderer } from 'electron'

function install (app, api) {
  ipcRenderer.on('close.showTip', (event, message) => {
    const state = reactive({
      closeType: 2,
      doSave: false,
    })

    const shortcut = message.showHideShortcut || '无'

    const content = h('div', {}, [
      h('div', { style: { marginTop: '10px', lineHeight: '28px' } }, [
        h('label', { style: { marginRight: '20px', cursor: 'pointer' } }, [
          h('input', {
            type: 'radio',
            name: 'closeStrategy',
            value: 1,
            checked: state.closeType === 1,
            onChange: () => { state.closeType = 1 },
            style: { marginRight: '6px' },
          }),
          '直接关闭',
        ]),
        h('label', { style: { cursor: 'pointer' } }, [
          h('input', {
            type: 'radio',
            name: 'closeStrategy',
            value: 2,
            checked: state.closeType === 2,
            onChange: () => { state.closeType = 2 },
            style: { marginRight: '6px' },
          }),
          '最小化到系统托盘',
        ]),
      ]),
      h('div', { style: { marginTop: '10px' } }, [
        h('label', { style: { cursor: 'pointer' } }, [
          h('input', {
            type: 'checkbox',
            checked: state.doSave,
            onChange: (e) => { state.doSave = e.target.checked },
            style: { marginRight: '6px' },
          }),
          '记住本次选择，不再提示',
        ]),
      ]),
      h('div', { style: { marginTop: '20px' } }, [
        '提示：打开窗口的快捷键为 ',
        h('code', {}, shortcut),
      ]),
    ])

    app.config.globalProperties.$confirm({
      title: '关闭策略',
      content,
      async onOk () {
        if (state.doSave) {
          await api.config.update({ app: { closeStrategy: state.closeType } })
        }
        api.ipc.send('close', { key: 'selected', value: state.closeType })
      },
      onCancel () {},
    })
  })
}

export default {
  install,
}
