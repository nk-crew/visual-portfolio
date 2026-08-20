/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

/**
 * Whether the block is being drawn as a picture of itself.
 *
 * A block preview - the pattern chooser, the inserter, the style previews -
 * renders a block with no user to serve: nothing there is clicked, paginated or
 * scrolled. Anything a block does asynchronously is therefore not only wasted
 * but harmful, because a preview is promoted to its real content on an idle
 * frame, and a screen of previews that all fetch never gives the browser one.
 *
 * @return {boolean} True inside a preview.
 */
export function useIsPreview() {
	return useSelect(
		(select) => !!select(blockEditorStore).getSettings().isPreviewMode,
		[]
	);
}
