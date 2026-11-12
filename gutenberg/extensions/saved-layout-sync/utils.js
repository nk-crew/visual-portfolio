import { createBlock, getBlockType, parse } from '@wordpress/blocks';

export const LOOP_BLOCK = 'visual-portfolio/loop';
export const TEMPLATE_BLOCK = 'visual-portfolio/item-template';

// Sync key of the loop's own synced attributes, see
// `Visual_Portfolio_Saved_Layouts::LOOP_KEY`.
export const LOOP_KEY = 'loop';

export const LOOP_SYNCED_ATTRIBUTES = ['lightbox'];

// Attributes that describe a block rather than set it up.
const NOT_SETTINGS = ['metadata', 'lock'];

// Object attributes whose keys are overridden one by one, as
// `extensions.<key>`, see `Visual_Portfolio_Saved_Layouts::PATH_ATTRIBUTES`.
// A bare name still stands for the whole object.
const PATH_ATTRIBUTES = ['extensions'];

const isObject = (value) =>
	!!value && typeof value === 'object' && !Array.isArray(value);

/**
 * The attribute and object key an override names.
 *
 * @param {string} name - override, `attribute` or `attribute.key`.
 * @return {{attribute: string, key: string}} parts, `key` empty for a whole attribute.
 */
export function parseOverride(name) {
	const dot = name.indexOf('.');

	if (dot === -1) {
		return { attribute: name, key: '' };
	}

	return { attribute: name.slice(0, dot), key: name.slice(dot + 1) };
}

/**
 * Whether a setting is overridden: listed itself, or its whole attribute is.
 *
 * @param {string[]} names - overridden names of a block.
 * @param {string}   name  - setting, `attribute` or `attribute.key`.
 * @return {boolean} whether overridden.
 */
export function isOverridden(names, name) {
	return (
		names.includes(name) || names.includes(parseOverride(name).attribute)
	);
}

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
			result[key] = overrides[key].filter((name) => {
				if (typeof name !== 'string') {
					return false;
				}

				const { attribute, key: path } = parseOverride(name);

				return (
					attribute === name ||
					(PATH_ATTRIBUTES.includes(attribute) && path !== '')
				);
			});
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
	const current = result[key] || [];
	const merged = new Set([
		...current,
		...names.filter((name) => !isOverridden(current, name)),
	]);

	result[key] = [...merged];

	return result;
}

/**
 * Settings a setter would write, setting aside what only describes the block.
 *
 * An object of `PATH_ATTRIBUTES` names each key whose value differs, added,
 * changed or removed, as `attribute.key`, and itself bare when no key differs.
 *
 * @param {Object|Function} next    - what `setAttributes` received.
 * @param {Object}          current - current attributes.
 * @return {string[]} names.
 */
export function getChangedNames(next, current) {
	const value = typeof next === 'function' ? next(current) : next;

	return Object.keys(value || {})
		.filter((name) => !NOT_SETTINGS.includes(name))
		.flatMap((name) => {
			if (!PATH_ATTRIBUTES.includes(name)) {
				return [name];
			}

			const before = isObject(current?.[name]) ? current[name] : {};
			const after = isObject(value[name]) ? value[name] : {};
			const keys = [
				...new Set([...Object.keys(before), ...Object.keys(after)]),
			].filter(
				(key) =>
					JSON.stringify(before[key]) !== JSON.stringify(after[key])
			);

			return keys.length ? keys.map((key) => `${name}.${key}`) : [name];
		});
}

/**
 * Settings of `getChangedNames()` that change something: an object of
 * `PATH_ATTRIBUTES` written as it was is left out.
 *
 * @param {string[]} names - settings.
 * @return {string[]} names.
 */
export function withoutUnchanged(names) {
	return names.filter((name) => !PATH_ATTRIBUTES.includes(name));
}

/**
 * Overridden keys of an object attribute that a block does not set: settings
 * cleared on the page. A handler that drops such a key writes the object as
 * it is, so these are what it can be told to own.
 *
 * @param {string[]} names      - overridden names of the block.
 * @param {string}   attribute  - object attribute.
 * @param {Object}   attributes - the block's attributes.
 * @return {string[]} names.
 */
export function getClearedKeys(names, attribute, attributes) {
	const value = isObject(attributes?.[attribute])
		? attributes[attribute]
		: {};

	return names.filter((name) => {
		const { attribute: owner, key } = parseOverride(name);

		return (
			owner === attribute &&
			key !== '' &&
			typeof value[key] === 'undefined'
		);
	});
}

/**
 * Settings of a block that differ from its block type's defaults, named as
 * `getChangedNames()` names them.
 *
 * @param {Object} block - block.
 * @return {string[]} names.
 */
export function getChangedFromDefaults(block) {
	const definitions = getBlockType(block.name)?.attributes || {};

	return Object.keys(block.attributes || {}).flatMap((name) => {
		const value = block.attributes[name];
		const fallback = definitions[name]?.default;

		if (
			NOT_SETTINGS.includes(name) ||
			typeof value === 'undefined' ||
			JSON.stringify(value) === JSON.stringify(fallback)
		) {
			return [];
		}

		return getChangedNames({ [name]: value }, { [name]: fallback });
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
	const names = own ? overrides[key] || [] : [];

	// `originalContent` is the markup `parse()` read, the `innerHTML` the PHP
	// merge tests.
	if (names.length && layoutBlock.originalContent) {
		return { ...own.attributes };
	}

	names.forEach((name) => {
		const { attribute, key: path } = parseOverride(name);

		if (!path) {
			attributes[name] = own.attributes[name];
			return;
		}

		if (names.includes(attribute)) {
			return;
		}

		const ownValue = own.attributes[attribute];
		const isSet =
			isObject(ownValue) && typeof ownValue[path] !== 'undefined';

		if (!isObject(attributes[attribute])) {
			if (isSet) {
				attributes[attribute] = { [path]: ownValue[path] };
			}

			return;
		}

		const value = { ...attributes[attribute] };

		if (isSet) {
			value[path] = ownValue[path];
		} else {
			delete value[path];
		}

		attributes[attribute] = value;
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
