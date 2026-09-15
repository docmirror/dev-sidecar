const { assert } = require('chai')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const instance = require('../src/modules/instance')
const event = require('../src/event')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('instance', () => {
  let tmpDir
  let oldHome
  let oldUserProfile

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-core-instance-'))
    // getUserBasePath 优先读 USERPROFILE（Windows），其次 HOME（Linux/macOS）
    oldHome = process.env.HOME
    oldUserProfile = process.env.USERPROFILE
    process.env.HOME = tmpDir
    process.env.USERPROFILE = tmpDir
    fs.mkdirSync(path.join(tmpDir, '.dev-sidecar'), { recursive: true })
  })

  afterEach(() => {
    if (oldHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = oldHome
    }
    if (oldUserProfile === undefined) {
      delete process.env.USERPROFILE
    } else {
      process.env.USERPROFILE = oldUserProfile
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('lock', () => {
    it('should acquire and release the lock', async () => {
      assert.isFalse(await instance.isLocked())
      const release = await instance.acquireLock()
      assert.isTrue(await instance.isLocked())
      await release()
      assert.isFalse(await instance.isLocked())
    })

    it('should reject second acquire while lock is held', async () => {
      const release = await instance.acquireLock()
      try {
        await instance.acquireLock()
        assert.fail('second acquire should fail')
      } catch (e) {
        assert.strictEqual(e.code, 'ELOCKED')
      }
      await release()
    })

    it('should take over a stale lock left by a crashed process', async () => {
      const lockPath = instance.getLockPath()
      fs.mkdirSync(lockPath, { recursive: true })
      const past = new Date(Date.now() - 30000)
      fs.utimesSync(lockPath, past, past)
      assert.isFalse(await instance.isLocked())
      const release = await instance.acquireLock()
      assert.isTrue(await instance.isLocked())
      await release()
    })

    it('should not take over a fresh lock', async () => {
      const lockPath = instance.getLockPath()
      fs.mkdirSync(lockPath, { recursive: true })
      assert.isTrue(await instance.isLocked())
      try {
        await instance.acquireLock()
        assert.fail('should not take over fresh lock')
      } catch (e) {
        assert.strictEqual(e.code, 'ELOCKED')
      }
    })
  })

  describe('instance info', () => {
    it('should write and read instance info', () => {
      const payload = { type: 'cli', pid: 123, command: 'node --daemon', startTime: '2026-01-01T00:00:00.000Z' }
      instance.writeInstance(payload)
      assert.deepEqual(instance.readInstance(), payload)
    })

    it('should return null when running.json is missing', () => {
      assert.isNull(instance.readInstance())
    })

    it('should preserve app.instance when updateStatus writes', async () => {
      instance.writeInstance({ type: 'cli', pid: 123 })
      instance.updateStatus('server.enabled', true)
      await sleep(400)
      const data = JSON.parse(fs.readFileSync(instance.getRunningJsonPath(), 'utf-8'))
      assert.deepEqual(data.app.instance, { type: 'cli', pid: 123 })
      assert.isTrue(data.app.status.server.enabled)
    })
  })

  describe('updateStatus', () => {
    it('should debounce multiple updates into one write', async () => {
      instance.updateStatus('server.enabled', true)
      instance.updateStatus('proxy.enabled', true)
      instance.updateStatus('plugin.git.enabled', true)
      const filePath = instance.getRunningJsonPath()
      assert.isFalse(fs.existsSync(filePath), 'should not write before debounce flush')
      await sleep(400)
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      assert.isTrue(data.app.status.server.enabled)
      assert.isTrue(data.app.status.proxy.enabled)
      assert.isTrue(data.app.status.plugin.git.enabled)
    })

    it('should set nested keys via dot path', async () => {
      instance.updateStatus('plugin.node.enabled', true)
      await sleep(400)
      const data = JSON.parse(fs.readFileSync(instance.getRunningJsonPath(), 'utf-8'))
      assert.isTrue(data.app.status.plugin.node.enabled)
    })

    it('should ignore invalid keys', async () => {
      instance.updateStatus('', true)
      instance.updateStatus(null, true)
      await sleep(400)
      const filePath = instance.getRunningJsonPath()
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        assert.deepEqual(data.app.status, {})
      }
    })
  })

  describe('watchStatusEvents', () => {
    it('should sync *.enabled events to running.json', async () => {
      const release = await instance.acquireLock()
      try {
        event.fire('status', { key: 'server.enabled', value: true })
        event.fire('status', { key: 'plugin.git.enabled', value: true })
        await sleep(400)
        const data = JSON.parse(fs.readFileSync(instance.getRunningJsonPath(), 'utf-8'))
        assert.isTrue(data.app.status.server.enabled)
        assert.isTrue(data.app.status.plugin.git.enabled)
      } finally {
        await release()
      }
    })

    it('should filter non-enabled events (e.g. free_eye.result)', async () => {
      const release = await instance.acquireLock()
      try {
        event.fire('status', { key: 'server.enabled', value: true })
        await sleep(400)
        event.fire('status', { key: 'plugin.free_eye.result', value: { big: 'x'.repeat(10000) } })
        await sleep(400)
        const data = JSON.parse(fs.readFileSync(instance.getRunningJsonPath(), 'utf-8'))
        assert.isTrue(data.app.status.server.enabled)
        assert.isUndefined(data.app.status.plugin)
      } finally {
        await release()
      }
    })
  })
})
