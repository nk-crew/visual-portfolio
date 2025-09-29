/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { deleteAllSavedLayouts } from '../utils/delete-all-saved-layouts';

// Test constants
const READ_MORE_CONTROL_SELECTOR =
	'.vpf-control-group-items_style_read_more select, .vpf-control-group-items_style_read_more .vpf-component-select';
const POSTS_SOURCE_BUTTON =
	'button.components-button.vpf-component-icon-selector-item:has-text("Posts")';
const CLASSIC_SKIN_BUTTON = 'button:has-text("Classic")';

test.describe('Read More Control in Saved Layout Posts', () => {
	test.beforeAll(async ({ requestUtils }) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin(pluginName);

		// Clean up any existing test data in parallel
		await Promise.all([
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			deleteAllSavedLayouts({ requestUtils }),
		]);
	});

	test.afterAll(async ({ requestUtils }) => {
		// Clean up test data in parallel
		await Promise.all([
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			deleteAllSavedLayouts({ requestUtils }),
		]);
	});

	/**
	 * Helper to create a saved layout and navigate through initial setup.
	 *
	 * @param {Admin}  admin WordPress admin helpers
	 * @param {Page}   page  Playwright page object
	 * @param {string} title Layout title
	 */
	async function setupSavedLayoutWithPosts(admin, page, title) {
		await admin.createNewPost({
			title,
			postType: 'vp_lists',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// Select Posts as data source
		const postsButton = page.locator(POSTS_SOURCE_BUTTON);
		await expect(postsButton).toBeVisible();
		await postsButton.click();

		// Navigate through setup wizard
		const continueButton = page.getByRole('button', { name: 'Continue' });
		for (let i = 0; i < 3; i++) {
			await continueButton.click();
		}
	}

	/**
	 * Helper to navigate to Caption > Elements section with Classic skin.
	 *
	 * @param {Page} page Playwright page object
	 */
	async function navigateToElementsSection(page) {
		// Select Classic skin to enable Caption > Elements options
		await page.getByRole('button', { name: 'Skin' }).click();
		const classicSkin = page.locator(CLASSIC_SKIN_BUTTON).first();
		await expect(classicSkin).toBeVisible();
		await classicSkin.click();

		// Navigate to Caption > Elements
		await page.getByRole('button', { name: 'Caption' }).click();
		await page.getByRole('button', { name: 'Elements' }).click();
	}

	/**
	 * Helper to enable excerpt and get read more control.
	 *
	 * @param {Page} page Playwright page object
	 * @return {Locator} Read more control element
	 */
	async function enableExcerptAndGetControl(page) {
		const excerptLabel = page.getByText('Display Excerpt');
		await expect(excerptLabel).toBeVisible();
		await excerptLabel.click();

		const readMoreControl = page.locator(READ_MORE_CONTROL_SELECTOR);
		await expect(readMoreControl).toBeVisible();
		return readMoreControl;
	}

	test('should display and interact with read more control options', async ({
		page,
		admin,
		editor,
	}) => {
		await setupSavedLayoutWithPosts(admin, page, 'Test Read More Control');
		await navigateToElementsSection(page);

		// Enable excerpt and get control
		const readMoreControl = await enableExcerptAndGetControl(page);
		await readMoreControl.click();

		// Verify all three options are available
		const hideOption = page.getByRole('option', { name: 'Hide' });
		const alwaysDisplayOption = page.getByRole('option', {
			name: 'Always Display',
		});
		const moreTagOption = page.getByRole('option', { name: 'More tag' });

		await expect(hideOption).toBeVisible();
		await expect(alwaysDisplayOption).toBeVisible();
		await expect(moreTagOption).toBeVisible();

		// Select the Hide option
		await hideOption.click();
		await expect(readMoreControl).toContainText('Hide');

		// Publish to save changes
		await editor.publishPost();
		await expect(readMoreControl).toContainText('Hide');
	});

	test('should save and persist read more settings', async ({
		page,
		admin,
		editor,
	}) => {
		await setupSavedLayoutWithPosts(
			admin,
			page,
			'Test Read More Persistence'
		);
		await navigateToElementsSection(page);

		const readMoreControl = await enableExcerptAndGetControl(page);
		await readMoreControl.click();

		// Select Always Display option
		const alwaysDisplayOption = page.getByRole('option', {
			name: 'Always Display',
		});
		await alwaysDisplayOption.click();
		await expect(readMoreControl).toContainText('Always Display');

		// Publish the layout
		await editor.publishPost();
		await expect(readMoreControl).toContainText('Always Display');

		// Reload and verify persistence
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Navigate back to settings
		await navigateToElementsSection(page);
		const reloadedControl = page.locator(READ_MORE_CONTROL_SELECTOR);
		await expect(reloadedControl).toContainText('Always Display');
	});

	test('should switch between all read more options', async ({
		page,
		admin,
		editor,
	}) => {
		await setupSavedLayoutWithPosts(admin, page, 'Test Read More Options');
		await navigateToElementsSection(page);

		const readMoreControl = await enableExcerptAndGetControl(page);

		// Test all three options in sequence
		const testCases = [
			{ name: 'Hide', expected: 'Hide' },
			{ name: 'Always Display', expected: 'Always Display' },
			{ name: 'More tag', expected: 'More tag' },
		];

		for (const testCase of testCases) {
			await readMoreControl.click();
			const option = page.getByRole('option', { name: testCase.name });
			await expect(option).toBeVisible();
			await option.click();
			await expect(readMoreControl).toContainText(testCase.expected);
		}

		// Save with final option selected
		await editor.publishPost();
		await expect(readMoreControl).toContainText('More tag');
	});
});
