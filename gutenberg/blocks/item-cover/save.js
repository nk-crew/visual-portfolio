import { InnerBlocks } from '@wordpress/block-editor';

export default function BlockSave() {
	// No wrapper element: the cover, its image, its overlays and its content box
	// are all rendered by the server, around exactly this saved content.
	return <InnerBlocks.Content />;
}
