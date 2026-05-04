/* eslint-disable jsdoc/check-line-alignment */
import { expect } from '@wordpress/e2e-test-utils-playwright';

import { getPortfolioPreviewFrame } from './editor-canvas';

/**
 * Wait until the portfolio preview iframe renders at least one portfolio item.
 *
 * @param {import('@playwright/test').Page} page                    Playwright page.
 * @param {Object}                          [options]               Optional settings.
 * @param {Object}                          [options.editor]        Gutenberg editor fixture.
 * @param {string}                          [options.selector='.vp-portfolio__item-wrap'] Selector expected inside the preview.
 * @param {number}                          [options.timeout=15000] Maximum wait time.
 */
export async function waitForPortfolioPreview( page, options = {} ) {
	const {
		editor,
		selector = '.vp-portfolio__item-wrap',
		timeout = 15000,
	} = options;

	const previewFrame = getPortfolioPreviewFrame( page, editor );

	await expect( previewFrame.locator( selector ).first() ).toBeVisible( {
		timeout,
	} );
}
