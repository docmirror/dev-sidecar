import { randomBytes } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { TestGroup } from '../template.js';
import { FAMILY_VALUES, getCensorsString, getResultIcon } from '../utils.js';

class DnsTester extends TestGroup {
  /**
   * A test group to assess the system's DNS resolver
   */
  constructor(globalConfig, globalResults) {
    super(globalConfig, globalResults, 'DNS')
  }

  static getTestTag() {
    return 'DNS'
  }

  static getPrereqs() {
    return ['Route']
  }

  getDefaultResults() {
    return {
      IPv4: false,
      IPv6: false,
    }
  }

  checkIfShouldSkip(globalResults) {
    /**
     * Skip this test if all routing tests failed
     */
    let skip = true
    for (const family in FAMILY_VALUES) {
      if (Object.values(globalResults.Route[family]).includes(true)) {
        this.results[family] = {}
        skip = false
      }
    }
    if (skip) {
      return 'no routable networks'
    }
    return null
  }

  async startTest() {
    this.testPrefix = `${randomBytes(30).toString('hex')}.`
    console.log(`Using POISON test prefix: ${this.testPrefix}`)

    for (const family in FAMILY_VALUES) {
      if (this.results[family] === false) {
        continue // not routable
      }
      for (const host of this.config.allow) {
        this.startResolveTest(host, family, false)
      }
      for (const host of this.config.block) {
        this.startResolveTest(host, family, true)
      }
    }
  }

  async startResolveTest(host, family, testPoison) {
    const testPrefs = ['']
    if (testPoison) {
      testPrefs.push(this.testPrefix)
    }
    for (const prefix of testPrefs) {
      this.startTestThread(
        DnsTester.resolveThread,
        [family, prefix + host],
        `${family}, ${host}${prefix ? ', POISON' : ''}`,
        this.config.timeout,
      )
    }
  }

  logResults() {
    let resStr = ''
    for (const [family, results] of Object.entries(this.results)) {
      if (results === false) {
        continue
      }
      this.results[family] = true
      const allowList = this.config.allow
      const allowOkCnt = allowList.reduce((sum, host) => sum + (results[host] || 0), 0)
      const allowTotal = allowList.length
      let resIcon
      if (allowOkCnt === allowTotal) { // DNS can resolve
        resIcon = getResultIcon(true)
      } else if (allowOkCnt === 0) { // DNS can't resolve
        resIcon = getResultIcon(false)
        this.results[family] = false
      } else { // test inconclusive
        resIcon = getResultIcon(null, `resolved ${allowOkCnt}/${allowTotal}`)
      }
      resStr += `${family}: DNS ${resIcon}\n`

      const censors = []
      const blockList = this.config.block
      const blockOkCnt = blockList.reduce((sum, host) => sum + (results[host] || 0), 0)
      const blockTotal = blockList.length
      if (blockOkCnt < blockTotal) {
        censors.push(`DNS blocking: ${blockTotal - blockOkCnt}/${blockTotal} blocked`)
      }

      const blockPoisonCnt = blockList.reduce((sum, host) => sum + (results[this.testPrefix + host] || 0), 0)
      if (blockPoisonCnt > 0) {
        censors.push(`DNS poisoning: ${blockPoisonCnt}/${blockTotal} poisoned`)
      }
      resStr += getCensorsString(censors)
    }
    return resStr
  }

  static async resolveThread(timeout, logger, results, family, host) {
    if (results[family] === false) {
      return // Not routable
    }
    results[family][host] = 0 // default to failed
    try {
      let records
      if (FAMILY_VALUES[family] === 4) {
        records = await dns.resolve4(host)
      } else {
        records = await dns.resolve6(host)
      }
      if (!timeout.isSet) {
        logger(`Got ${records.length} records`)
        results[family][host] = 1
      } else {
        logger(`Timeout occurred for ${host}`)
      }
    } catch (error) {
      if (!timeout.isSet) {
        logger(`Failed with error: ${error.message}`)
        results[family][host] = 0 // explicitly set to failed
      } else {
        logger(`Timeout occurred for ${host}`)
      }
    }
  }
}

function getClientTests() {
  return [DnsTester]
}

export default {
  DnsTester,
  getClientTests,
};
