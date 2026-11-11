/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { deleteAllSavedLayouts } from '../utils/delete-all-saved-layouts';
import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

/**
 * Serialized Gallery Loop.
 *
 * @param {Object} attributes Loop attributes.
 * @param {Object} template   Item template attributes.
 * @param {string} items      Serialized item blocks.
 * @return {string} Markup.
 */
function loopMarkup(
	attributes,
	template,
	items = '<!-- wp:visual-portfolio/item-image /--><!-- wp:visual-portfolio/item-title /--><!-- wp:visual-portfolio/item-date /-->'
) {
	return `<!-- wp:visual-portfolio/loop ${JSON.stringify(attributes)} --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template ${JSON.stringify(template)} -->${items}<!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->`;
}

/**
 * Attributes of the loop and its item template in the editor.
 *
 * @param {Object} page Playwright page.
 * @return {Promise<Object>} State.
 */
function getLoopState(page) {
	return page.evaluate(() => {
		const { getBlocks } = window.wp.data.select('core/block-editor');
		const loop = getBlocks().find(
			(block) => block.name === 'visual-portfolio/loop'
		);
		const template = loop.innerBlocks.find(
			(block) => block.name === 'visual-portfolio/item-template'
		);

		return {
			loopId: loop.clientId,
			templateId: template.clientId,
			savedLayout: loop.attributes.savedLayout,
			layoutType: template.attributes.layoutType,
			columns: template.attributes.layoutColumnCount,
			items: template.innerBlocks.map((block) => block.name),
		};
	});
}

