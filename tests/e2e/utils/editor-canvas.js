/**
 * Return the Gutenberg editor canvas frame locator.
 *
 * WordPress 6.9+ renders editor content inside the `editor-canvas` iframe,
 * while inspector panels and toolbars remain on the top-level page.
 *
 * @param {import('@playwright/test').Page} page   Playwright page object.
 * @param {Object}                          editor Gutenberg editor fixture.
 * @return {import('@playwright/test').FrameLocator} Editor canvas frame locator.
 */
export function getEditorCanvas( page, editor ) {
	return editor?.canvas || page.frameLocator( '[name="editor-canvas"]' );
}

/**
 * Return the Visual Portfolio preview iframe nested inside the editor canvas.
 *
 * @param {import('@playwright/test').Page} page   Playwright page object.
 * @param {Object}                          editor Gutenberg editor fixture.
 * @return {import('@playwright/test').FrameLocator} Preview frame locator.
 */
export function getPortfolioPreviewFrame( page, editor ) {
	return getEditorCanvas( page, editor ).frameLocator(
		'[title="vp-preview"]'
	);
}
