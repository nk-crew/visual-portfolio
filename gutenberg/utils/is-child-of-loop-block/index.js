import { store as blockEditorStore } from '@wordpress/block-editor';
import { select } from '@wordpress/data';

export function checkIsChildOfLoopBlock(clientId) {
	const { getBlockParents, getBlock } = select(blockEditorStore);
	const parentBlocks = getBlockParents(clientId);

	return parentBlocks.some((parentClientId) => {
		const block = getBlock(parentClientId);
		return block.name === 'visual-portfolio/loop';
	});
}
