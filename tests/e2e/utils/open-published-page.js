/**
 * Some WordPress admin flows open "View Page" in a new tab.
 * This helper returns the correct frontend Playwright Page for assertions.
 *
 * @param {import('@playwright/test').Page} page                   Current Playwright page.
 * @param {Object}                          [options]              Optional settings.
 * @param {number}                          [options.timeout=1500] Fallback wait (ms) if neither popup nor navigation is observed.
 * @return {Promise<import('@playwright/test').Page>}                Frontend page for assertions.
 */
export async function openPublishedPage(page, options = {}) {
	const { timeout = 1500 } = options;

	const viewButton = page
		.locator('.components-button', { hasText: 'View Page' })
		.first();

	const popupPromise = page.waitForEvent('popup').catch(() => null);
	const navigationPromise = page
		.waitForNavigation({ waitUntil: 'domcontentloaded' })
		.catch(() => null);

	await viewButton.click();

	const popup = await Promise.race([
		popupPromise,
		navigationPromise.then(() => null),
		page.waitForTimeout(timeout).then(() => null),
	]);

	const frontendPage = popup || page;
	await frontendPage.waitForLoadState('domcontentloaded');
	return frontendPage;
}
