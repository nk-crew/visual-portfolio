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
				path: `/wp/v2/pages/${archivePageId}?force=true`,
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
		const title = `Settings archive ${Date.now()}`;
		const archive = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title,
				status: 'publish',
			},
		});
		archivePageId = archive.id;
		let form = await openTab(admin, page, 'vp_general');
		await remember(form);
		const combo = form.getByRole('combobox', { name: 'Archive Page' });
		await combo.fill(title);
		await page.getByRole('option', { name: title, exact: true }).click();
		const count = form.getByLabel('Archive Page Items Per Page');
		await count.fill('');
		await count.pressSequentially('-1');
		await expect(count).toHaveValue('-1');
		await count.fill('10000');
		expect(await count.evaluate((input) => input.checkValidity())).toBe(
			false
		);
		await count.fill('13');
		page.once('dialog', (dialog) => dialog.accept());
		await form
			.getByRole('checkbox', { name: 'Register Portfolio Post Type' })
			.uncheck();
		await expect(count).toBeHidden();
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
		for (const [name, value] of Object.entries(retained)) {
			await expect(
				form.locator(`input[type="hidden"][name="${name}"]`)
			).toHaveValue(value);
		}
	});

	test('saving Free settings does not store an absent Pro default', async ({
		admin,
		page,
	}) => {
		let form = await openTab(admin, page, 'vp_general');
		await remember(form);
		const withoutDefault = { ...original };
		delete withoutDefault['vp_general[ajax_caching]'];
		await page.request.post('/wp-admin/options.php', {
			form: withoutDefault,
		});
		await page.reload();
		form = await openTab(admin, page, 'vp_general');
		await expect(
			form.locator('[name="vp_general[ajax_caching]"]')
		).toHaveCount(0);
		await form
			.locator('summary')
			.filter({ hasText: 'Custom taxonomies' })
			.click();
		await form
			.getByLabel('Filter Taxonomies')
			.fill('preserve_absent_pro_default');
		await save(page, form);
		form = await openTab(admin, page, 'vp_general');
		await expect(
			form.locator('[name="vp_general[ajax_caching]"]')
		).toHaveCount(0);
		expect(
			await page.evaluate(() =>
				window.VPSettingsControls.storedFields.vp_general.includes(
					'ajax_caching'
				)
			)
		).toBe(false);
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
		await expect(page.locator('#vp_watermarks .form-table')).toBeVisible();
		await expect(
			page.locator('#vp_watermarks .vpf-settings-modern')
		).toHaveCount(0);
	});
});
