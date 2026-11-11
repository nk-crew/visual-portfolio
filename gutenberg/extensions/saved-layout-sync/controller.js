import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

import { useLayout } from './source';

import {
	createMergedBlock,
	findBlock,
	getMergedAttributes,
	getOverrides,
	getShape,
	getSyncKey,
	indexBySyncKey,
	LOOP_KEY,
	LOOP_SYNCED_ATTRIBUTES,
	TEMPLATE_BLOCK,
} from './utils';

export const LAYOUT_POST_TYPE = 'vp_lists';
export const LOCK_META = 'vp_saved_layout_locked';

// Attributes the editor keeps for itself; the layout never sets them.
const OWN_ATTRIBUTES = ['lock'];

/**
 * Patch that turns some attributes of a block into the wanted ones.
 *
 * @param {Object}   current - current attributes.
 * @param {Object}   desired - wanted attributes.
 * @param {string[]} names   - attributes to compare, both sets' keys when omitted.
 * @return {Object|null} patch, null when nothing differs.
 */
function getPatch(
	current,
	desired,
	names = new Set([...Object.keys(current), ...Object.keys(desired)])
) {
	const patch = {};

	names.forEach((name) => {
		if (OWN_ATTRIBUTES.includes(name)) {
			return;
		}

		// A key the layout leaves out is unset, as it is on the page.
		if (JSON.stringify(current[name]) !== JSON.stringify(desired[name])) {
			patch[name] = desired[name];
		}
	});

	return Object.keys(patch).length ? patch : null;
}

/**
 * Keep a synced loop showing what the page will render: the layout's item
 * template and lightbox, with the loop's overrides on top. Runs when the
 * layout loads and whenever the overrides change.
 *
 * The changes it makes are not undo steps: they reproduce the layout, they are
 * not edits of the user's.
 *
 * @param {Object} props          - component props.
 * @param {string} props.clientId - client id of the loop.
 * @return {null} nothing.
 */
export default function SyncController({ clientId }) {
	const registry = useRegistry();
	const {
		updateBlockAttributes,
		replaceInnerBlocks,
		__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
		setBlockEditingMode,
		unsetBlockEditingMode,
	} = useDispatch(blockEditorStore);

	const reference = useSelect(
		(select) =>
			select(blockEditorStore).getBlockAttributes(clientId)?.savedLayout,
		[clientId]
	);
	const { layout, locked } = useLayout(reference?.id);
	const overridesKey = JSON.stringify(getOverrides(reference?.overrides));

	// Core's block-support panels reset their settings with
	// `updateBlockAttributes()`, past the synced setter, so a change to the
	// synced blocks is checked against the layout too.
	const syncedState = useSelect(
		(select) => {
			const loop = select(blockEditorStore).getBlock(clientId);
			const template = loop?.innerBlocks.find(
				(block) => block.name === TEMPLATE_BLOCK
			);

			return JSON.stringify([loop?.attributes.lightbox, template]);
		},
		[clientId]
	);

	useEffect(() => {
		if (!layout) {
			return;
		}

		const { getBlock } = registry.select(blockEditorStore);
		const loop = getBlock(clientId);
		const overrides = locked ? {} : JSON.parse(overridesKey);

		if (!loop) {
			return;
		}

		const lightbox = (overrides[LOOP_KEY] || []).includes('lightbox')
			? null
			: getPatch(
					loop.attributes,
					Object.fromEntries(
						LOOP_SYNCED_ATTRIBUTES.map((name) => [
							name,
							layout.loop.attributes[name],
						])
					),
					LOOP_SYNCED_ATTRIBUTES
				);

		if (lightbox) {
			markNotPersistent();
			updateBlockAttributes(clientId, lightbox);
		}

		const own = loop.innerBlocks.find(
			(block) => block.name === TEMPLATE_BLOCK
		);

		if (!own || !layout.template) {
			return;
		}

		const ownBlocks = indexBySyncKey([own]);

		if (getShape(own) !== getShape(layout.template)) {
			const merged = createMergedBlock(
				layout.template,
				ownBlocks,
				overrides
			);

			markNotPersistent();
			replaceInnerBlocks(own.clientId, merged.innerBlocks, false);
			markNotPersistent();
			updateBlockAttributes(own.clientId, merged.attributes);

			return;
		}

		const syncTree = (ownBlock, layoutBlock) => {
			const patch = getPatch(
				ownBlock.attributes,
				getMergedAttributes(layoutBlock, ownBlocks, overrides)
			);

			if (patch) {
				markNotPersistent();
				updateBlockAttributes(ownBlock.clientId, patch);
			}

			ownBlock.innerBlocks.forEach((inner, index) => {
				syncTree(inner, layoutBlock.innerBlocks[index]);
			});
		};

		syncTree(own, layout.template);
	}, [
		clientId,
		layout,
		locked,
		overridesKey,
		syncedState,
		registry,
		markNotPersistent,
		replaceInnerBlocks,
		updateBlockAttributes,
	]);

	// A locked layout's blocks cannot be selected or changed on the page.
	const templateIds = useSelect(
		(select) => {
			if (!locked) {
				return '';
			}

			const { getBlock, getClientIdsOfDescendants } =
				select(blockEditorStore);
			const template = findBlock(
				getBlock(clientId)?.innerBlocks,
				TEMPLATE_BLOCK
			);

			return template
				? [
						template.clientId,
						...getClientIdsOfDescendants(template.clientId),
					].join(',')
				: '';
		},
		[clientId, locked]
	);

	useEffect(() => {
		const ids = templateIds ? templateIds.split(',') : [];

		ids.forEach((id) => {
			setBlockEditingMode(id, 'disabled');
		});

		return () => {
			ids.forEach((id) => {
				unsetBlockEditingMode(id);
			});
		};
	}, [templateIds, setBlockEditingMode, unsetBlockEditingMode]);

	return null;
}

/**
 * Keys the overrides of a loop that starts syncing with a layout: every
 * setting it changed from its block defaults, matched to the layout's
 * blocks by name in order, plus the keys those blocks need to be found.
 *
 * @param {Object}   loop                   - the loop block.
 * @param {Object}   layout                 - parsed layout.
 * @param {Function} getChangedFromDefaults - names a block changed.
 * @return {{overrides: Object, keys: Array}} overrides, and `[ clientId, key ]` pairs.
 */
export function getStartingOverrides(loop, layout, getChangedFromDefaults) {
	const overrides = {};
	const keys = [];
	const own = loop.innerBlocks.find((block) => block.name === TEMPLATE_BLOCK);

	if (getChangedFromDefaults(loop).includes('lightbox')) {
		overrides[LOOP_KEY] = ['lightbox'];
	}

	if (!own || !layout.template) {
		return { overrides, keys };
	}

	const pairs = [[own, layout.template]];
	const available = [];

	const collect = (block) =>
		block.innerBlocks.forEach((inner) => {
			available.push(inner);
			collect(inner);
		});
	collect(layout.template);

	const visit = (block) =>
		block.innerBlocks.forEach((inner) => {
			const index = available.findIndex(
				(candidate) => candidate.name === inner.name
			);

			if (index !== -1) {
				pairs.push([inner, available[index]]);
				available.splice(index, 1);
			}

			visit(inner);
		});
	visit(own);

	pairs.forEach(([ownBlock, layoutBlock]) => {
		const key = getSyncKey(layoutBlock);
		const changed = getChangedFromDefaults(ownBlock);

		if (!key) {
			return;
		}

		keys.push([ownBlock.clientId, key]);

		if (changed.length) {
			overrides[key] = changed;
		}
	});

	return { overrides, keys };
}
