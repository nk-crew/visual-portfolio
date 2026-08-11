/**
 * Security test: LFI Path Traversal vulnerability.
 *
 * Tests that the preview frame endpoint rejects path traversal
 * sequences in template-related parameters (items_style, filter, sort, pagination_style).
 *
 * Vulnerability: CVSS 7.5 - Local File Inclusion via path traversal
 * Attack vector: POST to /?vp_preview=vp_preview&vp_preview_nonce=<nonce>
 *   with vp_items_style=../../../../../../wp-includes
 *
 * @package
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getPluginSlug } from '../utils/plugin-slug';

test.describe('security: LFI path traversal', () => {
	let nonce;

	test.beforeAll(async ({ requestUtils }) => {
		const pluginName = getPluginSlug();
		await requestUtils.activatePlugin(pluginName);
	});

	/**
	 * Reads the preview nonce, loading wp-admin once for the whole file.
	 *
	 * This was a `beforeEach`, so every test paid a full wp-admin page load to
	 * read one string, while none of them touch the browser otherwise. The
	 * nonce is `wp_create_nonce( 'vp-ajax-nonce' )`, tied to the admin session
	 * and stable for far longer than a run.
	 *
	 * @param {Object} pg - Playwright page object.
	 * @return {string} The preview nonce.
	 */
	async function getNonce(pg) {
		if (nonce) {
			return nonce;
		}

		await pg.goto('/wp-admin/');

		// VPAdminVariables is localized on admin pages when the plugin is active.
		nonce = await pg.evaluate(() => {
			if (window.VPAdminVariables && window.VPAdminVariables.nonce) {
				return window.VPAdminVariables.nonce;
			}
			return null;
		});

		// Not a reason to skip. Every test used to open with
		// `test.skip( ! nonce )`, so a missing nonce silently dropped the whole
		// file and left the run green with no security coverage at all.
		if (!nonce) {
			throw new Error(
				'VPAdminVariables.nonce is not present on /wp-admin/. Without it the preview endpoint is never reached and these tests would assert nothing.'
			);
		}

		return nonce;
	}

	/**
	 * Posts to the preview endpoint.
	 *
	 * @param {Object} pg     - Playwright page object.
	 * @param {Object} fields - Form fields to send alongside the preview flag.
	 * @return {Object} Playwright response.
	 */
	async function previewRequest(pg, fields) {
		const previewNonce = await getNonce(pg);

		return pg.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${previewNonce}`,
			{
				form: {
					vp_preview_frame: 'true',
					...fields,
				},
			}
		);
	}

	/**
	 * Asserts the preview template actually rendered, then returns its body.
	 *
	 * Without this the whole file passes against code it never reached.
	 * `Visual_Portfolio_Preview::is_preview_check()` only sets
	 * `preview_enabled` when `wp_verify_nonce` succeeds, and `template_redirect`
	 * returns early otherwise -- so a stale or wrong nonce gets an ordinary
	 * front page, HTTP 200, with no fatal error and no traversal payload in it.
	 * Every "should not contain" assertion below is satisfied by that page.
	 *
	 * `vp-preview-wrapper` is emitted by `print_template()` on every rendered
	 * preview and appears nowhere else, so it distinguishes the two.
	 *
	 * @param {Object} response - Playwright response.
	 * @return {string} The response body.
	 */
	async function assertPreviewRendered(response) {
		const body = await response.text();

		expect(body).toContain('vp-preview-wrapper');

		return body;
	}

	test('preview frame rejects path traversal in vp_items_style', async ({
		page,
	}) => {
		const traversalPayload = '../../../../../../wp-includes';

		// Send the malicious preview request with path traversal in items_style.
		const response = await previewRequest(page, {
			vp_items_style: traversalPayload,
		});

		// The response should NOT be a 500 error (which indicates LFI triggered a fatal).
		expect(response.status()).not.toBe(500);

		const body = await assertPreviewRendered(response);

		// Should not contain WordPress critical error indicators.
		expect(body).not.toContain(
			'There has been a critical error on this website'
		);
		expect(body).not.toContain('Fatal error');

		// The traversal value should NOT appear in the rendered HTML output.
		// If it appears (e.g. in data-vp-items-style attribute), it was not sanitized.
		expect(body).not.toContain(traversalPayload);
	});

	test('preview frame rejects path traversal in vp_filter', async ({
		page,
	}) => {
		const traversalPayload = '../../../etc';

		const response = await previewRequest(page, {
			vp_filter: traversalPayload,
		});

		expect(response.status()).not.toBe(500);

		const body = await assertPreviewRendered(response);
		expect(body).not.toContain(
			'There has been a critical error on this website'
		);
		expect(body).not.toContain('Fatal error');

		// The traversal value should NOT appear in the rendered HTML output.
		expect(body).not.toContain(traversalPayload);
	});

	test('preview frame rejects path traversal in vp_sort', async ({
		page,
	}) => {
		const traversalPayload = '../../../etc';

		const response = await previewRequest(page, {
			vp_sort: traversalPayload,
		});

		expect(response.status()).not.toBe(500);

		const body = await assertPreviewRendered(response);
		expect(body).not.toContain(
			'There has been a critical error on this website'
		);
		expect(body).not.toContain('Fatal error');

		// The traversal value should NOT appear in the rendered HTML output.
		expect(body).not.toContain(traversalPayload);
	});

	test('preview frame rejects path traversal in vp_pagination_style', async ({
		page,
	}) => {
		const traversalPayload = '../../../etc';

		const response = await previewRequest(page, {
			vp_pagination_style: traversalPayload,
		});

		expect(response.status()).not.toBe(500);

		const body = await assertPreviewRendered(response);
		expect(body).not.toContain(
			'There has been a critical error on this website'
		);
		expect(body).not.toContain('Fatal error');

		// The traversal value should NOT appear in the rendered HTML output.
		expect(body).not.toContain(traversalPayload);
	});

	test('preview frame accepts valid items_style values', async ({ page }) => {
		// 'default' is a built-in items style that should always work.
		const response = await previewRequest(page, {
			vp_items_style: 'default',
		});

		// Valid value should not cause a 500 error.
		expect(response.status()).not.toBe(500);

		const body = await assertPreviewRendered(response);
		expect(body).not.toContain(
			'There has been a critical error on this website'
		);
		expect(body).not.toContain('Fatal error');
	});

	test('preview frame rejects deeply nested path traversal', async ({
		page,
	}) => {
		const traversalPayload =
			'../../../../../../../../../../../../etc/passwd';

		// A deeply nested traversal trying to reach system files.
		const response = await previewRequest(page, {
			vp_items_style: traversalPayload,
		});

		expect(response.status()).not.toBe(500);

		const body = await assertPreviewRendered(response);
		expect(body).not.toContain(
			'There has been a critical error on this website'
		);
		expect(body).not.toContain('Fatal error');
		expect(body).not.toContain('root:');

		// The traversal value should NOT appear in the rendered HTML output.
		expect(body).not.toContain(traversalPayload);
	});
});
