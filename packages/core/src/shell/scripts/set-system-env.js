/**
 * 设置环境变量
 */
const Shell = require('../shell')

const execute = Shell.execute

const executor = {
  async windows (exec, { list }) {
    const psCmdsMachine = []
    const psCmdsUser = []
    for (const item of list) {
      const v = item.value == null ? '' : String(item.value)
      // escape single quotes for PowerShell single-quoted string
      const escaped = v.replace(/'/g, "''")
      psCmdsMachine.push(`[Environment]::SetEnvironmentVariable('${item.key}', '${escaped}', 'Machine')`)
      psCmdsUser.push(`[Environment]::SetEnvironmentVariable('${item.key}', '${escaped}', 'User')`)
    }

    // Wrap whole flow and return structured result so caller can show detailed errors
    try {
      let ret
      let appliedScope = null
      try {
        ret = await exec(psCmdsMachine, { type: 'ps' })
        appliedScope = 'Machine:PowerShell'
      } catch (eMachine) {
        // try User scope via PowerShell
        try {
          ret = await exec(psCmdsUser, { type: 'ps' })
          appliedScope = 'User:PowerShell'
        } catch (eUser) {
          // PowerShell attempts failed; fallback to setx via cmd
          const cmdsSetxMachine = []
          const cmdsSetxUser = []
          for (const item of list) {
            const v = item.value == null ? '' : String(item.value)
            // basic escape for double quotes in cmd
            const escaped = v.replace(/"/g, '\\"')
            cmdsSetxMachine.push(`setx ${item.key} "${escaped}" /M`)
            cmdsSetxUser.push(`setx ${item.key} "${escaped}"`)
          }
          try {
            ret = await exec(cmdsSetxMachine, { type: 'cmd' })
            appliedScope = 'Machine:setx'
          } catch (eSetxMachine) {
            try {
              ret = await exec(cmdsSetxUser, { type: 'cmd' })
              appliedScope = 'User:setx'
            } catch (eSetxUser) {
              // all attempts failed — include all error messages
              const combined = [eMachine, eUser, eSetxMachine, eSetxUser].map(e => (e && e.message) || String(e)).join(' | ')
              return { success: false, error: 'Failed to set environment variables', details: combined }
            }
          }
        }
      }

      // inject into current process so subsequent exec/child processes can inherit immediately
      let envUpdateError = null
      try {
        for (const item of list) {
          if (item.value == null) {
            delete process.env[item.key]
          } else {
            process.env[item.key] = String(item.value)
          }
        }
      } catch (e) {
        envUpdateError = e.message || String(e)
      }

      return { success: true, scope: appliedScope, output: ret, envUpdateError }
    } catch (finalErr) {
      return { success: false, error: finalErr.message || String(finalErr), details: finalErr.stack }
    }
  },
  async linux (exec, { port }) {
    throw new Error('暂未实现此功能')
  },
  async mac (exec, { port }) {
    throw new Error('暂未实现此功能')
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}
