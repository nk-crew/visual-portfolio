import apiFetch from '@wordpress/api-fetch';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';

function UpdateEditor() {
	const {
		isSavingPost,
		isAutosavingPost,
		selectedBlock,
		editorSettings,
		editorMode,
		blocks,
		postId,
		blockData,
	} = useSelect((select) => {
		const {
			isSavingPost: checkIsSavingPost,
			isAutosavingPost: checkIsAutosavingPost,
			getCurrentPostId,
			getEditorSettings,
		} = select('core/editor');

		const { getSelectedBlock, getBlocks } = select('core/block-editor');

		const { getEditorMode } = select('core/edit-post');

		const { getBlockData } = select('visual-portfolio/saved-layout-data');

		return {
			isSavingPost: checkIsSavingPost(),
			isAutosavingPost: checkIsAutosavingPost(),
			selectedBlock: getSelectedBlock(),
			editorSettings: getEditorSettings(),
			editorMode: getEditorMode(),
			blocks: getBlocks(),
			postId: getCurrentPostId(),
			blockData: getBlockData(),
		};
	}, []);

	const { selectBlock, insertBlocks, resetBlocks } =
		useDispatch('core/block-editor');
	const { editPost } = useDispatch('core/editor');
	const { switchEditorMode } = useDispatch('core/edit-post');

	/**
	 * Force change gutenberg edit mode to Visual.
	 */
	useEffect(() => {
		if (editorSettings.richEditingEnabled && editorMode === 'text') {
			switchEditorMode();
		}
	}, [editorSettings, editorMode, switchEditorMode]);

	/**
	 * Add default block to post if doesn't exist.
	 */
	const blocksRestoreBusy = useRef(false);
	useEffect(() => {
		if (blocksRestoreBusy.current) {
			return;
		}

		const isValidList =
			blocks.length === 1 &&
			blocks[0] &&
			blocks[0].name === 'visual-portfolio/saved-editor';

		if (!isValidList) {
			blocksRestoreBusy.current = true;
			resetBlocks([]);
			insertBlocks(createBlock('visual-portfolio/saved-editor'));
			blocksRestoreBusy.current = false;
		}
	}, [blocks, blocksRestoreBusy, resetBlocks, insertBlocks]);

	/**
	 * Always select block.
	 */
	const isBlockSelected = useRef(false);
	useEffect(() => {
		if (isBlockSelected.current) {
			return;
		}

		// if selected block, do nothing.
		if (
			selectedBlock &&
			selectedBlock.name === 'visual-portfolio/saved-editor'
		) {
			isBlockSelected.current = true;
			return;
		}

		// check if selected post title, also do nothing.
		// The title is rendered inside the editor canvas, which WordPress
		// iframes - always, as of 7.1 - so it is not in this document.
		const titleSelector =
			'.editor-post-title__block.is-selected, .editor-post-title.is-selected';
		const canvasDocument = document.querySelector(
			'iframe[name="editor-canvas"]'
		)?.contentDocument;

		if (
			document.querySelector(titleSelector) ||
			canvasDocument?.querySelector(titleSelector)
		) {
			return;
		}

		let selectBlockId = '';
		blocks.forEach((thisBlock) => {
			if (thisBlock.name === 'visual-portfolio/saved-editor') {
				selectBlockId = thisBlock.clientId;
			}
		});

		if (selectBlockId) {
			selectBlock(selectBlockId);
		}
	}, [selectedBlock, blocks, selectBlock]);

	/**
	 * Check if post meta data edited and allow to update the post.
	 */
	const defaultBlockData = useRef(false);
	const editorRefreshTimeout = useRef(false);
	useEffect(() => {
		if (!blockData || !Object.keys(blockData).length) {
			return;
		}

		if (isSavingPost || isAutosavingPost || !defaultBlockData.current) {
			defaultBlockData.current = JSON.stringify(blockData);
			return;
		}

		clearTimeout(editorRefreshTimeout.current);
		editorRefreshTimeout.current = setTimeout(() => {
			if (defaultBlockData.current !== JSON.stringify(blockData)) {
				editPost({ edited: new Date() });
			}
		}, 150);
	}, [isSavingPost, isAutosavingPost, blockData, editPost]);

	/**
	 * Save meta data when the post starts saving so layout data is persisted
	 * in parallel with the WordPress post save (avoids losing settings on
	 * immediate reload/navigation after Publish).
	 */
	const wasSavingPost = useRef(false);
	const wasAutosavingPost = useRef(false);
	useEffect(() => {
		const startedSaving =
			!wasSavingPost.current && isSavingPost && !isAutosavingPost;

		// Save current state for next inspection.
		wasSavingPost.current = isSavingPost;
		wasAutosavingPost.current = isAutosavingPost;

		if (!startedSaving || !blockData || !postId) {
			return;
		}

		const prefixedBlockData = {};

		Object.keys(blockData).forEach((name) => {
			prefixedBlockData[`vp_${name}`] = blockData[name];
		});

		apiFetch({
			path: '/visual-portfolio/v1/update_layout/',
			method: 'POST',
			data: {
				data: prefixedBlockData,
				post_id: postId,
			},
		}).catch((response) => {
			// eslint-disable-next-line no-console
			console.log(response);
		});
	}, [isSavingPost, isAutosavingPost, postId, blockData]);

	return null;
}

registerPlugin('vpf-saved-layouts-editor', {
	render: UpdateEditor,
});
