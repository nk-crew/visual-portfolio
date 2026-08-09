#!/usr/bin/env node

/**
 * Activates the plugins in both `wp-env` environments after a start.
 *
 * Everything is mounted through `mappings` in `.wp-env.json` rather than through
 * `plugins`, so that each directory inside WordPress keeps a fixed name no matter
 * what the checkout directory is called. `mappings` does not activate anything,
 * which is what this script is for.
 *
 * Order matters: the plugin has to come first, ahead of any test helper that
 * inspects it.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PLUGINS = [
	'visual-portfolio',
	'gutenberg-test-plugin-disables-the-css-animations',
];

const CONTAINERS = ['cli', 'tests-cli'];

// A freshly created environment can still be finishing its database setup when
// this runs, so give it a few tries before calling it a failure.
const ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

const localBin = path.resolve(
	__dirname,
	'..',
	'node_modules',
	'.bin',
	process.platform === 'win32' ? 'wp-env.cmd' : 'wp-env'
);
const wpEnvBin = fs.existsSync(localBin) ? localBin : 'wp-env';

/**
 * Runs `wp plugin activate` in a container, retrying while the site is not ready.
 *
 * @param {string} container The wp-env container to run in.
 * @return {{ ok: boolean, output: string }} The outcome of the last attempt.
 */
function activateIn(container) {
	let output = '';

	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		const result = spawnSync(
			wpEnvBin,
			['run', container, 'wp', 'plugin', 'activate', ...PLUGINS],
			{
				encoding: 'utf-8',
				shell: process.platform === 'win32',
			}
		);

		if (result.status === 0) {
			return { ok: true, output: result.stdout || '' };
		}

		output = `${result.stderr || result.stdout || ''}`.trim();

		if (attempt < ATTEMPTS) {
			// `spawnSync` keeps this simple: block until the next attempt.
			spawnSync(process.execPath, [
				'-e',
				`setTimeout(() => {}, ${RETRY_DELAY_MS})`,
			]);
		}
	}

	return { ok: false, output };
}

let failed = false;

for (const container of CONTAINERS) {
	const { ok, output } = activateIn(container);

	if (!ok) {
		failed = true;

		// eslint-disable-next-line no-console
		console.error(
			`Could not activate plugins in the "${container}" container.\n${output}`
		);
	}
}

if (failed) {
	process.exit(1);
}

// eslint-disable-next-line no-console
console.log(`Activated: ${PLUGINS.join(', ')}.`);
