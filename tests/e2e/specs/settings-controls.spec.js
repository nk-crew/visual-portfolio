import { execFileSync } from 'node:child_process';
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

const settingsPath =
	'edit.php?post_type=portfolio&page=visual-portfolio-settings';

async function openTab(admin, page, section) {
	await admin.visitAdminPage(`${settingsPath}#${section}`);
	await expect(
		page.locator(`#${section} .vpf-settings-modern`)
	).toBeVisible();
	await expect(
		page.locator(`#${section} .vpf-settings-submit`)
	).toBeDisabled();
	return page.locator(`#${section} form`);
}

async function save(page, form) {
	const [response] = await Promise.all([
		page.waitForResponse(
			(result) =>
				result.url().endsWith('/wp-admin/options.php') &&
				result.request().method() === 'POST'
		),
		form.getByRole('button', { name: 'Save Changes' }).click(),
	]);
	expect(response.status()).toBe(302);
	await page.waitForLoadState('load');
}

test.describe('Contextual settings controls', () => {
	let original;
	let archivePageId;

	test.afterEach(async ({ page, requestUtils }) => {
		if (original) {
			const response = await page.request.post('/wp-admin/options.php', {
				form: original,
			});
			expect(response.ok()).toBe(true);
			original = undefined;
		}
		if (archivePageId) {
			await requestUtils.rest({
				path: `/wp/v2/pages/${archivePageId}`,
				params: { force: true },
				method: 'DELETE',
			});
			archivePageId = undefined;
		}
	});

	async function remember(form) {
		original = await form.evaluate((element) =>
			Object.fromEntries(new FormData(element))
		);
	}

	test('independent image sizes and hidden exclusions survive save and reload', async ({
		admin,
		page,
	}) => {
		let form = await openTab(admin, page, 'vp_images');
		await remember(form);
		await form
			.getByLabel('Lazy Loading', { exact: true })
			.selectOption('full');
		await form
			.getByLabel('Lazy Loading Excludes')
			.fill('a-very-long-image-name.webp\nhttps://example.com/hero.jpg');
		await form
			.locator('summary')
			.filter({ hasText: 'Image sizes' })
			.click();
		const sizes = {
			sm: '511',
			md: '822',
			lg: '1333',
			xl: '1944',
			sm_popup: '555',
			md_popup: '866',
			xl_popup: '1977',
		};
		for (const [name, value] of Object.entries(sizes)) {
			await form.locator(`.${name} input[type="number"]`).fill(value);
		}
		await form
			.locator('summary')
			.filter({ hasText: 'Image sizes' })
			.click();
		await form.getByLabel('Lazy Loading', { exact: true }).selectOption('');
		await expect(form.getByLabel('Lazy Loading Excludes')).toBeHidden();
		await save(page, form);
		form = await openTab(admin, page, 'vp_images');
		await form
			.getByLabel('Lazy Loading', { exact: true })
			.selectOption('full');
		await expect(form.getByLabel('Lazy Loading Excludes')).toHaveValue(
			'a-very-long-image-name.webp\nhttps://example.com/hero.jpg'
		);
		await form
			.locator('summary')
			.filter({ hasText: 'Image sizes' })
			.click();
		for (const [name, value] of Object.entries(sizes)) {
			await expect(
				form.locator(`.${name} input[type="number"]`)
			).toHaveValue(value);
		}
	});

	test('archive dependencies and numeric editing preserve pending values', async ({
		admin,
		page,
		requestUtils,
	}) => {
		const query = `archivecontent${Date.now()}`;
		const title = `Settings archive ${Date.now()} ${'long page name '.repeat(5)}${query}`;
		const displayTitle = `${title.slice(0, 49)}...`;
		const archive = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title,
				content: query,
				status: 'publish',
			},
		});
		archivePageId = archive.id;
		let form = await openTab(admin, page, 'vp_general');
		await remember(form);
		await form
			.locator('.portfolio_archive_page .select2-selection')
			.click();
		await page.locator('.select2-search__field').fill(query);
		await page
			.locator('.select2-results__option')
			.filter({ hasText: displayTitle })
			.click();
		await form.locator('.select2-selection__clear').click();
		await expect(
			form.locator('[name="vp_general[portfolio_archive_page]"]')
		).toHaveValue('');
		let failed = false;
		await page.route('**/admin-ajax.php?**', async (route) => {
			if (
				!failed &&
				route.request().url().includes('action=vp_get_pages_list')
			) {
				failed = true;
				await route.fulfill({
					status: 500,
					body: 'Page search failed',
				});
			} else {
				await route.continue();
			}
		});
		await page.locator('.select2-search__field').fill(query);
		await expect(page.locator('.select2-results__message')).toContainText(
			'could not be loaded'
		);
		await page.locator('.select2-search__field').fill('');
		await page.locator('.select2-search__field').fill(query);
		await page
			.locator('.select2-results__option')
			.filter({ hasText: displayTitle })
			.click();
		await page.unroute('**/admin-ajax.php?**');
		const count = form.getByLabel('Archive Page Items Per Page');
		await count.fill('');
		await count.pressSequentially('-1');
		await expect(count).toHaveValue('-1');
		await count.fill('10000');
		expect(await count.evaluate((input) => input.validity.valid)).toBe(
			false
		);
		page.once('dialog', (dialog) => dialog.accept());
		await form
			.getByRole('checkbox', { name: 'Register Portfolio Post Type' })
			.uncheck();
		await expect(count).toBeHidden();
		await form.getByRole('button', { name: 'Save Changes' }).click();
		await expect(count).toBeVisible();
		await expect(count).toBeFocused();
		await expect(count).toHaveValue('10000');
		await count.fill('13');
		await save(page, form);
		await admin.visitAdminPage(
			`admin.php?page=visual-portfolio-settings#vp_general`
		);
		form = page.locator('#vp_general form');
		await form
			.getByRole('checkbox', { name: 'Register Portfolio Post Type' })
			.check();
		await expect(
			form.getByLabel('Archive Page Items Per Page')
		).toHaveValue('13');
		await expect(
			form.locator('[name="vp_general[portfolio_archive_page]"]')
		).toHaveValue(String(archive.id));
		await page.setViewportSize({ width: 390, height: 844 });
		const width = await form
			.locator('.vpf-settings-modern')
			.evaluate((element) => ({
				client: element.clientWidth,
				scroll: element.scrollWidth,
			}));
		expect(width.scroll).toBeLessThanOrEqual(width.client);
	});

	test('engine switches and collapsed thumbnails preserve popup values through save', async ({
		admin,
		page,
	}) => {
		let form = await openTab(admin, page, 'vp_popup_gallery');
		await remember(form);
		const retained = {
			'vp_popup_gallery[deep_linking]': 'on',
			'vp_popup_gallery[deep_linking_url_to_share_images]': 'off',
			'vp_popup_gallery[thumbs_auto_start]': 'on',
			'vp_popup_gallery[thumbs_position]': 'horizontal',
			'vp_popup_gallery[album_lazy_load_threshold]': '37',
			'vp_popup_gallery[pages_iframe_custom_css]':
				'.vp-popup-iframe header { display: none; }',
		};
		await page.request.post('/wp-admin/options.php', {
			form: { ...original, ...retained },
		});
		await page.reload();
		form = await openTab(admin, page, 'vp_popup_gallery');
		await form
			.getByRole('checkbox', { name: 'Display Download Button' })
			.check();
		await form
			.locator('summary')
			.filter({ hasText: 'Thumbnails and slideshow' })
			.click();
		await form
			.getByRole('checkbox', { name: 'Display Thumbnails', exact: true })
			.uncheck();
		await expect(form.getByLabel('Thumbnails Position')).toBeHidden();
		await form.getByRole('checkbox', { name: 'Display Slideshow' }).check();
		await form.locator('summary').filter({ hasText: 'Advanced' }).click();
		await form.getByLabel('Vendor Script').selectOption('photoswipe');
		await expect(form.locator('[data-group="show_thumbs"]')).toBeHidden();
		await save(page, form);
		form = await openTab(admin, page, 'vp_popup_gallery');
		await expect(
			form.getByRole('checkbox', { name: 'Display Download Button' })
		).toBeChecked();
		await form.locator('summary').filter({ hasText: 'Advanced' }).click();
		await expect(form.getByLabel('Vendor Script')).toHaveValue(
			'photoswipe'
		);
		await form.getByLabel('Vendor Script').selectOption('fancybox');
		await form
			.locator('summary')
			.filter({ hasText: 'Thumbnails and slideshow' })
			.click();
		await expect(
			form.getByRole('checkbox', {
				name: 'Display Thumbnails',
				exact: true,
			})
		).not.toBeChecked();
		await expect(
			form.getByRole('checkbox', { name: 'Display Slideshow' })
		).toBeChecked();
		const submitted = await form.evaluate((element) =>
			Object.fromEntries(new FormData(element))
		);
		for (const [name, value] of Object.entries(retained)) {
			expect(submitted[name]).toBe(value);
		}
	});

	test('saving Free settings does not store an absent Pro default', async ({
		admin,
		page,
	}) => {
		let form = await openTab(admin, page, 'vp_general');
		test.skip(
			!!process.env.CORE ||
				(await page.evaluate(
					() =>
						!!window.VPGutenbergVariables?.pro ||
						!!window.VPSettingsControls.isPro
				)),
			'Free-only defaults contract.'
		);
		await remember(form);
		const withoutDefault = { ...original };
		delete withoutDefault['vp_general[ajax_caching]'];
		await page.request.post('/wp-admin/options.php', {
			form: withoutDefault,
		});
		await page.reload();
		form = await openTab(admin, page, 'vp_general');
		expect(
			await form.evaluate((element) =>
				new FormData(element).has('vp_general[ajax_caching]')
			)
		).toBe(false);
		await form
			.locator('summary')
			.filter({ hasText: 'Custom taxonomies' })
			.click();
		await form
			.getByLabel('Filter Taxonomies')
			.fill('preserve_absent_pro_default');
		await save(page, form);
		form = await openTab(admin, page, 'vp_general');
		expect(
			await form.evaluate((element) =>
				new FormData(element).has('vp_general[ajax_caching]')
			)
		).toBe(false);
		expect(
			await page.evaluate(() =>
				window.VPSettingsControls.storedFields.vp_general.includes(
					'ajax_caching'
				)
			)
		).toBe(false);
	});

	test('fractional image sizes stay invalid after blur and closed groups reveal errors', async ({
		admin,
		page,
	}) => {
		const form = await openTab(admin, page, 'vp_images');
		const disclosure = form.locator('details');
		await disclosure.locator('summary').click();
		const input = form.locator('.md input[type="number"]');
		const originalAttribute = await input.getAttribute('value');
		await input.fill('1.5');
		await input.blur();
		expect(await input.getAttribute('value')).toBe(originalAttribute);
		expect(
			await input.evaluate((element) => element.validity.stepMismatch)
		).toBe(true);
		await disclosure.locator('summary').click();
		await form.getByRole('button', { name: 'Save Changes' }).click();
		await expect(disclosure).toHaveAttribute('open', '');
		await expect(input).toBeFocused();
		await expect(input).toHaveValue('1.5');
	});

	test('extension rows, checkbox conditions and escaped labels survive save and reload', async ({
		admin,
		page,
	}) => {
		const pluginPath = process.env.CORE
			? 'visual-portfolio-pro/core-plugin'
			: 'visual-portfolio';
		const fixturePath = `wp-content/plugins/${pluginPath}/tests/plugins/vpf-test-carousel-effect/settings-fixture.php`;
		const loader = 'wp-content/mu-plugins/vpf-settings-fixture.php';
		const runPHP = (code) =>
			execFileSync('npm', [
				'run',
				'wp-env',
				'--',
				'run',
				'tests-cli',
				'php',
				'-r',
				code,
			]);
		runPHP(
			`if (!is_dir('wp-content/mu-plugins')) mkdir('wp-content/mu-plugins'); file_put_contents('${loader}', '<?php require ABSPATH . "${fixturePath}";');`
		);
		try {
			let form = await openTab(admin, page, 'vp_general');
			await remember(form);
			const toggle = form.getByRole('checkbox', {
				name: 'Register Portfolio Post Type',
			});
			await expect(toggle).toBeChecked();
			await expect(form.locator('.extension-custom-row')).toBeVisible();
			await expect(
				form.locator('.extension_pro_condition')
			).toBeVisible();
			await expect(
				page.locator('[type="checkbox"][name="vp_popup_gallery[loop]"]')
			).toBeChecked();
			for (const name of [
				'extension_text',
				'extension_callback',
				'extension_custom',
				'extension_direct',
			]) {
				const input =
					name === 'extension_text'
						? form.getByLabel('extension_text', { exact: true })
						: form.locator(`[name="vp_general[${name}]"]`);
				await input.fill(`${name}_saved`);
			}
			page.once('dialog', (dialog) => dialog.accept());
			await toggle.uncheck();
			for (const name of [
				'extension_text',
				'extension_callback',
				'extension_custom',
			]) {
				await expect(
					form.locator(
						name === 'extension_custom'
							? '.extension-custom-row'
							: `.${name}`
					)
				).toBeHidden();
			}
			await toggle.check();
			await expect(form.locator('.extension-custom-row')).toBeVisible();
			await save(page, form);
			form = await openTab(admin, page, 'vp_general');
			for (const name of [
				'extension_text',
				'extension_callback',
				'extension_custom',
				'extension_direct',
			]) {
				await expect(
					form.locator(`[name="vp_general[${name}]"]`)
				).toHaveValue(`${name}_saved`);
			}
			await openTab(admin, page, 'vp_images');
			const translated = page.getByLabel("L'image & loading", {
				exact: true,
			});
			await translated.selectOption('full');
			await expect(translated.locator('option:checked')).toHaveText(
				'Images & backgrounds'
			);
		} finally {
			runPHP(`unlink('${loader}');`);
		}
	});

	test('incoming target hashes activate their tab without enhancing legacy tabs', async ({
		admin,
		page,
	}) => {
		await openTab(admin, page, 'vp_general');
		await page.evaluate(() => {
			window.location.hash = 'vp_images';
		});
		await expect(page.locator('#vp_images')).toBeVisible();
		await page
			.getByRole('link', { name: 'Watermarks', exact: true })
			.click();
		await expect(page.locator('#vp_watermarks form')).toBeVisible();
		await expect(
			page.locator('#vp_watermarks .vpf-settings-modern')
		).toHaveCount(0);
	});
});
