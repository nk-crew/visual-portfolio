/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/item-template.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import BlockEdit from './edit';
import BlockSave from './save';
import variations from './variations';

// Registered from the metadata rather than by name, so that the definition the
// server bootstrapped into the editor is the one the block keeps. The server
// registers the block from this same file and then widens `carouselEffect` to
// the effects the install adds through `vpf_carousel_effects`; settings spread
// from the bundled copy would put the narrow list back, and the editor drops a
// value outside the list the moment it parses the page.
registerLoopBlock(metadata, {
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit: BlockEdit,
	save: BlockSave,
	variations,
});
