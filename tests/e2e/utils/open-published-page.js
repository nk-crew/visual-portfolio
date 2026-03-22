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
		.waitForURL(
			(url) => !url.pathname.includes('/wp-admin/'),
			{
				timeout,
				waitUntil: 'domcontentloaded',
			}
		)
		.catch(() => null);

	await viewButton.click();

	const popup = await Promise.race([
		popupPromise,
		frontendNavigationPromise.then(() => null),
	]);

	const frontendPage = popup || page;
	await frontendPage.waitForLoadState('domcontentloaded');
	return frontendPage;
}
