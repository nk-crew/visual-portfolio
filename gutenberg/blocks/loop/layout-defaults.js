/**
 * What a gallery starts with when its layout is picked, by its source.
 *
 * The layout carries the look; nothing about it is asked. A gallery of images
 * shows all of them on one page and opens a picture larger, the way a photo
 * gallery is read. Any other source keeps what the layout carries, and a
 * picture opens its item rather than a lightbox.
 */

const PAGINATION_NAME = 'visual-portfolio/loop-pagination';

// Blocks whose click action follows the source.
const CLICKABLE_NAMES = [
	'visual-portfolio/item-image',
	'visual-portfolio/item-cover',
];

/**
 * Set the click action of every item picture in a tree.
 *
 * @param {Array}    blocks    - blocks to walk.
 * @param {Function} getAction - takes the current click action, returns the new one.
 * @return {Array} blocks.
 */
function setClickAction(blocks, getAction) {
	return blocks.map((block) => {
		const attributes = CLICKABLE_NAMES.includes(block.name)
			? {
					...block.attributes,
					clickAction: getAction(block.attributes.clickAction),
				}
			: block.attributes;

		return {
			...block,
			attributes,
			innerBlocks: setClickAction(block.innerBlocks || [], getAction),
		};
	});
}

/**
 * The blocks of a layout, ready for a gallery of this source.
 *
 * @param {Array}  blocks    - inner blocks of the layout's loop.
 * @param {string} queryType - content source of the loop.
 * @return {Array} blocks to insert.
 */
export function applyLayoutDefaults(blocks, queryType) {
	if ('images' === queryType) {
		return setClickAction(
			blocks.filter(({ name }) => PAGINATION_NAME !== name),
			() => 'popup'
		);
	}

	return setClickAction(blocks, (current) =>
		'popup' === current ? 'url' : current
	);
}

/**
 * The loop attributes that go with those blocks.
 *
 * @param {Object} attributes - loop attributes.
 * @return {Object} attributes to set.
 */
export function getLayoutAttributes(attributes) {
	if ('images' !== attributes.queryType) {
		return {};
	}

	// One page holds every image; the pagination is gone with it.
	return { baseQuery: { ...attributes.baseQuery, perPage: -1 } };
}
