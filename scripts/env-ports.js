/**
 * Resolves the `wp-env` ports for the current checkout.
 *
 * `wp-env` already isolates every checkout: it keys its instance directory,
 * Docker containers and volumes on a hash of the `.wp-env.json` path. The only
 * thing that collides between a main checkout and a `git worktree` is the pair
 * of published HTTP ports, which both default to 8888/8889.
 *
 * The main checkout keeps the familiar defaults. Linked worktrees get a stable
 * pair derived from their path, so several branches can run side by side.
 *
 * Two worktrees can in principle derive the same pair. `wp-env` then fails to
 * start with a plain port conflict; set `WP_ENV_PORT` / `WP_ENV_TESTS_PORT` to
 * resolve it.
 */

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');

const DEFAULT_PORT = 8888;
const DEFAULT_TESTS_PORT = 8889;

// Worktree ports live above the defaults, in pairs: 8900/8901, 8902/8903, ...
const WORKTREE_PORT_BASE = 8900;
const WORKTREE_PORT_PAIRS = 40;

const projectRoot = path.resolve(__dirname, '..');

let defaultPorts = null;

/**
 * Whether the current checkout is a linked worktree rather than the main one.
 *
 * In a linked worktree the git directory is `<main>/.git/worktrees/<name>`,
 * which the main checkout never is.
 *
 * @return {boolean} True when running from a linked worktree.
 */
function isLinkedWorktree() {
	try {
		const gitDir = execFileSync(
			'git',
			['rev-parse', '--absolute-git-dir'],
			{
				cwd: projectRoot,
				encoding: 'utf-8',
				stdio: ['ignore', 'pipe', 'ignore'],
			}
		).trim();

		return gitDir.split(/[\\/]/).includes('worktrees');
	} catch {
		// Not a git checkout at all — treat it as the main one.
		return false;
	}
}

/**
 * Derives a stable port pair from the project path.
 *
 * @return {{ port: number, testsPort: number }} The resolved ports.
 */
function derivePorts() {
	const hash = crypto.createHash('md5').update(projectRoot).digest();
	const offset = (hash.readUInt16BE(0) % WORKTREE_PORT_PAIRS) * 2;

	return {
		port: WORKTREE_PORT_BASE + offset,
		testsPort: WORKTREE_PORT_BASE + offset + 1,
	};
}

/**
 * The ports this checkout should use.
 *
 * Explicit environment variables always win, so CI and one-off overrides keep
 * working unchanged.
 *
 * @return {{ port: number, testsPort: number }} The resolved ports.
 */
function getPorts() {
	const envPort = parseInt(process.env.WP_ENV_PORT || '', 10);
	const envTestsPort = parseInt(process.env.WP_ENV_TESTS_PORT || '', 10);

	if (envPort && envTestsPort) {
		return { port: envPort, testsPort: envTestsPort };
	}

	if (!defaultPorts) {
		defaultPorts =
			!process.env.CI && isLinkedWorktree()
				? derivePorts()
				: { port: DEFAULT_PORT, testsPort: DEFAULT_TESTS_PORT };
	}

	return {
		port: envPort || defaultPorts.port,
		testsPort: envTestsPort || defaultPorts.testsPort,
	};
}

module.exports = { getPorts };

// `npm run env:ports` — handy when you need to know where a worktree is served.
if (require.main === module) {
	const { port, testsPort } = getPorts();

	/* eslint-disable no-console */
	console.log(`development  http://localhost:${port}`);
	console.log(`tests        http://localhost:${testsPort}`);
	/* eslint-enable no-console */
}
