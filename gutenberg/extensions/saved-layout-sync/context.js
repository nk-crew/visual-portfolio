import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { createContext } from '@wordpress/element';

import { LOOP_BLOCK, TEMPLATE_BLOCK } from './utils';

/**
 * Sync state of the block being edited, `null` outside a synced loop.
 *
 * `{ overrides: string[], isSynced( name ): boolean, locked: boolean }`
 */
export const SyncContext = createContext(null);

const captures = [];

/**
 * Attribute names a function writes through a synced block's `setAttributes`,
 * without writing them.
 *
 * A settings panel resets a setting through `onDeselect`, which calls
 * `setAttributes` with the setting's attributes; that call is how the panel
 * tells which attributes a control owns.
 *
 * @param {Function} callback - function to run.
 * @return {string[]} names.
 */
export function captureAttributeNames(callback) {
	const names = [];

	captures.push(names);

	try {
		callback?.();
	} finally {
		captures.pop();
	}

	return [...new Set(names)];
}

/**
 * Where a capture is running, the list it collects into.
 *
 * @return {string[]|null} names.
 */
export function getCapture() {
	return captures.length ? captures[captures.length - 1] : null;
}

let resetDepth = 0;

/**
 * Run a reset of settings, in which a synced block returns the synced
 * attributes it is given to the layout's values instead of writing them.
 *
 * @param {Function} callback - function that resets settings.
 */
export function runAsReset(callback) {
	resetDepth += 1;

	try {
		callback?.();
	} finally {
		resetDepth -= 1;
	}
}

/**
 * Whether a reset of settings is running.
 *
 * @return {boolean} whether resetting.
 */
export function isResetting() {
	return resetDepth > 0;
}

/**
 * Whether the inner blocks of a block follow a synced layout, so their
 * structure is the layout's and cannot change here.
 *
 * @param {string} clientId - client id of the block.
 * @return {boolean} whether synced.
 */
export function useIsInSyncedTemplate(clientId) {
	return useSelect(
		(select) => {
			const {
				getBlockName,
				getBlockParentsByBlockName,
				getBlockAttributes,
			} = select(blockEditorStore);

			if (!clientId) {
				return false;
			}

			const isTemplate = getBlockName(clientId) === TEMPLATE_BLOCK;

			if (
				!isTemplate &&
				!getBlockParentsByBlockName(clientId, TEMPLATE_BLOCK).length
			) {
				return false;
			}

			const loops = getBlockParentsByBlockName(clientId, LOOP_BLOCK);
			const loop = loops[loops.length - 1];

			return !!(loop && getBlockAttributes(loop)?.savedLayout?.id);
		},
		[clientId]
	);
}
