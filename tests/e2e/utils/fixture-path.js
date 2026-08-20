/**
 * Path of a test fixture, from wherever the suite is being run.
 *
 * The free suite runs in two places: here, and inside the Pro plugin, which
 * holds this one as the `core-plugin` submodule and runs these very specs as
 * its "Free plugin" leg. Playwright resolves an upload path against the
 * working directory, which is the plugin root in both cases - so the same
 * literal path finds the file in one and nothing in the other.
 *
 * @param {string} name - file name inside `tests/fixtures/`.
 * @return {string} path to upload.
 */
export function getFixturePath(name) {
	const base = process.env.CORE
		? 'core-plugin/tests/fixtures/'
		: 'tests/fixtures/';

	return `${base}${name}`;
}
