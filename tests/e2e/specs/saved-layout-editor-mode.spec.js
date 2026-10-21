/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { deleteAllSavedLayouts } from '../utils/delete-all-saved-layouts';
import { getEditorCanvas } from '../utils/editor-canvas';
import { getPluginSlug } from '../utils/plugin-slug';

const POSTS_SOURCE_BUTTON =
	'button.components-button.vpf-component-icon-selector-item:has-text("Posts")';

test.describe('Saved layout editor mode', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
		await deleteAllSavedLayouts({ requestUtils });
	});

	test.afterAll(async ({ requestUtils }) => {
		await deleteAllSavedLayouts({ requestUtils });
	});

	/**
	 * Create a saved layout and finish the setup wizard.
	 *
	 * @param {Object} admin  WordPress admin helpers.
	 * @param {Object} page   Playwright page object.
	 * @param {Object} editor Gutenberg editor helpers.
	 * @param {string} title  Layout title.
	 */
	async function setupSavedLayout(admin, page, editor, title) {
		await admin.createNewPost({
			title,
			postType: 'vp_lists',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const canvas = getEditorCanvas(page, editor);
		const postsButton = canvas.locator(POSTS_SOURCE_BUTTON);
		await expect(postsButton).toBeVisible();
		await postsButton.click();

		const continueButton = canvas.getByRole('button', {
			name: 'Continue',
		});
		for (let i = 0; i < 3; i++) {
			await continueButton.click();
		}

		await expect(
			page.getByRole('button', { name: 'Custom CSS' })
		).toBeVisible();
	}

	test('switches the saved layout editor back to visual mode', async ({
		page,
		admin,
		editor,
	}) => {
		const deprecations = [];
		page.on('console', (message) => {
			if (message.text().includes("'core/edit-post' )")) {
				deprecations.push(message.text());
			}
		});

		await setupSavedLayout(admin, page, editor, 'Visual Mode Only');

		await page.evaluate(() =>
			window.wp.data.dispatch('core/editor').switchEditorMode('text')
		);

		await expect
			.poll(() =>
				page.evaluate(() =>
					window.wp.data.select('core/editor').getEditorMode()
				)
			)
			.toBe('visual');
		expect(deprecations).toEqual([]);
	});
});
