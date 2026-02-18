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

test.describe( 'security: LFI path traversal', () => {
	let nonce;

	test.beforeAll( async ( { requestUtils } ) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin( pluginName );
	} );

	test.beforeEach( async ( { page } ) => {
		// Navigate to admin to get a valid nonce.
		await page.goto( '/wp-admin/' );

		// Extract the VP nonce from the admin page.
		nonce = await page.evaluate( () => {
			// VPAdminVariables is localized on admin pages when the plugin is active.
			if ( window.VPAdminVariables && window.VPAdminVariables.nonce ) {
				return window.VPAdminVariables.nonce;
			}
			return null;
		} );
	} );

	test( 'preview frame rejects path traversal in vp_items_style', async ( {
		page,
	} ) => {
		// Skip if nonce not available (plugin not fully loaded on admin page).
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const traversalPayload = '../../../../../../wp-includes';

		// Send the malicious preview request with path traversal in items_style.
		const response = await page.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
			{
				form: {
					vp_preview_frame: 'true',
					vp_items_style: traversalPayload,
				},
			}
		);

		// The response should NOT be a 500 error (which indicates LFI triggered a fatal).
		expect( response.status() ).not.toBe( 500 );

		const body = await response.text();

		// Should not contain WordPress critical error indicators.
		expect( body ).not.toContain(
			'There has been a critical error on this website'
		);
		expect( body ).not.toContain( 'Fatal error' );

		// The traversal value should NOT appear in the rendered HTML output.
		// If it appears (e.g. in data-vp-items-style attribute), it was not sanitized.
		expect( body ).not.toContain( traversalPayload );
	} );

	test( 'preview frame rejects path traversal in vp_filter', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const traversalPayload = '../../../etc';

		const response = await page.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
			{
				form: {
					vp_preview_frame: 'true',
					vp_filter: traversalPayload,
				},
			}
		);

		expect( response.status() ).not.toBe( 500 );

		const body = await response.text();
		expect( body ).not.toContain(
			'There has been a critical error on this website'
		);
		expect( body ).not.toContain( 'Fatal error' );

		// The traversal value should NOT appear in the rendered HTML output.
		expect( body ).not.toContain( traversalPayload );
	} );

	test( 'preview frame rejects path traversal in vp_sort', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const traversalPayload = '../../../etc';

		const response = await page.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
			{
				form: {
					vp_preview_frame: 'true',
					vp_sort: traversalPayload,
				},
			}
		);

		expect( response.status() ).not.toBe( 500 );

		const body = await response.text();
		expect( body ).not.toContain(
			'There has been a critical error on this website'
		);
		expect( body ).not.toContain( 'Fatal error' );

		// The traversal value should NOT appear in the rendered HTML output.
		expect( body ).not.toContain( traversalPayload );
	} );

	test( 'preview frame rejects path traversal in vp_pagination_style', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const traversalPayload = '../../../etc';

		const response = await page.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
			{
				form: {
					vp_preview_frame: 'true',
					vp_pagination_style: traversalPayload,
				},
			}
		);

		expect( response.status() ).not.toBe( 500 );

		const body = await response.text();
		expect( body ).not.toContain(
			'There has been a critical error on this website'
		);
		expect( body ).not.toContain( 'Fatal error' );

		// The traversal value should NOT appear in the rendered HTML output.
		expect( body ).not.toContain( traversalPayload );
	} );

	test( 'preview frame accepts valid items_style values', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		// 'default' is a built-in items style that should always work.
		const response = await page.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
			{
				form: {
					vp_preview_frame: 'true',
					vp_items_style: 'default',
				},
			}
		);

		// Valid value should not cause a 500 error.
		expect( response.status() ).not.toBe( 500 );

		const body = await response.text();
		expect( body ).not.toContain(
			'There has been a critical error on this website'
		);
		expect( body ).not.toContain( 'Fatal error' );
	} );

	test( 'preview frame rejects deeply nested path traversal', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const traversalPayload =
			'../../../../../../../../../../../../etc/passwd';

		// A deeply nested traversal trying to reach system files.
		const response = await page.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
			{
				form: {
					vp_preview_frame: 'true',
					vp_items_style: traversalPayload,
				},
			}
		);

		expect( response.status() ).not.toBe( 500 );

		const body = await response.text();
		expect( body ).not.toContain(
			'There has been a critical error on this website'
		);
		expect( body ).not.toContain( 'Fatal error' );
		expect( body ).not.toContain( 'root:' );

		// The traversal value should NOT appear in the rendered HTML output.
		expect( body ).not.toContain( traversalPayload );
	} );
} );
