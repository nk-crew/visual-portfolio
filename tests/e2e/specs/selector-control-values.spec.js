/**
 * E2E Tests: Selector Control Attribute Values Validation
 *
 * Tests that:
 * 1. Invalid/unknown selector values fall back to defaults in rendered output.
 * 2. String boolean option values ('true') work correctly (PR #208 fix).
 * 3. Selectors with dynamic value_callback accept arbitrary values.
 *
 * Uses the preview endpoint to test server-side rendering with specific attribute values.
 *
 * @package
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { createRegularPosts } from '../utils/create-posts';
import { deleteAllSavedLayouts } from '../utils/delete-all-saved-layouts';

/**
 * Base form data needed for every preview request.
 * The preview endpoint requires block_id to render items.
 */
const BASE_PREVIEW_FORM = {
	vp_preview_frame: 'true',
	vp_block_id: 'test-e2e-selector-validation',
	vp_content_source: 'post-based',
	vp_posts_source: 'post_types_set',
	'vp_post_types_set[]': 'post',
	vp_layout: 'grid',
	vp_items_style: 'default',
	vp_items_count: '6',
};

test.describe( 'selector control attribute values validation', () => {
	let nonce;

	test.beforeAll( async ( { requestUtils } ) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin( pluginName );

		// Create test posts so portfolio has content to render.
		await createRegularPosts( { requestUtils, count: 3 } );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await Promise.all( [
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
			deleteAllSavedLayouts( { requestUtils } ),
		] );
	} );

	test.beforeEach( async ( { page } ) => {
		// Navigate to admin to get a valid nonce.
		await page.goto( '/wp-admin/' );

		nonce = await page.evaluate( () => {
			if ( window.VPAdminVariables && window.VPAdminVariables.nonce ) {
				return window.VPAdminVariables.nonce;
			}
			return null;
		} );
	} );

	/**
	 * Helper to make a preview POST request.
	 *
	 * @param {Object} pg          - Playwright page object.
	 * @param {Object} extraFields - Additional form fields to merge with base.
	 * @return {Object} Response object.
	 */
	async function previewRequest( pg, extraFields = {} ) {
		return pg.request.post(
			`/?vp_preview=vp_preview&vp_preview_nonce=${ nonce }`,
			{
				form: {
					...BASE_PREVIEW_FORM,
					...extraFields,
				},
			}
		);
	}

	/**
	 * Common assertions for every preview response.
	 *
	 * @param {Object} response - Playwright response.
	 * @return {string} Response body text.
	 */
	async function assertNoError( response ) {
		expect( response.status() ).not.toBe( 500 );

		const body = await response.text();
		expect( body ).not.toContain(
			'There has been a critical error on this website'
		);
		expect( body ).not.toContain( 'Fatal error' );

		return body;
	}

	// =========================================================================
	// Test Case 1: Invalid selector values should fall back to defaults.
	// =========================================================================

	test( 'invalid posts_order_by value falls back to default in preview', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_posts_order_by: 'completely_invalid_value',
		} );

		const body = await assertNoError( response );

		// The invalid value should NOT appear in the rendered output.
		expect( body ).not.toContain( 'completely_invalid_value' );

		// Portfolio items should actually be rendered.
		expect( body ).toContain( 'vp-portfolio__item-wrap' );
	} );

	test( 'invalid items_style value falls back to default in preview', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_items_style: 'nonexistent_skin_style',
		} );

		const body = await assertNoError( response );

		// The invalid value should not appear in any data attribute or class name.
		expect( body ).not.toContain( 'nonexistent_skin_style' );
	} );

	test( 'invalid sort value falls back to default in preview', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_sort: 'invalid_sort_option',
		} );

		const body = await assertNoError( response );

		// The invalid sort value should not appear in output.
		expect( body ).not.toContain( 'invalid_sort_option' );
	} );

	test( 'valid selector values render items correctly in preview', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page );

		const body = await assertNoError( response );

		// Valid items_style "default" should produce rendered items.
		expect( body ).toContain( 'vp-portfolio__items-style-default' );
		expect( body ).toContain( 'vp-portfolio__item-wrap' );
	} );

	// =========================================================================
	// Test Case 2: String boolean option 'true' should work correctly.
	// PR #208 fix - show_date with value 'true' should display the date.
	// =========================================================================

	test( 'show_date with value true renders date in preview', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_items_style_default__show_date: 'true',
		} );

		const body = await assertNoError( response );

		// When show_date is 'true', dates should be rendered in the output.
		expect( body ).toContain( 'vp-portfolio__item-meta-date' );
	} );

	test( 'show_date with value false does not render date in preview', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_items_style_default__show_date: 'false',
		} );

		const body = await assertNoError( response );

		// When show_date is 'false', date should not be rendered.
		expect( body ).not.toContain( 'vp-portfolio__item-meta-date' );
	} );

	test( 'show_date with value human renders human format date in preview', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_items_style_default__show_date: 'human',
		} );

		const body = await assertNoError( response );

		// When show_date is 'human', dates should be rendered in human format.
		expect( body ).toContain( 'vp-portfolio__item-meta-date' );
		expect( body ).toContain( 'ago' );
	} );

	test( 'show_date with invalid value falls back to default (no date shown)', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_items_style_default__show_date: 'invalid_value',
		} );

		const body = await assertNoError( response );

		// Invalid show_date should fall back to default 'false',
		// meaning no dates should be rendered.
		expect( body ).not.toContain( 'vp-portfolio__item-meta-date' );

		// But items should still render.
		expect( body ).toContain( 'vp-portfolio__item-wrap' );
	} );

	test( 'show_read_more with value true renders read more button', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_items_style_default__show_read_more: 'true',
			vp_items_style_default__read_more_label: 'Read More',
			vp_items_style_default__show_excerpt: 'true',
		} );

		const body = await assertNoError( response );

		// When show_read_more is 'true', the read more element should be present.
		expect( body ).toContain( 'vp-portfolio__item-meta-read-more' );
	} );

	test( 'show_read_more with invalid value falls back to default (no button)', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		const response = await previewRequest( page, {
			vp_items_style_default__show_read_more: 'invalid_value',
		} );

		const body = await assertNoError( response );

		// Invalid show_read_more value should fall back to 'false',
		// meaning no read more button.
		expect( body ).not.toContain( 'vp-portfolio__item-meta-read-more' );
	} );

	// =========================================================================
	// Test Case 3: Selectors with dynamic value_callback accept arbitrary values.
	// =========================================================================

	test( 'dynamic callback selector (post_types_set) accepts arbitrary values', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		// post_types_set has a value_callback, so it should accept arbitrary values
		// without resetting or causing errors.
		const response = await previewRequest( page, {
			'vp_post_types_set[]': 'post',
		} );

		const body = await assertNoError( response );

		// The preview should render portfolio items with the post type.
		expect( body ).toContain( 'vp-portfolio__item-wrap' );
	} );

	test( 'dynamic callback selector does not break with custom post type value', async ( {
		page,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		// Even with a non-standard post type that may not exist,
		// the dynamic callback selector should not cause a fatal error.
		const response = await previewRequest( page, {
			'vp_post_types_set[]': 'custom_dynamic_type',
		} );

		await assertNoError( response );
	} );

	// =========================================================================
	// Test Case 4: Block rendering with invalid and valid values.
	// =========================================================================

	test( 'block with invalid selector value renders with default in published page', async ( {
		page,
		admin,
		editor,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		// Create a page with a VP block using an invalid posts_order_by.
		await admin.createNewPost( {
			title: 'Test Invalid Selector Value',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		await editor.insertBlock( {
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'post-based',
				posts_source: 'post_types_set',
				post_types_set: [ 'post' ],
				posts_order_by: 'totally_invalid_order',
				items_count: 3,
			},
		} );

		// Publish the page.
		await editor.publishPost();

		// Navigate to the frontend.
		const viewButton = page
			.locator( '.components-button', { hasText: 'View Page' } )
			.first();
		const popupPromise = page.waitForEvent( 'popup' ).catch( () => null );
		const navPromise = page
			.waitForNavigation( { waitUntil: 'domcontentloaded' } )
			.catch( () => null );
		await viewButton.click();
		const popup = await Promise.race( [
			popupPromise,
			navPromise.then( () => null ),
			page.waitForTimeout( 2000 ).then( () => null ),
		] );
		const frontendPage = popup || page;
		await frontendPage.waitForLoadState( 'domcontentloaded' );

		// The portfolio should render without errors.
		const portfolio = frontendPage.locator( '.vp-portfolio' );
		await expect( portfolio ).toBeVisible( { timeout: 15000 } );

		// The invalid order by value should not appear in any data attributes.
		const html = await frontendPage.content();
		expect( html ).not.toContain( 'totally_invalid_order' );
	} );

	test( 'block with valid true option for show_date renders date', async ( {
		page,
		admin,
		editor,
	} ) => {
		test.skip( ! nonce, 'VP nonce not available on admin page' );

		await admin.createNewPost( {
			title: 'Test Show Date True Option',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		await editor.insertBlock( {
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'post-based',
				posts_source: 'post_types_set',
				post_types_set: [ 'post' ],
				items_style: 'default',
				items_style_default__show_date: 'true',
				items_count: 3,
			},
		} );

		await editor.publishPost();

		// Navigate to the frontend.
		const viewButton = page
			.locator( '.components-button', { hasText: 'View Page' } )
			.first();
		const popupPromise = page.waitForEvent( 'popup' ).catch( () => null );
		const navPromise = page
			.waitForNavigation( { waitUntil: 'domcontentloaded' } )
			.catch( () => null );
		await viewButton.click();
		const popup = await Promise.race( [
			popupPromise,
			navPromise.then( () => null ),
			page.waitForTimeout( 2000 ).then( () => null ),
		] );
		const frontendPage = popup || page;
		await frontendPage.waitForLoadState( 'domcontentloaded' );

		// The portfolio should render with dates.
		const portfolio = frontendPage.locator( '.vp-portfolio' );
		await expect( portfolio ).toBeVisible( { timeout: 15000 } );

		// Date meta should be visible when show_date is 'true'.
		const dateMeta = frontendPage.locator(
			'.vp-portfolio__item-meta-date'
		);
		const dateCount = await dateMeta.count();
		expect( dateCount ).toBeGreaterThan( 0 );
	} );
} );
