/**
 * Plugin slug for `@wordpress/e2e-test-utils-playwright` activatePlugin().
 * Derived from Plugin Name via paramCase (not the WordPress.org directory slug).
 *
 * @return {string} Plugin slug.
 */
export function getPluginSlug() {
	return process.env.CORE ? 'visual-portfolio-pro' : 'visual-portfolio';
}
