import assert from 'node:assert'

(async () => {
	const mod = await import('../src/shell/scripts/kill-by-port.js')
	const { executor } = mod
	const __setSudo = mod.__setSudo || mod.default && mod.default.__setSudo

	let captured = { called: false, cmd: '' }
	__setSudo(async (command, _options) => {
		captured.called = true
		captured.cmd = command
		return { stdout: '', stderr: '' }
	})

	await executor.linux(async () => {}, { port: 12345 })
	assert.ok(captured.called, 'Expected sudo to be called')
	assert.ok(/lsof -i:12345/.test(captured.cmd), 'Expected sudo command to target the specified port')
	console.log('killByPortTest passed: sudo fallback invoked as expected')
})()
