#!/usr/bin/env node

/**
 * Thin `wp-env` wrapper that pins the ports for the current checkout.
 *
 * Everything else is passed through untouched, so `node scripts/wp-env.js run …`
 * behaves exactly like `wp-env run …`.
 */

const { spawn } = require('child_process');
const { getPorts } = require('./env-ports.js');

const { port, testsPort } = getPorts();

const child = spawn('wp-env', process.argv.slice(2), {
	stdio: 'inherit',
	shell: process.platform === 'win32',
	env: {
		...process.env,
		WP_ENV_PORT: String(port),
		WP_ENV_TESTS_PORT: String(testsPort),
	},
});

child.on('error', (error) => {
	// eslint-disable-next-line no-console
	console.error(`Failed to run wp-env: ${error.message}`);
	process.exit(1);
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code === null ? 1 : code);
});
