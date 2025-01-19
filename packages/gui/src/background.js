import path from 'node:path'
import { fork } from 'node:child_process'

const isDevelopment = process.env.NODE_ENV !== 'production'
const RUN_AS_NODE = !!process.env.ELECTRON_RUN_AS_NODE

;(async () => {
  if (RUN_AS_NODE) {
    await startHeadless()
  } else {
    await startGUI()
  }
})()

async function startHeadless () {
  const cli = path.join(__dirname, 'dev-sidecar-cli.js')
  let argv
  if (isDevelopment) {
    argv = process.argv.splice(3)
  } else {
    argv = process.argv
  }

  const cliProcess = fork(cli, argv, {
    env: {
      ...process.env,
      NO_CONSOLE_LOG: true,
    },
    detached: true,
    stdio: 'inherit',
  })

  cliProcess.unref()
}

async function startGUI () {

}
