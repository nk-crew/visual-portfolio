/**
 * Open the editor of a new legacy Saved Layout.
 *
 * A new Saved Layout is built from Gallery Loop blocks unless its link asks
 * for the legacy settings editor.
 *
 * @param {Object} admin       WordPress admin helpers.
 * @param {Object} editor      Gutenberg editor helpers.
 * @param {Object} options
 * @param {string} options.title Layout title.
 */
export async function createLegacySavedLayout(admin, editor, { title } = {}) {
	const query = new URLSearchParams({
		post_type: 'vp_lists',
		vp_layout: 'legacy',
	});

	if (title) {
		query.set('post_title', title);
	}

	await admin.visitAdminPage('post-new.php', query.toString());
	await editor.setPreferences('core/edit-post', {
		welcomeGuide: false,
		fullscreenMode: false,
	});
}
