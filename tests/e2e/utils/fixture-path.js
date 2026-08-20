/**
 * Path of a test fixture, from wherever the suite is being run.
 *
 * Playwright resolves an upload path against the working directory, and this
 * suite has two of those. It runs here, and it runs inside the Pro plugin,
 * which holds this one as the `core-plugin` submodule - both as its own "Free
 * plugin" leg and through the utils its own specs import from here. So the
 * same literal path finds the file in one place and nothing in the other.
 *
 * Which of the two it is comes from `CORE` for the free leg, and from the
 * caller for a Pro spec that reached this code through a shared util.
 *
 * @param {string}  name      - file name inside `tests/fixtures/`.
 * @param {boolean} usedInPro - true when the caller knows it is running in Pro.
 * @return {string} path to upload.
 */
export function getFixturePath(name, usedInPro = false) {
	const base =
		process.env.CORE || usedInPro
			? 'core-plugin/tests/fixtures/'
			: 'tests/fixtures/';

	return `${base}${name}`;
}
