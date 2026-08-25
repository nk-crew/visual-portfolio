/**
 * Read the URL parameters a Gallery Loop navigates with.
 *
 * Every loop owns a set of them, named after the `queryId` the editor assigned
 * to that block (`vp-1-page`). The number is an editor detail no test should
 * depend on, so these look the parameters up by their role instead.
 */

/**
 * Pattern of one loop parameter.
 *
 * @param {string} role - `page`, `filter` or `sort`.
 * @return {RegExp} pattern matching the parameter name of any loop.
 */
export function getLoopParamPattern(role) {
	return new RegExp(`^vp-\\d+-${role}$`);
}

/**
 * Name and value of a loop parameter in the given URL.
 *
 * @param {string} url  - URL to read.
 * @param {string} role - `page`, `filter` or `sort`.
 * @return {Array} `[name, value]` pairs, one per loop that carries the role.
 */
export function getLoopParams(url, role) {
	const pattern = getLoopParamPattern(role);

	return [...new URL(url).searchParams.entries()].filter(([name]) =>
		pattern.test(name)
	);
}

/**
 * Value of the parameter of a single loop.
 *
 * @param {string} url  - URL to read.
 * @param {string} role - `page`, `filter` or `sort`.
 * @return {string|null} value, or null when no loop carries the role.
 */
export function getLoopParam(url, role) {
	const params = getLoopParams(url, role);

	return params.length ? params[0][1] : null;
}
