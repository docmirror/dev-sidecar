const DevSidecar = require('@docmirror/dev-sidecar')

DevSidecar.api.config.reload()

async function run () {
  console.log('正在运行 free_eye 测试...\n')
  const result = await DevSidecar.api.plugin.free_eye.start()

  console.log('=== free_eye 测试结果 ===')
  console.log(`完成时间: ${result.finishedAt}`)
  console.log(`总测试数: ${result.totalTests}`)
  console.log(`已完成:   ${result.completedTests}`)

  if (result.summaries && result.summaries.length > 0) {
    console.log('\n摘要:')
    for (const s of result.summaries) {
      console.log(`  ${s}`)
    }
  }

  if (result.error) {
    console.error(`\n错误: ${result.error}`)
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('测试执行失败:', e.message)
  process.exit(1)
})
