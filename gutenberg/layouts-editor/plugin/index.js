import apiFetch from '@wordpress/api-fetch';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { addFilter, removeFilter } from '@wordpress/hooks';
import { registerPlugin } from '@wordpress/plugins';

function UpdateEditor() {
	const registry = useRegistry();
	const {
		isSavingPost,
		selectedBlock,
		editorSettings,
		editorMode,
		blocks,
		blockData,
	} = useSelect((select) => {
		const { isSavingPost: checkIsSavingPost, getEditorSettings } =
			select('core/editor');

		const { getSelectedBlock, getBlocks } = select('core/block-editor');

		// The editor mode moved to `core/editor` in WP 6.6, which also
		// deprecated it in `core/edit-post`; older cores only have the latter.
		const getEditorMode =
			select('core/editor').getEditorMode ||
			select('core/edit-post').getEditorMode;

		const { getBlockData } = select('visual-portfolio/saved-layout-data');

		return {
			isSavingPost: checkIsSavingPost(),
			selectedBlock: getSelectedBlock(),
			editorSettings: getEditorSettings(),
			editorMode: getEditorMode(),
			blocks: getBlocks(),
			blockData: getBlockData(),
		};
	}, []);

	const { selectBlock, insertBlocks, resetBlocks } =
		useDispatch('core/block-editor');
	const { editPost, switchEditorMode: switchEditorModeInEditor } =
		useDispatch('core/editor');
	const { switchEditorMode: switchEditorModeInEditPost } =
		useDispatch('core/edit-post');
	const switchEditorMode =
		switchEditorModeInEditor || switchEditorModeInEditPost;

	/**
	 * Force change gutenberg edit mode to Visual.
	 */
	useEffect(() => {
		if (editorSettings.richEditingEnabled && editorMode === 'text') {
			switchEditorMode('visual');
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
	const savedBlockData = useRef(null);
	useEffect(() => {
		if (!blockData || !Object.keys(blockData).length) {
			return;
		}

		const serializedBlockData = JSON.stringify(blockData);

		if (savedBlockData.current === null) {
			savedBlockData.current = serializedBlockData;
		}

		if (isSavingPost || savedBlockData.current === serializedBlockData) {
			return;
		}

		const refresh = setTimeout(() => editPost({ edited: new Date() }), 150);
		return () => clearTimeout(refresh);
	}, [isSavingPost, blockData, editPost]);

	useEffect(() => {
		const hook = 'editor.__unstableSavePost';
		const namespace = 'visual-portfolio/save-legacy-layout';
		const editor = registry.select('core/editor');
		const layout = registry.select('visual-portfolio/saved-layout-data');
		let hasSavedSettings = Boolean(
			window.VPSavedLayoutVariables.hasSavedSettings
		);
		let layoutAtSave;

		const unsubscribe = registry.subscribe(() => {
			if (editor.isSavingPost() && !editor.isAutosavingPost()) {
				layoutAtSave ??= layout.getBlockData();
			} else {
				layoutAtSave = undefined;
			}
		}, 'core/editor');

		// WordPress 6.6 awaits this filter before it reports the save result.
		addFilter(hook, namespace, (save, { isAutosave }) => {
			if (isAutosave) {
				return save;
			}

			const postId = editor.getCurrentPostId();
			const layoutData = layoutAtSave;

			if (!postId || !layoutData) {
				return save;
			}

			const serializedLayoutData = JSON.stringify(layoutData);
			if (
				hasSavedSettings &&
				savedBlockData.current === serializedLayoutData
			) {
				return save;
			}

			return save.then((result) => {
				const prefixedBlockData = Object.fromEntries(
					Object.entries(layoutData).map(([name, value]) => [
						`vp_${name}`,
						value,
					])
				);

				return apiFetch({
					path: '/visual-portfolio/v1/update_layout/',
					method: 'POST',
					data: { data: prefixedBlockData, post_id: postId },
				}).then(
					() => {
						hasSavedSettings = true;
						savedBlockData.current = serializedLayoutData;
						return result;
					},
					(error) => {
						if (
							!hasSavedSettings &&
							savedBlockData.current === serializedLayoutData
						) {
							editPost({ edited: new Date() });
						}
						throw error;
					}
				);
			});
		});

		return () => {
			removeFilter(hook, namespace);
			unsubscribe();
		};
	}, [editPost, registry]);

	return null;
}

registerPlugin('vpf-saved-layouts-editor', {
	render: UpdateEditor,
});
