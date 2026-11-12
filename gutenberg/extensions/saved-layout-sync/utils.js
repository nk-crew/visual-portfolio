import { createBlock, getBlockType, parse } from '@wordpress/blocks';

export const LOOP_BLOCK = 'visual-portfolio/loop';
export const TEMPLATE_BLOCK = 'visual-portfolio/item-template';

// Sync key of the loop's own synced attributes, see
// `Visual_Portfolio_Saved_Layouts::LOOP_KEY`.
export const LOOP_KEY = 'loop';

export const LOOP_SYNCED_ATTRIBUTES = ['lightbox'];

// Attributes that describe a block rather than set it up.
const NOT_SETTINGS = ['metadata', 'lock'];

/**
 * Sync key of a block.
 *
 * @param {Object} block - block or parsed block.
 * @return {string} key, empty when the block has none.
 */
export function getSyncKey(block) {
	return block?.attributes?.metadata?.vpSyncKey || '';
}

/**
 * A new random sync key.
 *
 * @return {string} key.
 */
export function createSyncKey() {
	return `k${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Overrides as a map of sync key to attribute names, whatever was stored.
 *
 * @param {*} overrides - stored overrides.
 * @return {Object} overrides.
 */
export function getOverrides(overrides) {
	const result = {};

	if (!overrides || typeof overrides !== 'object') {
		return result;
	}

	Object.keys(overrides).forEach((key) => {
		if (Array.isArray(overrides[key])) {
			result[key] = overrides[key].filter(
				(name) => typeof name === 'string'
			);
		}
	});

	return result;
}

/**
 * Number of overridden attributes.
 *
 * @param {Object} overrides - overrides.
 * @return {number} count.
 */
export function countOverrides(overrides) {
	return Object.values(getOverrides(overrides)).reduce(
		(total, names) => total + names.length,
		0
	);
}

/**
 * Overrides with some attributes of one key taken out.
 *
 * @param {Object}   overrides - overrides.
 * @param {string}   key       - sync key.
 * @param {string[]} names     - attributes to take out, all of the key's when omitted.
 * @return {Object} overrides.
 */
export function withoutOverrides(overrides, key, names) {
	const result = { ...getOverrides(overrides) };
	const kept = names
		? (result[key] || []).filter((name) => !names.includes(name))
		: [];

	if (kept.length) {
		result[key] = kept;
	} else {
		delete result[key];
	}

	return result;
}

/**
 * Overrides with attributes of one key added.
 *
 * @param {Object}   overrides - overrides.
 * @param {string}   key       - sync key.
 * @param {string[]} names     - attributes to add.
 * @return {Object} overrides.
 */
export function withOverrides(overrides, key, names) {
	const result = { ...getOverrides(overrides) };
	const merged = new Set([...(result[key] || []), ...names]);

	result[key] = [...merged];

	return result;
}

/**
 * Attribute names a setter would write, setting aside what only describes the
 * block.
 *
 * @param {Object|Function} next    - what `setAttributes` received.
 * @param {Object}          current - current attributes.
 * @return {string[]} names.
 */
export function getChangedNames(next, current) {
	const value = typeof next === 'function' ? next(current) : next;

	return Object.keys(value || {}).filter(
		(name) => !NOT_SETTINGS.includes(name)
	);
}

/**
 * Attributes of a block that differ from its block type's defaults.
 *
 * @param {Object} block - block.
 * @return {string[]} names.
 */
export function getChangedFromDefaults(block) {
	const definitions = getBlockType(block.name)?.attributes || {};

	return Object.keys(block.attributes || {}).filter((name) => {
		if (NOT_SETTINGS.includes(name)) {
			return false;
		}

		const value = block.attributes[name];

		if (typeof value === 'undefined') {
			return false;
		}

		return (
			JSON.stringify(value) !== JSON.stringify(definitions[name]?.default)
		);
	});
}

/**
 * The loop and item template of a layout's content.
 *
 * @param {string} content - raw post content.
 * @return {{loop: Object, template: Object}|null} blocks, null without a loop.
 */
export function parseLayout(content) {
	const loop = findBlock(parse(content || ''), LOOP_BLOCK);

	if (!loop) {
		return null;
	}

	return { loop, template: findBlock(loop.innerBlocks, TEMPLATE_BLOCK) };
}

/**
 * First block of a name, depth first.
 *
 * @param {Object[]} blocks - blocks.
 * @param {string}   name   - block name.
 * @return {Object|null} block.
 */
export function findBlock(blocks, name) {
	for (const block of blocks || []) {
		if (block.name === name) {
			return block;
		}

		const found = findBlock(block.innerBlocks, name);

		if (found) {
			return found;
		}
	}

	return null;
}

/**
 * Every block of a tree, depth first.
 *
 * @param {Object[]} blocks - blocks.
 * @return {Object[]} blocks.
 */
export function flatten(blocks) {
	return (blocks || []).flatMap((block) => [
		block,
		...flatten(block.innerBlocks),
	]);
}

/**
 * Blocks of a tree that carry a sync key, keyed by it.
 *
 * @param {Object[]} blocks - blocks.
 * @return {Object} blocks by key.
 */
export function indexBySyncKey(blocks) {
	const index = {};

	flatten(blocks).forEach((block) => {
		const key = getSyncKey(block);

		if (key && !index[key]) {
			index[key] = block;
		}
	});

	return index;
}

/**
 * Attributes of a layout block with the loop's overrides on top, the same
 * merge `Visual_Portfolio_Saved_Layouts::merge_block()` makes on the page.
 *
 * @param {Object} layoutBlock - block of the layout.
 * @param {Object} ownBlocks   - the loop's blocks by sync key.
 * @param {Object} overrides   - overrides.
 * @return {Object} attributes.
 */
export function getMergedAttributes(layoutBlock, ownBlocks, overrides) {
	const key = getSyncKey(layoutBlock);
	const attributes = { ...layoutBlock.attributes };
	const own = key && ownBlocks[key];

	(own ? overrides[key] || [] : []).forEach((name) => {
		attributes[name] = own.attributes[name];
	});

	return attributes;
}

/**
 * New blocks for a layout tree with the loop's overrides on top.
 *
 * @param {Object} layoutBlock - block of the layout.
 * @param {Object} ownBlocks   - the loop's blocks by sync key.
 * @param {Object} overrides   - overrides.
 * @return {Object} block.
 */
export function createMergedBlock(layoutBlock, ownBlocks, overrides) {
	return createBlock(
		layoutBlock.name,
		getMergedAttributes(layoutBlock, ownBlocks, overrides),
		layoutBlock.innerBlocks.map((inner) =>
			createMergedBlock(inner, ownBlocks, overrides)
		)
	);
}

/**
 * Shape of a tree: names and sync keys, in order.
 *
 * @param {Object} block - block.
 * @return {string} shape.
 */
export function getShape(block) {
	if (!block) {
		return '';
	}

	return `${block.name}#${getSyncKey(block)}(${(block.innerBlocks || [])
		.map(getShape)
		.join(',')})`;
}
