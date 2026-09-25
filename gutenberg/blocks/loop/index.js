import { ReactComponent as BlockIcon } from '../../block-icons/visual-portfolio.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import edit from './edit';
import save from './save';
import transforms from './transforms';

const { name } = metadata;

const settings = {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit,
	save,
	transforms,
};

registerLoopBlock(name, settings);
