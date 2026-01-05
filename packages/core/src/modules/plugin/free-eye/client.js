import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import utils from './utils.js';

const printHeader = (utils && utils.printHeader) || (utils && utils.default && utils.default.printHeader)

const TEST_PACKAGE_DIR = 'checkpoints'
const PLUGIN_RELATIVE_PATH = path.join('packages', 'core', 'src', 'modules', 'plugin', 'free-eye')

function locatePluginRoot () {
  const localConfig = path.join(__dirname, 'config.json')
  if (fs.existsSync(localConfig)) {
    return __dirname
  }

  let current = __dirname
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(current, PLUGIN_RELATIVE_PATH)
    if (fs.existsSync(path.join(candidate, 'config.json'))) {
      return candidate
    }
    const parent = path.dirname(current)
    if (parent === current) {
      break
    }
    current = parent
  }
  return __dirname
}

const PLUGIN_ROOT = locatePluginRoot()
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

    const module = pluginRequire(modulePath)
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
  const preferredConfigPath = configPath && configPath.length > 0
    ? (path.isAbsolute(configPath) ? configPath : path.join(PLUGIN_ROOT, configPath))
    : null
  const fallbackConfigPath = path.join(PLUGIN_ROOT, 'config.json')

  const configCandidates = Array.from(new Set([preferredConfigPath, fallbackConfigPath].filter(Boolean)))

  let globalConfig
  let lastError
  for (const candidatePath of configCandidates) {
    try {
      if (!fs.existsSync(candidatePath)) {
        lastError = new Error(`Config file not found: ${candidatePath}`)
        continue
      }
      const configData = fs.readFileSync(candidatePath, 'utf8')
      globalConfig = JSON.parse(configData)
      break
    } catch (error) {
      lastError = new Error(`Error reading config file (${candidatePath}): ${error.message}`)
    }
  }

  if (!globalConfig) {
    throw lastError || new Error('Unable to load FreeEye config.')
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

export default { runTests };
