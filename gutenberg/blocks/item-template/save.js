import { InnerBlocks } from '@wordpress/block-editor';

export default function BlockSave() {
	// No wrapper element, the way core's `post-template` saves.
	//
	// The render callback replays this saved content once per item, so anything
	// wrapping it here would be repeated inside every `<li>`. The real `<ul>`,
	// its layout classes and its CSS variables all come from the server.
	return <InnerBlocks.Content />;
}
