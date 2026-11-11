/**
 * WordPress dependencies
 */
import isShallowEqual from '@wordpress/is-shallow-equal';

/**
 * The key of a gallery entry of the Media source.
 *
 * @param {Object} image - entry of `imagesQuery.images`.
 * @return {string} key.
 */
export function getImageEntryKey(image) {
	return Number(image?.id) > 0
		? `image:${Number(image.id)}`
		: `url:${image?.imgUrl || ''}`;
}

/**
 * The key a preview item keeps while the gallery is rearranged.
 *
 * The endpoint builds an image item's id from its gallery index, so the key follows the picture.
 *
 * @param {Object}  context  - block context of the item.
 * @param {boolean} isImages - whether the loop is a Media gallery.
 * @return {string} key.
 */
export function getItemKey(context, isImages) {
	if (!isImages) {
		return String(context['vp/itemId']);
	}

	const id = Number(context['vp/itemImgId']);

	return id > 0 ? `image:${id}` : `url:${context['vp/itemImgUrl'] || ''}`;
}

/**
 * Whether every key of a list is its own.
 *
 * @param {Array} keys - keys.
 * @return {boolean} whether none repeats.
 */
function isUnique(keys) {
	return new Set(keys).size === keys.length;
}

/**
 * The items a Media gallery shows after its images were moved or removed,
 * drawn from the items it already has.
 *
 * Stands in for the endpoint's answer only for a change it can predict, otherwise answers `null`.
 *
 * @param {Object} args               - arguments.
 * @param {Array}  args.items         - block contexts of the last answer.
 * @param {Object} args.answeredQuery - query that answer was given for.
 * @param {Object} args.query         - query the loop holds now.
 * @return {Array|null} block contexts in the order to show, or `null`.
 */
export function arrangeItems({ items, answeredQuery, query }) {
	if (
		!items.length ||
		!answeredQuery ||
		answeredQuery === query ||
		'images' !== query?.queryType ||
		'images' !== answeredQuery.queryType
	) {
		return null;
	}

	const { images: answeredImages = [], ...answeredRest } =
		answeredQuery.imagesQuery || {};
	const { images = [], ...rest } = query.imagesQuery || {};

	if (
		images === answeredImages ||
		answeredQuery.postsQuery !== query.postsQuery ||
		answeredQuery.sourceQuery !== query.sourceQuery ||
		answeredQuery.baseQuery?.perPage !== query.baseQuery?.perPage ||
		!isShallowEqual(answeredRest, rest)
	) {
		return null;
	}

	const answered = new Map(
		answeredImages.map((image) => [getImageEntryKey(image), image])
	);
	const keys = images.map(getImageEntryKey);

	if (
		answered.size !== answeredImages.length ||
		!isUnique(keys) ||
		images.some((image, index) => {
			const before = answered.get(keys[index]);

			return (
				!before ||
				(before !== image &&
					JSON.stringify(before) !== JSON.stringify(image))
			);
		})
	) {
		return null;
	}

	const known = new Map(items.map((item) => [getItemKey(item, true), item]));

	if (known.size !== items.length) {
		return null;
	}

	const { orderBy = 'default', order = 'asc' } = rest;
	let shown;

	if ('default' === orderBy) {
		// The first page, cut the way `Visual_Portfolio_Get::get_query_params()` cuts it.
		const perPage = parseInt(query.baseQuery?.perPage, 10);

		if (!perPage) {
			return null;
		}

		const ordered = 'desc' === order ? [...keys].reverse() : keys;

		shown = perPage < 0 ? ordered : ordered.slice(0, perPage);
	} else if ('rand' === orderBy) {
		// A shuffle seeded by the session deals a smaller gallery anew.
		return null;
	} else {
		const remaining = new Set(keys);

		shown = Array.from(known.keys()).filter((key) => remaining.has(key));
	}

	return shown.filter((key) => known.has(key)).map((key) => known.get(key));
}
