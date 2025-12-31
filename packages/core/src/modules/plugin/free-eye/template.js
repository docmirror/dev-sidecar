import { performance } from 'node:perf_hooks';

class TestThread {
  /**
   * A single test that should be run in its own thread and
   * preempted when its timeout is reached
   */
  constructor (func, args, logHdr, timeout, results) {
    this.logHdr = logHdr
    this.log('Starting test...')

    this.timeoutEvent = { isSet: false }
    this.results = results
    this.startTime = performance.now()
    this.timeout = timeout * 1000 // convert to ms

    // Start the async function and store the promise
    this.runPromise = this.run(func, args)
  }

  log (s) {
    console.log(this.logHdr + s)
  }

  async run (func, args) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        this.timeoutEvent.isSet = true
        reject(new Error('Test timed out!'))
      }, this.timeout)
    })

    try {
      await Promise.race([
        func(this.timeoutEvent, this.log.bind(this), this.results, ...args),
        timeoutPromise,
      ])
    } catch (error) {
      if (error.message === 'Test timed out!') {
        this.log('Test timed out!')
      } else {
        this.log(`Test failed: ${error.message}`)
      }
    }
  }
}

class TestGroup {
  /**
   * A group of related tests that can be run in parallel.
   */
  constructor (globalConfig, globalResults, testTag) {
    this.testTag = testTag
    this.startTime = performance.now()
    this.config = globalConfig[testTag]
    this.threads = []

    this.results = this.getDefaultResults()
    globalResults[testTag] = this.results
    this.skipReason = this.checkIfShouldSkip(globalResults)
  }

  /**
   * Return a string identifying this test group
   */
  static getTestTag () {
    return ''
  }

  /**
   * Return the tags of other tests this test relies on
   */
  static getPrereqs () {
    return []
  }

  /**
   * Return this test's default (i.e. all failed) results
   */
  getDefaultResults () {
    return {}
  }

  checkIfShouldSkip (globalResults) {
    /**
     * If earlier results indicate this test shouldn't be run
     * return a string indicating why (otherwise return null)
     */
    return null
  }

  async runTest () {
    /**
     * Wait for all running test threads to complete or
     * timeout, then log the results and return a summary.
     */
    await this.startTest()
    // Wait for all threads to complete
    await Promise.all(this.threads.map(thread => thread.runPromise))
    const testResults = this.logResults()
    const testTime = (performance.now() - this.startTime) / 1000 // convert to seconds
    return [testTime, testResults]
  }

  async startTest () {
    /**
     * Implemented by subclasses to create the test threads
     */
    // To be implemented by subclasses
  }

  startTestThread (func, args, logTag, timeout) {
    /**
     * Create a new test thread in this test group
     */
    const threadIdx = this.threads.length
    const logHdr = `${this.testTag} #${threadIdx} (${logTag}): `
    const thread = new TestThread(func, args, logHdr, timeout, this.results)
    this.threads.push(thread)
  }

  logResults () {
    /**
     * Log the results of the completed test threads and
     * return a string summarizing the results.
     */
    return ''
  }
}

function getClientTests () {
  /**
   * Return a list of TestGroup classes defined in this
   * module that clients should run
   */
  return []
}

export default {
  TestThread,
  TestGroup,
  getClientTests,
};
