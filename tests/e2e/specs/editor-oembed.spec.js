import { expect, test } from '@wordpress/e2e-test-utils-playwright';

const OLD_URL = 'https://example.org/old-video';
const NEW_URL = 'https://example.org/new-video';

function isEmbedRequest(request, url) {
	const fields = new URLSearchParams(request.postData() || '');
	return fields.get('action') === 'vp_find_oembed' && fields.get('q') === url;
}

test('replacing a Video URL cancels the previous preview request', async ({
	admin,
	editor,
	page,
}) => {
	await page.route(
		/\/wp-includes\/js\/dist\/vendor\/react(?:-dom|-jsx-runtime)?\.min\.js(?:\?|$)/,
		async (route) => {
			const response = await route.fetch({
				url: route.request().url().replace('.min.js', '.js'),
			});
			await route.fulfill({ response });
		}
	);
	await admin.createNewPost({ postType: 'post', showWelcomeGuide: false });
	await editor.openDocumentSettingsSidebar();
	await page.evaluate(() =>
		window.wp.data.dispatch('core/editor').editPost({ format: 'video' })
	);

	const field = page.getByLabel('Video URL');
	const panel = page.locator('.vpf-meta-video-panel');
	if (!(await field.isVisible())) {
		await panel.getByRole('button', { name: 'Video' }).click();
	}

	await page.route('**/wp-admin/admin-ajax.php', async (route) => {
		if (isEmbedRequest(route.request(), OLD_URL)) {
			return;
		}
		if (isEmbedRequest(route.request(), NEW_URL)) {
			await route.fulfill({
				json: { html: '<p>New video preview</p>' },
			});
			return;
		}
		await route.fallback();
	});

	const started = page.waitForRequest((request) =>
		isEmbedRequest(request, OLD_URL)
	);
	await field.fill(OLD_URL);
	const previous = await started;

	await field.fill(NEW_URL);
	await expect(panel.getByText('New video preview')).toBeVisible();
	await expect.poll(() => previous.failure()?.errorText).toBeTruthy();

	await field.fill('');
	await expect(panel.locator('.vp-oembed-preview')).toBeEmpty();
});
