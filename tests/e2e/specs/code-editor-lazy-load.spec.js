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
const CODE_EDITOR_CHUNK = /\/build\/gutenberg\/code-editor\.js/;

test.describe('Code editor control assets', () => {
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

	test('loads Ace only when the Custom CSS control opens', async ({
		page,
		admin,
		editor,
	}) => {
		const chunkRequests = [];
		page.on('request', (request) => {
			if (CODE_EDITOR_CHUNK.test(request.url())) {
				chunkRequests.push(request.url());
			}
		});

		await setupSavedLayout(admin, page, editor, 'Lazy Code Editor');

		expect(chunkRequests).toEqual([]);

		await page.getByRole('button', { name: 'Custom CSS' }).click();

		const aceEditor = page.locator('.vpf-component-code-editor.ace_editor');
		await expect(aceEditor).toBeVisible();
		await expect(aceEditor).toContainText('selector');
		expect(chunkRequests).toHaveLength(1);
	});
});
