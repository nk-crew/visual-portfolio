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
					extensions: { foo: 'page' },
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

		const changeLayout = page
			.getByRole('toolbar', { name: 'Block tools' })
			.getByRole('button', { name: 'Change layout' });

		await expect(changeLayout).toBeVisible();

		// A gallery that is not synced has no Saved Layout panel; it syncs
		// from the block's menu.
		await expect(
			page.getByRole('button', { name: 'Saved Layout options' })
		).toHaveCount(0);
		await editor.clickBlockToolbarButton('Options');
		await page
			.getByRole('menuitem', { name: 'Sync with Saved Layout…' })
			.click();

		const dialog = page.getByRole('dialog', {
			name: 'Sync with Saved Layout',
		});

		await dialog
			.getByRole('combobox', { name: 'Saved Layout' })
			.selectOption(String(layoutId));
		await dialog.getByRole('button', { name: 'Sync' }).click();

		await expect(
			page.locator('.components-snackbar', {
				hasText:
					'Synced with “Synced Masonry”. 3 settings changed on this gallery stay.',
			})
		).toBeVisible();

		// A synced loop takes its items from the layout.
		await expect(changeLayout).toHaveCount(0);

		let state = await getLoopState(page);

		// The item blocks come from the layout, the changed settings stay.
		expect(state.items).toEqual([
			'visual-portfolio/item-image',
			'visual-portfolio/item-title',
			'visual-portfolio/item-date',
		]);
		expect(state.layoutType).toBe('masonry');
		expect(state.columns).toBe(2);
		expect(Object.values(state.savedLayout.overrides).flat()).toContain(
			'extensions.foo'
		);

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

		await expect(page.getByText('3 settings changed here')).toBeVisible();
		await page.getByRole('button', { name: 'Reset', exact: true }).click();
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
			.getByRole('button', { name: 'Saved Layout options' })
			.click();
		await page
			.getByRole('menuitem', { name: 'Detach from Saved Layout' })
			.click();

		state = await getLoopState(page);
		expect(state.savedLayout).toBeUndefined();
		await expect(changeLayout).toBeVisible();
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

	test('a paragraph typed on a synced page stays the page’s own when the layout changes', async ({
		admin,
		editor,
		page,
		requestUtils,
	}) => {
		const image = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);
		const layout = await requestUtils.rest({
			method: 'POST',
			path: `/wp/v2/vp_lists/${layoutId}`,
			data: {
				content: loopMarkup(
					{ queryType: 'images' },
					{ layoutType: 'masonry' },
					'<!-- wp:paragraph {"className":"layout-text"} --><p class="layout-text">Layout text</p><!-- /wp:paragraph -->'
				),
			},
		});
		const raw = (
			await requestUtils.rest({
				path: `/wp/v2/vp_lists/${layout.id}`,
				params: { context: 'edit' },
			})
		).content.raw;
		const textKey = raw.match(
			/wp:paragraph \{"className":"layout-text","metadata":\{"vpSyncKey":"([^"]+)"/
		)[1];
		const post = await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/pages',
			data: {
				title: 'Synced page with its own text',
				status: 'publish',
				content: raw.replace(
					'<!-- wp:visual-portfolio/loop {',
					`<!-- wp:visual-portfolio/loop {"savedLayout":{"id":${layoutId},"overrides":{}},"imagesQuery":{"images":[{"id":${image.id}}]},`
				),
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

		const getParagraph = () =>
			page.evaluate(() => {
				const find = (blocks) =>
					blocks.reduce(
						(found, block) =>
							found ||
							(block.name === 'core/paragraph'
								? block
								: find(block.innerBlocks)),
						null
					);
				const blocks = window.wp.data
					.select('core/block-editor')
					.getBlocks();
				const paragraph = find(blocks);

				return {
					content: String(paragraph?.attributes.content ?? ''),
					className: paragraph?.attributes.className,
					overrides: blocks[0].attributes.savedLayout.overrides,
				};
			});

		const text = editor.canvas
			.locator('p.layout-text', { hasText: 'Layout text' })
			.first();

		await text.click();
		await page.keyboard.press('End');
		await page.keyboard.type(' on the page');

		await expect.poll(getParagraph).toEqual({
			content: 'Layout text on the page',
			className: 'layout-text',
			overrides: { [textKey]: ['content'] },
		});

		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(
			page.locator('.components-snackbar', { hasText: /updated/ })
		).toBeVisible();

		await requestUtils.rest({
			method: 'POST',
			path: `/wp/v2/vp_lists/${layoutId}`,
			data: {
				content: raw
					.replaceAll('layout-text', 'layout-new')
					.replace(
						'"className":"layout-new",',
						'"className":"layout-new","style":{"elements":{"link":{"color":{"text":"#ff0000"}}}},'
					),
			},
		});

		await page.goto(post.link);
		const front = page.locator(
			'.wp-block-visual-portfolio-item-template p'
		);

		await expect(front.first()).toHaveText('Layout text on the page');
		await expect(front.first()).toHaveClass(/layout-text/);
		await expect(front.first()).not.toHaveClass(/wp-elements-/);
		await expect(page.locator('.layout-new')).toHaveCount(0);

		await admin.visitAdminPage('post.php', `post=${post.id}&action=edit`);
		await expect.poll(getParagraph).toEqual({
			content: 'Layout text on the page',
			className: 'layout-text',
			overrides: { [textKey]: ['content'] },
		});
		await page.waitForTimeout(1500);
		expect((await getParagraph()).className).toBe('layout-text');
	});

	test('a key of `extensions` is changed and reset on its own', async ({
		admin,
		page,
		requestUtils,
	}) => {
		await requestUtils.rest({
			method: 'POST',
			path: `/wp/v2/vp_lists/${layoutId}`,
			data: {
				content: loopMarkup(
					{ queryType: 'posts' },
					{
						layoutType: 'carousel',
						carouselAutoplay: true,
						extensions: { foo: 'layout', marquee: { speed: 1 } },
					}
				),
			},
		});
		const raw = (
			await requestUtils.rest({
				path: `/wp/v2/vp_lists/${layoutId}`,
				params: { context: 'edit' },
			})
		).content.raw;
		const key = raw.match(
			/wp:visual-portfolio\/item-template \{[^\n]*?"vpSyncKey":"([^"]+)"/
		)[1];

		await admin.createNewPost({ title: 'Synced page with extensions' });

		const open = async (overrides, extensions) => {
			await page.evaluate(
				(content) =>
					window.wp.data
						.dispatch('core/block-editor')
						.resetBlocks(window.wp.blocks.parse(content)),
				loopMarkup(
					{
						queryType: 'posts',
						savedLayout: { id: layoutId, overrides },
					},
					{
						metadata: { vpSyncKey: key },
						layoutType: 'carousel',
						carouselAutoplay: true,
						extensions,
					}
				)
			);
			await page.evaluate(() => {
				const { select, dispatch } = window.wp.data;
				const loop = select('core/block-editor').getBlocks()[0];

				dispatch('core/block-editor').selectBlock(
					loop.innerBlocks[0].clientId
				);
			});
		};
		const getState = () =>
			page.evaluate(() => {
				const loop = window.wp.data
					.select('core/block-editor')
					.getBlocks()[0];
				const template = loop.innerBlocks[0];

				return {
					overrides: loop.attributes.savedLayout.overrides,
					extensions: template.attributes.extensions,
					autoplay: template.attributes.carouselAutoplay,
				};
			});
		const autoplay = page
			.locator('.components-tools-panel-item')
			.filter({ hasText: 'Pauses while the visitor' });
		const marks = page.getByText('Changed on this gallery');

		// A change to one key records that key alone; the others stay as
		// they were.
		await open(
			{ [key]: ['extensions.foo'] },
			{ foo: 'page', marquee: { speed: 1 } }
		);
		await expect
			.poll(async () => (await getState()).extensions)
			.toEqual({
				foo: 'page',
				marquee: { speed: 1 },
			});
		await expect(marks).toHaveCount(0);
		await autoplay
			.getByRole('combobox', { name: 'Mode' })
			.selectOption('step');
		await expect.poll(getState).toEqual({
			overrides: { [key]: ['extensions.foo', 'extensions.marquee'] },
			extensions: { foo: 'page' },
			autoplay: true,
		});

		// The page cleared a key the layout sets; the setting that drops it
		// is marked, and its reset takes it back.
		await expect(
			autoplay.getByText('Changed on this gallery')
		).toBeVisible();
		await autoplay
			.getByRole('button', { name: 'Reset to Saved Layout' })
			.click();
		await expect.poll(getState).toEqual({
			overrides: { [key]: ['extensions.foo'] },
			extensions: { foo: 'page', marquee: { speed: 1 } },
			autoplay: true,
		});

		// The page cleared two keys; the reset of the setting that names one
		// takes back that key alone.
		await open({ [key]: ['extensions.foo', 'extensions.marquee'] }, {});
		await expect
			.poll(async () => (await getState()).extensions)
			.toEqual({});
		await expect(
			autoplay.getByText('Changed on this gallery')
		).toBeVisible();
		await expect(marks).toHaveCount(1);
		await autoplay
			.getByRole('button', { name: 'Reset to Saved Layout' })
			.click();
		await expect.poll(getState).toEqual({
			overrides: { [key]: ['extensions.foo'] },
			extensions: { marquee: { speed: 1 } },
			autoplay: true,
		});

		// The panel's Reset all takes a cleared key back too.
		await open({ [key]: ['extensions.marquee'] }, { foo: 'layout' });
		await page.getByRole('button', { name: 'Carousel options' }).click();
		await page.getByRole('menuitem', { name: 'Reset all' }).click();
		await expect.poll(getState).toEqual({
			overrides: {},
			extensions: { foo: 'layout', marquee: { speed: 1 } },
			autoplay: true,
		});

		// A changed key marks the setting that owns it, and its reset takes
		// that key back from the layout alone.
		await open(
			{ [key]: ['extensions.foo', 'extensions.marquee'] },
			{ foo: 'page', marquee: { speed: 2 } }
		);
		await expect(
			autoplay.getByText('Changed on this gallery')
		).toBeVisible();
		await expect(marks).toHaveCount(1);
		await autoplay
			.getByRole('button', { name: 'Reset to Saved Layout' })
			.click();
		await expect.poll(getState).toEqual({
			overrides: { [key]: ['extensions.foo'] },
			extensions: { foo: 'page', marquee: { speed: 1 } },
			autoplay: true,
		});
		await expect(marks).toHaveCount(0);

		// A whole `extensions` stored before keeps its meaning: it marks the
		// setting, and the reset takes the layout's object.
		await open(
			{ [key]: ['extensions'] },
			{ foo: 'page', marquee: { speed: 2 } }
		);
		await expect(
			autoplay.getByText('Changed on this gallery')
		).toBeVisible();
		await autoplay
			.getByRole('button', { name: 'Reset to Saved Layout' })
			.click();
		await expect.poll(getState).toEqual({
			overrides: {},
			extensions: { foo: 'layout', marquee: { speed: 1 } },
			autoplay: true,
		});
	});

	test('an extension’s settings in `extensions` are marked one by one', async ({
		admin,
		page,
		requestUtils,
	}) => {
		const image = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);

		await requestUtils.rest({
			method: 'POST',
			path: `/wp/v2/vp_lists/${layoutId}`,
			data: {
				content: loopMarkup(
					{ queryType: 'images' },
					{ layoutType: 'masonry' },
					'<!-- wp:visual-portfolio/item-image {"extensions":{"testFilter":"layout","testTilt":"layout","testBlend":"layout"}} /-->'
				),
			},
		});
		const raw = (
			await requestUtils.rest({
				path: `/wp/v2/vp_lists/${layoutId}`,
				params: { context: 'edit' },
			})
		).content.raw;
		const templateKey = raw.match(
			/wp:visual-portfolio\/item-template \{[^\n]*?"vpSyncKey":"([^"]+)"/
		)[1];
		const imageKey = raw.match(
			/wp:visual-portfolio\/item-image \{[^\n]*?"vpSyncKey":"([^"]+)"/
		)[1];

		await admin.createNewPost({ title: 'Synced page with an extension' });

		// Settings of an extension, built on the plugin's own
		// `ToolsPanelItem`: two tell their key by what their reset writes, one
		// names it.
		await page.evaluate(() => {
			const { createElement } = window.wp.element;
			const { ToolsPanelItem } = window.wp.data
				.select('visual-portfolio/components')
				.get();
			const item =
				(name, label, attributeKeys) =>
				({ attributes, setAttributes, clientId }) =>
					createElement(
						ToolsPanelItem,
						{
							label,
							panelId: clientId,
							attributeKeys,
							hasValue: () => !!attributes.extensions?.[name],
							onDeselect: () => {
								const { [name]: previous, ...others } =
									attributes.extensions || {};

								setAttributes({ extensions: others });
							},
							resetAllFilter: (values) => {
								const { [name]: previous, ...others } =
									values.extensions ||
									attributes.extensions ||
									{};

								return { extensions: others };
							},
						},
						createElement('p', null, `${label} control`)
					);

			window.wp.hooks.addFilter(
				'vpf.itemImageSettingsItems',
				'vpf-e2e/extension-items',
				(items) => [
					...items,
					{
						name: 'testFilter',
						Item: item('testFilter', 'Test filter'),
					},
					{
						name: 'testTilt',
						Item: item('testTilt', 'Test tilt', [
							'extensions.testTilt',
						]),
					},
					{
						name: 'testBlend',
						Item: item('testBlend', 'Test blend'),
					},
				]
			);
		});
		const open = (overrides, extensions) =>
			page.evaluate(
				(content) =>
					window.wp.data
						.dispatch('core/block-editor')
						.resetBlocks(window.wp.blocks.parse(content)),
				loopMarkup(
					{
						queryType: 'images',
						imagesQuery: { images: [{ id: image.id }] },
						savedLayout: {
							id: layoutId,
							overrides: { [imageKey]: overrides },
						},
					},
					{
						metadata: { vpSyncKey: templateKey },
						layoutType: 'masonry',
					},
					`<!-- wp:visual-portfolio/item-image ${JSON.stringify({ metadata: { vpSyncKey: imageKey }, extensions })} /-->`
				)
			);

		await open(
			[
				'extensions.testFilter',
				'extensions.testTilt',
				'extensions.testBlend',
			],
			{ testFilter: 'page' }
		);

		const getImage = () =>
			page.evaluate(() => {
				const { getBlocks } =
					window.wp.data.select('core/block-editor');
				const loop = getBlocks()[0];
				const image = loop.innerBlocks[0].innerBlocks[0];

				return {
					clientId: image.clientId,
					overrides: loop.attributes.savedLayout.overrides,
					extensions: image.attributes.extensions,
				};
			});

		// The page cleared the tilt and the blend the layout sets.
		await expect
			.poll(async () => (await getImage()).extensions)
			.toEqual({
				testFilter: 'page',
			});
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			(await getImage()).clientId
		);

		const filterItem = page
			.locator('.components-tools-panel-item')
			.filter({ hasText: 'Test filter control' });
		const tiltItem = page
			.locator('.components-tools-panel-item')
			.filter({ hasText: 'Test tilt control' });
		const blendItem = page
			.locator('.components-tools-panel-item')
			.filter({ hasText: 'Test blend control' });

		await expect(
			filterItem.getByText('Changed on this gallery')
		).toBeVisible();
		await expect(
			tiltItem.getByText('Changed on this gallery')
		).toBeVisible();
		await expect(
			blendItem.getByText('Changed on this gallery')
		).toBeVisible();

		await tiltItem
			.getByRole('button', { name: 'Reset to Saved Layout' })
			.click();
		await expect.poll(getImage).toMatchObject({
			overrides: {
				[imageKey]: ['extensions.testFilter', 'extensions.testBlend'],
			},
			extensions: { testFilter: 'page', testTilt: 'layout' },
		});
		await expect(tiltItem.getByText('Changed on this gallery')).toHaveCount(
			0
		);
		await expect(
			blendItem.getByText('Changed on this gallery')
		).toBeVisible();

		await blendItem
			.getByRole('button', { name: 'Reset to Saved Layout' })
			.click();
		await expect.poll(getImage).toMatchObject({
			overrides: { [imageKey]: ['extensions.testFilter'] },
			extensions: {
				testFilter: 'page',
				testTilt: 'layout',
				testBlend: 'layout',
			},
		});
		await expect(
			filterItem.getByText('Changed on this gallery')
		).toBeVisible();

		// Reset all takes back a key the page set and one it cleared.
		await open(['extensions.testFilter', 'extensions.testBlend'], {
			testFilter: 'page',
			testTilt: 'layout',
		});
		await expect
			.poll(async () => (await getImage()).extensions)
			.toEqual({ testFilter: 'page', testTilt: 'layout' });
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			(await getImage()).clientId
		);
		await page.getByRole('button', { name: 'Settings options' }).click();
		await page.getByRole('menuitem', { name: 'Reset all' }).click();
		await expect.poll(getImage).toMatchObject({
			overrides: {},
			extensions: {
				testFilter: 'layout',
				testTilt: 'layout',
				testBlend: 'layout',
			},
		});
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
