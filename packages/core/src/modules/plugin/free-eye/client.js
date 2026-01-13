import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import utils from './utils.js'

const printHeader = (utils && utils.printHeader) || (utils && utils.default && utils.default.printHeader)

// 简化说明：
// - 本文件为 FreeEye 插件的客户端运行器（用于加载插件的 tests 并顺序执行）。
// - 为了降低运行时复杂度，我们将插件根定为本文件所在目录（`PLUGIN_ROOT = __dirname`），
//   不再向上遍历查找配置文件或插件目录。这样实现假定项目中该文件位置稳定。
// - 配置加载采用同步的 `require` 风格（通过 `createRequire` 创建的 `pluginRequire`），
//   以便在 CommonJS 环境或混合模块环境中更可靠地加载 `config.js`（`module.exports` 或 `export default`）。
//   如果你的 `config.js` 是严格 ESM-only（例如使用 `export` 且包含顶级 `await`），
//   需要改回基于动态 `import()` 的实现。
const TEST_PACKAGE_DIR = 'checkpoints'

// 插件根目录（简化为当前目录）
const PLUGIN_ROOT = __dirname
// 用于在插件目录上下文中同步加载模块（config、tests 等）
const pluginRequire = createRequire(path.join(PLUGIN_ROOT, 'index.js'))

function resolveTestsDir (customDir) {
  const fallbackDir = path.join(PLUGIN_ROOT, TEST_PACKAGE_DIR)
  if (!customDir) {
    return fallbackDir
  }
  if (path.isAbsolute(customDir)) {
    return fs.existsSync(customDir) ? customDir : fallbackDir
  }
  const candidate = path.join(PLUGIN_ROOT, customDir)
  return fs.existsSync(candidate) ? candidate : fallbackDir
}

async function loadAllTests (globalConfig, testsDir) {
  const tests = []
  const resolvedDir = resolveTestsDir(testsDir)
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Tests directory not found: ${resolvedDir}`)
  }
  const files = fs.readdirSync(resolvedDir).filter(file => file.endsWith('.js') && file !== '__init__.js')

  for (const file of files) {
    const modulePath = path.join(resolvedDir, file)

    // 使用 pluginRequire 同步加载测试模块。这样做的好处：
    // - 保持加载行为一致（在 CommonJS / 混合项目中更可靠）
    // - 避免动态 import 带来的 URL 转换与异步模块解析复杂性
    const module = pluginRequire(modulePath)
    // 测试模块可以导出 `getClientTests`（命名导出或 default 导出中的方法）
    const getClientTests = module.getClientTests || (module.default && module.default.getClientTests)
    if (typeof getClientTests === 'function') {
      for (const testCls of getClientTests()) {
        if (testCls.getTestTag() in globalConfig) {
          tests.push(testCls)
        }
      }
    }
  }
  return tests
}

function getNextTest (todoTests, doneTests) {
  for (const testCls of todoTests) {
    // 检查此测试类的前置依赖（prereqs）是否全部完成。
    // 如果全部满足，则返回该测试类作为下一要执行的任务。
    let allPrereqsDone = true
    for (const testTag of testCls.getPrereqs()) {
      if (!doneTests.includes(testTag)) {
        allPrereqsDone = false
        break
      }
    }
    if (allPrereqsDone) {
      return testCls
    }
  }
  return null
}

async function runTests (options = {}) {
  const { configPath, testsDir } = options
  // 配置文件解析规则（简化）：
  // - 如果传入了 `configPath`，则优先使用它（相对路径相对于插件根）。
  // - 否则使用插件根下的 `config.js`。
  // - 使用 `pluginRequire` 同步加载配置模块；接受 `module.exports` 或 `export default` 两种形式。
  let preferredConfigPath = path.join(PLUGIN_ROOT, 'config.js')
  if (configPath && configPath.length > 0) {
    if (path.isAbsolute(configPath)) {
      preferredConfigPath = configPath
    } else {
      preferredConfigPath = path.join(PLUGIN_ROOT, configPath)
    }
  }

  if (!fs.existsSync(preferredConfigPath)) {
    throw new Error(`Config file not found: ${preferredConfigPath}`)
  }

  let globalConfig
  try {
    // 这里期望 config.js 导出一个对象，包含如 mainConfig.server.plugin.free_eye 的合并结果或默认设置
    const mod = pluginRequire(preferredConfigPath)
    globalConfig = mod && (mod.default || mod)
  } catch (err) {
    throw new Error(`Error loading config (${preferredConfigPath}): ${err.message}`)
  }

  const globalResults = {}
  const summaries = []
  const todoTests = await loadAllTests(globalConfig, testsDir)
  console.log(
    `Loaded ${todoTests.length} tests: ${
      todoTests.map(t => t.getTestTag()).join(' ')}`,
  )

  const doneTests = []
  while (todoTests.length > 0) {
    const TestCls = getNextTest(todoTests, doneTests)
    if (!TestCls) {
      break
    }

    const testGroup = new TestCls(globalConfig, globalResults)
    const testTag = testGroup.testTag
    const summary = { tag: testTag, skipped: false }
    printHeader(`${testTag} Test`, false)
    if (testGroup.skipReason === null) {
      const [testTime, testResults] = await testGroup.runTest()
      summary.duration = testTime
      summary.output = testResults
      summary.resultSnapshot = testGroup.results
      printHeader(`${testTag} Results: (done in ${testTime.toFixed(3)}s)`, true)
      console.log(testResults)
    } else {
      summary.skipped = true
      summary.skipReason = testGroup.skipReason
      summary.output = `Test skipped because ${testGroup.skipReason}`
      console.log(summary.output)
    }
    summaries.push(summary)
    todoTests.splice(todoTests.indexOf(TestCls), 1)
    doneTests.push(testTag)
  }
  console.log('All tests complete!')
  return {
    results: globalResults,
    summaries,
    totalTests: summaries.length,
    completedTests: summaries.filter(item => !item.skipped).length,
  }
}

if (require.main === module) {
  runTests().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

export default { runTests }
