function install (app, api) {
  api.ipc.on('close.showTip', (event, message) => {
    console.error('error', event, message)
    const result = {
      closeType: 1,
      save: false
    }
    function onRadioChange (event) {
      result.closeType = event.target.value
    }
    function onCheckChange (event) {
      result.save = event.target.checked
    }
    app.$confirm({
      title: '关闭策略',
      content: h => <div>
        <div style={'margin-top:10px'}>
          <a-radio-group vOn:change={onRadioChange}>
            <a-radio value={1}>
          直接关闭
            </a-radio>
            <a-radio value={2}>
          最小化到系统托盘
            </a-radio>
          </a-radio-group>
        </div>
        <div style={'margin-top:10px'}>
          <a-checkbox vOn:change={onCheckChange} >
            记住本次选择，不再提示
          < /a-checkbox>
        </div>
      </div>,
      async onOk () {
        console.log('OK')
        if (result.save) {
          await api.config.update({ app: { closeStrategy: result.closeType } })
        }
        api.ipc.send('close', { key: 'selected', value: result.closeType })
      },
      onCancel () {
        console.log('Cancel')
      }
    })
  })
}

export default {
  install
}