test.describe('Saved Layouts synced with Gallery Loops', () => {
	let layoutId;

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
		await deleteAllSavedLayouts({ requestUtils });
	});

	test.beforeEach(async ({ requestUtils }) => {
		const layout = await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/vp_lists',
			data: {
				title: 'Synced Masonry',
				status: 'publish',
				content: loopMarkup(
					{ queryType: 'posts' },
					{
						layoutType: 'masonry',
						layoutColumnsMode: 'manual',
						layoutColumnCount: 4,
					}
				),
			},
		});

		layoutId = layout.id;
	});

	test.afterEach(async ({ requestUtils }) => {
		await deleteAllSavedLayouts({ requestUtils });
	});

	test('a new Saved Layout starts from a Gallery Loop, the legacy one from its editor', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('post-new.php', 'post_type=vp_lists');
		await expect
			.poll(() =>
				page.evaluate(() =>
					window.wp.data
						.select('core/block-editor')
						.getBlocks()
						.map((block) => block.name)
				)
			)
			.toEqual(['visual-portfolio/loop']);

		await admin.visitAdminPage(
			'post-new.php',
			'post_type=vp_lists&vp_layout=legacy'
		);
		await expect
			.poll(() =>
				page.evaluate(() =>
					window.wp.data
						.select('core/block-editor')
						.getBlocks()
						.map((block) => block.name)
				)
			)
			.toEqual(['visual-portfolio/saved-editor']);
	});

	test('a loop takes the layout, keeps its changes, resets and detaches', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({ title: 'Synced gallery page' });
		await page.evaluate(
			(content) =>
				window.wp.data
					.dispatch('core/block-editor')
					.resetBlocks(window.wp.blocks.parse(content)),
			loopMarkup(
				{ queryType: 'posts' },
				{
					layoutType: 'grid',
					layoutColumnsMode: 'manual',
					layoutColumnCount: 2,
				},
				'<!-- wp:visual-portfolio/item-title /-->'
			)
		);

		const { loopId } = await getLoopState(page);
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			loopId
		);

		await page
			.getByRole('combobox', { name: 'Sync settings with' })
			.selectOption(String(layoutId));

		await expect(
			page.locator('.components-snackbar', {
				hasText:
					'Synced with “Synced Masonry”. 2 settings changed on this gallery stay.',
			})
		).toBeVisible();

		let state = await getLoopState(page);

		// The item blocks come from the layout, the changed settings stay.
		expect(state.items).toEqual([
			'visual-portfolio/item-image',
			'visual-portfolio/item-title',
			'visual-portfolio/item-date',
		]);
		expect(state.layoutType).toBe('masonry');
		expect(state.columns).toBe(2);

		// Nothing can be added to a synced item template.
		expect(
			await page.evaluate(
				(id) =>
					window.wp.data
						.select('core/block-editor')
						.canInsertBlockType('visual-portfolio/item-date', id),
				state.templateId
			)
		).toBe(false);

		await page.getByRole('button', { name: 'Reset all' }).click();
		await expect
			.poll(async () => (await getLoopState(page)).columns)
			.toBe(4);

		state = await getLoopState(page);
		expect(state.layoutType).toBe('masonry');
		expect(state.savedLayout).toEqual({ id: layoutId, overrides: {} });

		// A change made on the synced gallery is recorded as its own.
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			state.templateId
		);
		await page.getByRole('spinbutton', { name: 'Columns' }).fill('5');
		await expect(
			page.getByText('Changed on this gallery').first()
		).toBeVisible();
		await expect
			.poll(async () =>
				Object.values(
					(await getLoopState(page)).savedLayout.overrides
				).flat()
			)
			.toContain('layoutColumnCount');

		// Detaching keeps what the gallery shows.
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			state.loopId
		);
		await page
			.getByRole('combobox', { name: 'Sync settings with' })
			.selectOption('');

		state = await getLoopState(page);
		expect(state.savedLayout).toBeUndefined();
		expect(state.layoutType).toBe('masonry');
		expect(state.columns).toBe(5);

		await editor.saveDraft();
	});

	test('a synced page keeps its own settings on item blocks when it opens', async ({
		admin,
		editor,
		page,
		requestUtils,
	}) => {
		const layout = await requestUtils.rest({
			path: `/wp/v2/vp_lists/${layoutId}`,
			params: { context: 'edit' },
		});
		const dateKey = layout.content.raw.match(
			/wp:visual-portfolio\/item-date \{"metadata":\{"vpSyncKey":"([^"]+)"/
		)[1];
		// The items have to render for the editor to mount their blocks.
		const image = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);
		const content = layout.content.raw
			.replace('"queryType":"posts"', '"queryType":"images"')
			.replace(
				'<!-- wp:visual-portfolio/loop {',
				`<!-- wp:visual-portfolio/loop {"savedLayout":{"id":${layoutId},"overrides":{"${dateKey}":["displayType"]}},"imagesQuery":{"images":[{"id":${image.id}}]},`
			)
			.replace(
				`{"metadata":{"vpSyncKey":"${dateKey}"}}`,
				`{"metadata":{"vpSyncKey":"${dateKey}"},"displayType":"modified"}`
			);
		const post = await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/pages',
			data: {
				title: 'Synced page with its own date',
				status: 'draft',
				content,
			},
		});

		await admin.visitAdminPage('post.php', `post=${post.id}&action=edit`);

		if (!page.url().includes('post.php')) {
			await admin.visitAdminPage(
				'post.php',
				`post=${post.id}&action=edit`
			);
		}

		await editor.setPreferences('core/edit-post', { welcomeGuide: false });

		const getDate = () =>
			page.evaluate(() => {
				const find = (blocks) =>
					blocks.reduce(
						(found, block) =>
							found ||
							(block.name === 'visual-portfolio/item-date'
								? block
								: find(block.innerBlocks)),
						null
					);

				return find(
					window.wp.data.select('core/block-editor').getBlocks()
				)?.attributes.displayType;
			});

		await expect.poll(getDate).toBe('modified');
		await page.waitForTimeout(1500);
		expect(await getDate()).toBe('modified');
	});

	test('the lock is saved with the layout', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.visitAdminPage('post.php', `post=${layoutId}&action=edit`);

		// The first admin page after activation is the welcome screen.
		if (!page.url().includes('post.php')) {
			await admin.visitAdminPage(
				'post.php',
				`post=${layoutId}&action=edit`
			);
		}

		await editor.setPreferences('core/edit-post', { welcomeGuide: false });
		await editor.openDocumentSettingsSidebar();

		const syncing = page.getByRole('button', { name: 'Syncing' });

		if ((await syncing.getAttribute('aria-expanded')) !== 'true') {
			await syncing.click();
		}

		await page
			.getByRole('checkbox', { name: 'Galleries can change settings' })
			.uncheck();
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(
			page.locator('.components-snackbar', { hasText: /updated|Saved/ })
		).toBeVisible();

		await page.reload();
		await editor.openDocumentSettingsSidebar();

		const syncingAgain = page.getByRole('button', { name: 'Syncing' });

		if ((await syncingAgain.getAttribute('aria-expanded')) !== 'true') {
			await syncingAgain.click();
		}

		await expect(
			page.getByRole('checkbox', {
				name: 'Galleries can change settings',
			})
		).not.toBeChecked();
	});

	test('the page renders the layout and a layout change reaches it', async ({
		page,
		requestUtils,
	}) => {
		const post = await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/pages',
			data: {
				title: 'Synced front page',
				status: 'publish',
				content: loopMarkup(
					{
						queryType: 'posts',
						savedLayout: { id: layoutId, overrides: {} },
					},
					{}
				),
			},
		});

		await page.goto(post.link);
		await expect(page.locator('[data-vp-layout]').first()).toHaveAttribute(
			'data-vp-layout',
			'masonry'
		);

		await requestUtils.rest({
			method: 'POST',
			path: `/wp/v2/vp_lists/${layoutId}`,
			data: {
				content: loopMarkup(
					{ queryType: 'posts' },
					{ layoutType: 'justified' }
				),
			},
		});

		await page.reload();
		await expect(page.locator('[data-vp-layout]').first()).toHaveAttribute(
			'data-vp-layout',
			'justified'
		);
	});
});
