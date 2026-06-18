import { h, resolveComponent } from 'vue'

let closeType = 2
let doSave = false

function install (app, api) {
  api.ipc.on('close.showTip', (event, message) => {
    console.info('ipc channel: "close.showTip", event:', event, ', message:', message)
    function onRadioChange (e) {
      closeType = parseInt(e.target.value)
    }
    function onCheckChange (e) {
      doSave = e.target.checked
    }

    const shortcut = message.showHideShortcut || '无'

    const ARadioGroup = resolveComponent('a-radio-group')
    const ARadio = resolveComponent('a-radio')
    const ACheckbox = resolveComponent('a-checkbox')

    // 使用 h 函数创建 VNode
    const content = h('div', {}, [
      h('div', { style: { marginTop: '10px' } }, [
        h(ARadioGroup, {
          value: closeType,
          'onUpdate:value': (val) => { closeType = val },
          onChange: onRadioChange,
        }, [
          h(ARadio, { value: 1 }, '直接关闭'),
          h(ARadio, { value: 2 }, '最小化到系统托盘'),
        ]),
      ]),
      h('div', { style: { marginTop: '10px' } }, [
        h(ACheckbox, {
          checked: doSave,
          'onUpdate:checked': (val) => { doSave = val },
          onChange: onCheckChange,
        }, '记住本次选择，不再提示'),
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
        console.log('OK. closeType=', closeType, ', doSave:', doSave)
        if (doSave) {
          await api.config.update({ app: { closeStrategy: closeType } })
        }
        api.ipc.send('close', { key: 'selected', value: closeType })
      },
      onCancel () {
        console.log('Cancel. closeType=', closeType)
      },
    })
  })
}

export default {
  install,
}
