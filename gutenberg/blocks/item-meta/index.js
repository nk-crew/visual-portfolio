/**
 * WordPress dependencies
 */

/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/item-meta.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import edit from './edit';
import variations from './variations';

// Registered from the metadata, so the context keys the server adds for the
// meta types of an extension reach the editor.
registerLoopBlock(metadata, {
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit,
	variations,
});
