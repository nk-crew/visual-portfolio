import { expect } from '@wordpress/e2e-test-utils-playwright';

export const MEDIA_LIBRARY_ATTACHMENT_SELECTOR =
	'ul.attachments.ui-sortable.ui-sortable-disabled li.attachment[role="checkbox"]';

/**
 * Open the media library "Browse" tab and wait until attachments are rendered.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
export async function openMediaLibrary( page ) {
	await page
		.locator( 'button#menu-item-browse', {
			hasText: 'Media Library',
		} )
		.click();

	await expect(
		page.locator( MEDIA_LIBRARY_ATTACHMENT_SELECTOR ).first()
	).toBeVisible( {
		timeout: 15000,
	} );
}

/**
 * Select images by attachment ids in the media library modal.
 *
 * @param {import('@playwright/test').Page} page         - Playwright page.
 * @param {Array<number|string>}            imageIds     - Attachment ids to select.
 * @param {Object}                          [options={}] - Extra options.
 */
export async function selectMediaLibraryImages( page, imageIds, options = {} ) {
	const { afterSelect } = options;
	const normalizedIds = imageIds.map( ( imageId ) => String( imageId ) );

	for ( const imageId of normalizedIds ) {
		const attachment = page.locator(
			`${ MEDIA_LIBRARY_ATTACHMENT_SELECTOR }[data-id="${ imageId }"]`
		);

		await expect( attachment ).toHaveCount( 1, {
			timeout: 15000,
		} );

		if (
			! ( await attachment.evaluate( ( node ) =>
				node.classList.contains( 'selected' )
			) )
		) {
			await attachment.click();
		}

		await expect( attachment ).toHaveClass( /selected/ );

		if ( afterSelect ) {
			await afterSelect( {
				attachment,
				imageId,
			} );
		}
	}

	await expect( page.locator( 'li.attachment.selected' ) ).toHaveCount(
		normalizedIds.length
	);
}

/**
 * Confirm selected attachments in the media library modal.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
export async function confirmMediaLibrarySelection( page ) {
	const selectButton = page.locator(
		'button.button.media-button.media-button-select',
		{
			hasText: 'Select',
		}
	);

	await expect( selectButton ).toBeEnabled( {
		timeout: 15000,
	} );

	await selectButton.click();
}
