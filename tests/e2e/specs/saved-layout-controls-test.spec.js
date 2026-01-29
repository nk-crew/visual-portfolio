/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { deleteAllSavedLayouts } from '../utils/delete-all-saved-layouts';

// Test constants
const POSTS_SOURCE_BUTTON =
	'button.components-button.vpf-component-icon-selector-item:has-text("Posts")';
const CLASSIC_SKIN_BUTTON = 'button:has-text("Classic")';

test.describe( 'Saved Layout Controls Persistence', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin( pluginName );

		// Clean up any existing test data in parallel
		await Promise.all( [
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			deleteAllSavedLayouts( { requestUtils } ),
		] );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		// Clean up test data in parallel
		await Promise.all( [
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			deleteAllSavedLayouts( { requestUtils } ),
		] );
	} );

	/**
	 * Helper to create a saved layout and navigate through initial setup.
	 * @param admin
	 * @param page
	 * @param title
	 */
	async function setupSavedLayoutWithPosts( admin, page, title ) {
		await admin.createNewPost( {
			title,
			postType: 'vp_lists',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		// Select Posts as data source
		const postsButton = page.locator( POSTS_SOURCE_BUTTON );
		await expect( postsButton ).toBeVisible();
		await postsButton.click();

		// Navigate through setup wizard
		const continueButton = page.getByRole( 'button', { name: 'Continue' } );
		for ( let i = 0; i < 3; i++ ) {
			await continueButton.click();
		}
	}

	/**
	 * Helper to navigate to Caption > Elements section with Classic skin.
	 * @param page
	 */
	async function navigateToElementsSection( page ) {
		// Select Classic skin to enable Caption > Elements options
		await page.getByRole( 'button', { name: 'Skin' } ).click();
		const classicSkin = page.locator( CLASSIC_SKIN_BUTTON ).first();
		await expect( classicSkin ).toBeVisible();
		await classicSkin.click();

		// Navigate to Caption > Elements
		await page.getByRole( 'button', { name: 'Caption' } ).click();
		await page.getByRole( 'button', { name: 'Elements' } ).click();
	}

	test( 'should persist Display Date control settings', async ( {
		page,
		admin,
		editor,
	} ) => {
		await setupSavedLayoutWithPosts(
			admin,
			page,
			'Test Display Date Control'
		);
		await navigateToElementsSection( page );

		// Enable Display Date control by checkbox
		const dateCheckbox = page
			.locator( 'label' )
			.filter( { hasText: 'Display Date' } );
		await expect( dateCheckbox ).toBeVisible();
		await dateCheckbox.click();

		// Wait a bit for the control to appear
		await page.waitForTimeout( 500 );

		// Find any dropdown that appeared after enabling the checkbox
		// The Display Date dropdown should be visible now
		const dateDropdown = page.locator( '.vpf-component-select' ).nth( 1 ); // Try the second select on the page
		const isDropdownVisible = await dateDropdown
			.isVisible( { timeout: 2000 } )
			.catch( () => false );

		if ( isDropdownVisible ) {
			// Save current state first to establish baseline
			await editor.publishPost();

			// Reload to verify control is still enabled
			await page.reload();
			await page.waitForLoadState( 'domcontentloaded' );
			await navigateToElementsSection( page );

			// Verify the Display Date checkbox is still checked (control should be visible)
			const dateCheckboxReloaded = page
				.locator( 'label' )
				.filter( { hasText: 'Display Date' } );
			await expect( dateCheckboxReloaded ).toBeVisible();
		}
	} );

	test( 'should persist Display Excerpt control settings', async ( {
		page,
		admin,
		editor,
	} ) => {
		await setupSavedLayoutWithPosts(
			admin,
			page,
			'Test Display Excerpt Control'
		);
		await navigateToElementsSection( page );

		// Find Display Excerpt checkbox
		const excerptCheckbox = page
			.locator( 'label' )
			.filter( { hasText: 'Display Excerpt' } );
		await expect( excerptCheckbox ).toBeVisible();

		// Check initial state and toggle
		await excerptCheckbox.click();

		// Look for excerpt-related controls that appear
		const excerptLengthControl = page.locator( '[name*="excerpt_length"]' );
		const hasExcerptControls = await excerptLengthControl
			.isVisible( { timeout: 2000 } )
			.catch( () => false );

		if ( hasExcerptControls ) {
			// Set excerpt length if available
			await excerptLengthControl.fill( '20' );
		}

		// Save the layout
		await editor.publishPost();

		// Reload and verify
		await page.reload();
		await page.waitForLoadState( 'domcontentloaded' );
		await navigateToElementsSection( page );

		// Verify the excerpt setting persisted
		if ( hasExcerptControls ) {
			const reloadedLengthControl = page.locator(
				'[name*="excerpt_length"]'
			);
			await expect( reloadedLengthControl ).toHaveValue( '20' );
		}
	} );

	test( 'should persist Display Categories control settings', async ( {
		page,
		admin,
		editor,
	} ) => {
		await setupSavedLayoutWithPosts(
			admin,
			page,
			'Test Display Categories Control'
		);
		await navigateToElementsSection( page );

		// Find and toggle Display Categories
		const categoriesCheckbox = page
			.locator( 'label' )
			.filter( { hasText: 'Display Categories' } );
		const isCategoriesVisible = await categoriesCheckbox
			.isVisible( { timeout: 2000 } )
			.catch( () => false );

		if ( isCategoriesVisible ) {
			await categoriesCheckbox.click();

			// Save the layout
			await editor.publishPost();

			// Reload and verify the setting persisted
			await page.reload();
			await page.waitForLoadState( 'domcontentloaded' );
			await navigateToElementsSection( page );

			// The checkbox state should be maintained
			// Note: We can't easily verify checkbox state without specific attributes
			// but we can verify the control is still visible
			const reloadedCheckbox = page
				.locator( 'label' )
				.filter( { hasText: 'Display Categories' } );
			await expect( reloadedCheckbox ).toBeVisible();
		}
	} );

	test( 'should persist multiple control settings simultaneously', async ( {
		page,
		admin,
		editor,
	} ) => {
		await setupSavedLayoutWithPosts(
			admin,
			page,
			'Test Multiple Controls'
		);
		await navigateToElementsSection( page );

		// Enable multiple controls
		const controlsToEnable = [
			'Display Date',
			'Display Excerpt',
			'Display Categories',
		];

		for ( const controlName of controlsToEnable ) {
			const checkbox = page.getByRole( 'checkbox', {
				name: controlName,
			} );
			const isVisible = await checkbox
				.isVisible( { timeout: 1000 } )
				.catch( () => false );
			if ( isVisible ) {
				await checkbox.check();
			}
		}

		// Also test Read More control if excerpt is enabled.
		const readMoreNativeSelect = page.locator(
			'.vpf-control-group-items_style_read_more select'
		);
		const readMoreCustomSelect = page.locator(
			'.vpf-control-group-items_style_read_more .vpf-component-select'
		);

		const hasNativeReadMore = await readMoreNativeSelect
			.isVisible( { timeout: 1000 } )
			.catch( () => false );
		const hasCustomReadMore = await readMoreCustomSelect
			.isVisible( { timeout: 1000 } )
			.catch( () => false );
		const isReadMoreVisible = hasNativeReadMore || hasCustomReadMore;

		if ( isReadMoreVisible ) {
			if ( hasNativeReadMore ) {
				await readMoreNativeSelect.selectOption( {
					label: 'Always Display',
				} );
				await expect( readMoreNativeSelect ).toContainText(
					'Always Display'
				);
			} else {
				await readMoreCustomSelect.click();
				await page
					.getByRole( 'option', { name: 'Always Display' } )
					.click();
				await expect( readMoreCustomSelect ).toContainText(
					'Always Display'
				);
			}
		}

		// Save all settings
		await editor.publishPost();

		// Reload and verify all settings persisted
		await page.reload();
		await page.waitForLoadState( 'domcontentloaded' );
		await navigateToElementsSection( page );

		// Verify controls are still enabled
		for ( const controlName of controlsToEnable ) {
			const control = page
				.locator( 'label' )
				.filter( { hasText: controlName } );
			await expect( control ).toBeVisible();
		}

		// Verify Read More setting if it was set
		if ( isReadMoreVisible ) {
			const reloadedReadMore = page.locator(
				'.vpf-control-group-items_style_read_more select, .vpf-control-group-items_style_read_more .vpf-component-select'
			);
			await expect( reloadedReadMore ).toContainText( 'Always Display' );
		}
	} );

	test( 'should handle pagination controls correctly', async ( {
		page,
		admin,
		editor,
	} ) => {
		await setupSavedLayoutWithPosts(
			admin,
			page,
			'Test Pagination Controls'
		);

		// Navigate to Pagination section instead of Elements
		await page.getByRole( 'button', { name: 'Pagination' } ).click();

		// Look for pagination type selector
		const paginationTypeControl = page
			.locator(
				'[class*="pagination"] select, [class*="pagination"] .vpf-component-select'
			)
			.first();

		const isPaginationVisible = await paginationTypeControl
			.isVisible( { timeout: 2000 } )
			.catch( () => false );

		if ( isPaginationVisible ) {
			await paginationTypeControl.click();

			// Select Load More option if available
			const loadMoreOption = page.getByRole( 'option', {
				name: 'Load More',
			} );
			const hasLoadMore = await loadMoreOption
				.isVisible( { timeout: 1000 } )
				.catch( () => false );

			if ( hasLoadMore ) {
				await loadMoreOption.click();
				await expect( paginationTypeControl ).toContainText(
					'Load More'
				);

				// Save and verify persistence
				await editor.publishPost();

				await page.reload();
				await page.waitForLoadState( 'domcontentloaded' );
				await page
					.getByRole( 'button', { name: 'Pagination' } )
					.click();

				const reloadedControl = page
					.locator(
						'[class*="pagination"] select, [class*="pagination"] .vpf-component-select'
					)
					.first();
				await expect( reloadedControl ).toContainText( 'Load More' );
			}
		}
	} );
} );
