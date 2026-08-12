/**
 * Some WordPress admin flows open "View Page" in a new tab.
 * This helper returns the correct frontend Playwright Page for assertions.
 *
 * @param {import('@playwright/test').Page} page                    Current Playwright page.
 * @param {Object}                          [options]               Optional settings.
 * @param {number}                          [options.timeout=15000] Maximum wait time for popup or frontend navigation.
 * @return {Promise<import('@playwright/test').Page>}              Frontend page for assertions.
 */
export async function openPublishedPage(page, options = {}) {
	const { timeout = 15000 } = options;

	const viewButton = page
		.locator('.components-button', { hasText: 'View Page' })
		.first();

	const popupPromise = page
		.waitForEvent('popup', { timeout })
		.catch(() => null);
	const frontendNavigationPromise = page
		.waitForURL((url) => !url.pathname.includes('/wp-admin/'), {
			timeout,
			waitUntil: 'domcontentloaded',
		})
		.catch(() => null);

	// The post-publish snackbar dismisses itself, so the button can be gone
	// between being seen and being clicked. Treat a failed click as "not there"
	// rather than checking first and racing the animation.
	const clicked = await viewButton
		.click({ timeout: 5000 })
		.then(() => true)
		.catch(() => false);

	if (!clicked) {
		const permalink = await page.evaluate(
			() => window.wp?.data?.select('core/editor')?.getPermalink() || ''
		);

		if (!permalink) {
			throw new Error(
				'Could not find the published page: no "View Page" button and no permalink.'
			);
		}

		await page.goto(permalink, { waitUntil: 'domcontentloaded' });

		return page;
	}

	const popup = await Promise.race([
		popupPromise,
		frontendNavigationPromise.then(() => null),
	]);

	const frontendPage = popup || page;
	await frontendPage.waitForLoadState('domcontentloaded');
	return frontendPage;
}
