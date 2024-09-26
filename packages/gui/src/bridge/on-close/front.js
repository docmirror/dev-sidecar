let closeType = 1
let doSave = false

function install (app, api) {
  api.ipc.on('close.showTip', (event, message) => {
    console.info('ipc channel: "close.showTip", event:', event, ', message:', message)
    function onRadioChange (event) {
      closeType = event.target.value
    }
    function onCheckChange (event) {
      doSave = event.target.checked
    }
    app.$confirm({
      title: '关闭策略',
      content: h => <div>
        <div style={'margin-top:10px'}>
          <a-radio-group vOn:change={onRadioChange} defaultValue={closeType}>
            <a-radio value={1}>直接关闭</a-radio>
            <a-radio value={2}>最小化到系统托盘</a-radio>
          </a-radio-group>
        </div>
        <div style={'margin-top:10px'}>
          <a-checkbox vOn:change={onCheckChange} defaultChecked={doSave}>
            记住本次选择，不再提示
          < /a-checkbox>
        </div>
      </div>,
      async onOk () {
        console.log('OK. closeType=', closeType)
        if (doSave) {
          await api.config.update({ app: { closeStrategy: closeType } })
        }
        api.ipc.send('close', { key: 'selected', value: closeType })
      },
      onCancel () {
        console.log('Cancel. closeType=', closeType)
      }
    })
  })
}

export default {
  install
}
