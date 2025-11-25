#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const workdir = path.resolve(process.argv[2] ?? 'packages/gui')
const timeoutMs = Number(process.argv[3] ?? 5) * 60 * 1000 // 5 minutes

console.log(`Starting npm run electron in ${workdir} with ${timeoutMs / 60000} minute timeout...`)

const child = spawn(command, ['run', 'electron'], {
  cwd: workdir,
  stdio: 'inherit',
})

let timedOut = false

const timer = setTimeout(() => {
  timedOut = true
  console.log(`\n⏱  Electron run completed ${timeoutMs / 60000} minutes without error, terminating...`)
  child.kill('SIGTERM')
  setTimeout(() => {
    if (!child.killed)
      child.kill('SIGKILL')
  }, 5000)
}, timeoutMs)

child.on('exit', (code, signal) => {
  clearTimeout(timer)
  if (timedOut) {
    console.log('✅ 程序运行正常')
    process.exit(0)
  } else {
    console.log(`❌ 程序运行不正常 (code: ${code}, signal: ${signal})`)
    process.exit(1)
  }
})

child.on('error', (err) => {
  clearTimeout(timer)
  console.error('Failed to start electron:', err)
  process.exit(1)
})
