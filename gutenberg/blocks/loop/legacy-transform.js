import { createBlock, getBlockType } from '@wordpress/blocks';
import { select } from '@wordpress/data';
import { applyFilters } from '@wordpress/hooks';

import { LOOP_SOURCES_STORE } from '../../store/loop-sources';
import { URL_OR_POPUP } from '../../utils/click-actions';
import { convertLegacyToModern } from '../../utils/convert-legacy-attributes';
import { maybeDecode } from '../../utils/encode-decode';

const LEGACY_BLOCK = 'visual-portfolio/block';
const LOOP_BLOCK = 'visual-portfolio/loop';

// Sources of the legacy block and the loop's names for them.
const QUERY_TYPES = { 'post-based': 'posts', images: 'images' };

// Layouts of the legacy block and the item template's names for them.
const LAYOUT_TYPES = {
	tiles: 'tiles',
	masonry: 'masonry',
	grid: 'grid',
	justified: 'justified',
	slider: 'carousel',
};

const SLIDER_EFFECTS = { slide: 'none', coverflow: 'coverflow', fade: 'fade' };

// What the legacy skins print when no color is picked, in their stylesheets.
const COVER_TEXT_COLOR = '#fff';
// The overlay of Fade and Fly and the caption panel of Emerge. A skin Pro adds
// keeps the cover's own until Pro maps it.
const COVER_PANEL_COLORS = { fade: '#000', fly: '#000', emerge: '#000' };

const ALIGNMENTS = ['wide', 'full'];

// The justify-content of a flex row for the align of a legacy element row.
const JUSTIFY = {
	left: 'left',
	center: 'center',
	right: 'right',
	between: 'space-between',
};

// Ranges of the item template, which a legacy value can exceed.
const MAX_COLUMNS = 6;
const JUSTIFIED_ROW_HEIGHT = [40, 800];
const AUTOPLAY_DELAY = [2, 60];

/**
 * A number kept within a range.
 *
 * @param {number} value - number.
 * @param {Array}  range - `[ min, max ]`.
 * @return {number} number.
 */
function clamp(value, [min, max]) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Whether a legacy toggle is on. A Saved Layout returns its toggles as
 * booleans, `'true'` and `'1'`, and a block as booleans.
 *
 * @param {*} value - toggle value.
 * @return {boolean} whether it is on.
 */
function isOn(value) {
	return true === value || 'true' === value || '1' === value || 1 === value;
}

/**
 * A legacy aspect ratio, `16:9`, as CSS writes it.
 *
 * @param {string} ratio - legacy ratio.
 * @return {string} ratio, or empty for the picture's own.
 */
function getAspectRatio(ratio) {
	const [width, height] = String(ratio || '').split(':');

	return width && height ? `${width}/${height}` : '';
}

/**
 * Every attribute of a legacy block, the ones saved content leaves out at
 * their registered default.
 *
 * @param {Object} attributes - attributes of the legacy block or the settings of a Saved Layout.
 * @return {Object} attributes.
 */
function getLegacyAttributes(attributes) {
	const registered = getBlockType(LEGACY_BLOCK)?.attributes || {};
	const defaults = Object.fromEntries(
		Object.entries(registered)
			.filter(([, { default: value }]) => undefined !== value)
			.map(([name, { default: value }]) => [name, value])
	);

	return { ...defaults, ...attributes };
}

/**
 * The loop's name for the source of a legacy block, when the loop has it.
 *
 * @param {Object} attributes - attributes of the legacy block.
 * @return {string|false} query type.
 */
export function getLegacyQueryType({ content_source: contentSource }) {
	const queryType = QUERY_TYPES[contentSource] || contentSource;

	if (!queryType) {
		return false;
	}

	if (['posts', 'images'].includes(queryType)) {
		return queryType;
	}

	// Without Pro its sources are registered as teasers to advertise them.
	const source = select(LOOP_SOURCES_STORE).getSource(queryType);

	return source && (!source.isPro || window.VPGutenbergVariables?.pro)
		? queryType
		: false;
}

/**
 * The query attributes of the loop.
 *
 * @param {Object} legacy    - attributes of the legacy block, defaults resolved.
 * @param {string} queryType - query type of the loop.
 * @return {Object} loop attributes.
 */
function getQueryAttributes(legacy, queryType) {
	const loopAttributes = getBlockType(LOOP_BLOCK)?.attributes || {};
	const { baseQuery, postsQuery, imagesQuery } =
		convertLegacyToModern(legacy);
	const toIds = (ids) =>
		(ids || []).map((id) => parseInt(id, 10)).filter((id) => id > 0);

	return {
		queryType,
		baseQuery: {
			...loopAttributes.baseQuery?.default,
			...baseQuery,
			perPage: parseInt(legacy.items_count, 10) || -1,
		},
		postsQuery: {
			...loopAttributes.postsQuery?.default,
			...postsQuery,
			ids: toIds(postsQuery?.ids),
			excludeIds: toIds(postsQuery?.excludeIds),
			taxonomies: toIds(postsQuery?.taxonomies),
			offset: parseInt(postsQuery?.offset, 10) || 0,
			avoidDuplicates: isOn(postsQuery?.avoidDuplicates),
		},
		imagesQuery: {
			...loopAttributes.imagesQuery?.default,
			...imagesQuery,
			images: imagesQuery?.images || [],
		},
	};
}

/**
 * The click action of a legacy block for the block that draws the picture.
 *
 * @param {Object} legacy    - attributes of the legacy block.
 * @param {string} queryType - query type of the loop.
 * @return {Object} attributes of the item image or cover.
 */
function getClickAttributes(legacy, queryType) {
	const action = legacy.items_click_action;
	let clickAction = 'url';

	if (!action || 'false' === action) {
		clickAction = 'none';
	} else if ('popup_gallery' === action) {
		// An image with a link of its own follows it instead of the lightbox.
		clickAction =
			'images' === queryType &&
			(legacy.images || []).some(({ url }) => url)
				? URL_OR_POPUP
				: 'popup';
	}

	return {
		clickAction,
		...('none' !== clickAction && legacy.items_click_action_url_target
			? { linkTarget: legacy.items_click_action_url_target }
			: {}),
		...('none' !== clickAction && legacy.items_click_action_url_rel
			? { rel: legacy.items_click_action_url_rel }
			: {}),
	};
}

/**
 * Lightbox captions of the loop, those that differ from its defaults.
 *
 * @param {Object} legacy - attributes of the legacy block.
 * @return {Object} `lightbox` attribute.
 */
function getLightbox(legacy) {
	const lightbox = {};

	if ('item_title' !== legacy.items_click_action_popup_title_source) {
		lightbox.titleSource = legacy.items_click_action_popup_title_source;
	}

	if ('item_excerpt' !== legacy.items_click_action_popup_description_source) {
		lightbox.descriptionSource =
			legacy.items_click_action_popup_description_source;
	}

	return Object.fromEntries(
		Object.entries(lightbox).filter(([, value]) => value)
	);
}

/**
 * Style of a caption block: its alignment and its colors. The legacy skins
 * color their links as the text around them unless a links color is picked.
 *
 * @param {string} textAlign - left, center or right.
 * @param {string} color     - text color.
 * @param {string} linkColor - links color.
 * @return {Object} attributes.
 */
function getCaptionStyle(textAlign, color, linkColor) {
	const style = {
		...(textAlign ? { typography: { textAlign } } : {}),
		...(color ? { color: { text: color } } : {}),
		elements: {
			link: { color: { text: linkColor || 'inherit' } },
		},
	};

	return { style };
}

/**
 * The caption blocks of a legacy skin, in the order its templates print them:
 * categories, title, the inline meta row, excerpt, read more.
 *
 * @param {Object} skin      - options of the skin, without their prefix.
 * @param {Object} options   - how to draw them.
 * @param {string} options.textAlign - text alignment.
 * @param {string} options.color     - text color of each block.
 * @param {string} options.linkColor - links color of each block.
 * @param {Object} options.titleLink - click attributes of the title.
 * @param {string} queryType - query type of the loop.
 * @return {Array} blocks.
 */
function getCaptionBlocks(
	skin,
	{ textAlign, color, linkColor, titleLink },
	queryType
) {
	const style = getCaptionStyle(textAlign, color, linkColor);
	const blocks = [];
	const isPosts = 'posts' === queryType;

	if (isOn(skin.show_categories)) {
		blocks.push(
			createBlock('visual-portfolio/item-categories', {
				limit: parseInt(skin.categories_count, 10) || 0,
				...style,
			})
		);
	}

	if (isOn(skin.show_title ?? true)) {
		const level = /^h([1-6])$/.exec(skin.title_tag || 'h2');

		blocks.push(
			createBlock('visual-portfolio/item-title', {
				level: level ? parseInt(level[1], 10) : 0,
				...titleLink,
				...style,
			})
		);
	}

	const meta = [];

	if (isOn(skin.show_author)) {
		// The legacy skins print the author's avatar beside the name.
		meta.push(
			createBlock('visual-portfolio/item-author', {
				showAvatar: true,
				...style,
			})
		);
	}

	if (skin.show_date && !['false', false].includes(skin.show_date)) {
		meta.push(
			createBlock('visual-portfolio/item-date', {
				format:
					'human' === skin.show_date
						? 'human-diff'
						: skin.date_format || undefined,
				...style,
			})
		);
	}

	[
		['show_comments_count', 'comments'],
		['show_views_count', 'views'],
		['show_reading_time', 'reading-time'],
	].forEach(([name, metaType]) => {
		if (isPosts && isOn(skin[name])) {
			meta.push(
				createBlock('visual-portfolio/item-meta', {
					metaType,
					...style,
				})
			);
		}
	});

	// The legacy skins print these on one line.
	if (1 < meta.length) {
		blocks.push(
			createBlock(
				'core/group',
				{
					layout: {
						type: 'flex',
						flexWrap: 'wrap',
						justifyContent: JUSTIFY[textAlign] || 'left',
					},
				},
				meta
			)
		);
	} else {
		blocks.push(...meta);
	}

	if (isOn(skin.show_excerpt)) {
		blocks.push(
			createBlock('visual-portfolio/item-description', {
				excerptLength: parseInt(skin.excerpt_words_count, 10) || 15,
				...style,
			})
		);
	}

	if (
		skin.show_read_more &&
		!['false', false].includes(skin.show_read_more)
	) {
		blocks.push(
			createBlock('visual-portfolio/item-read-more', {
				text: skin.read_more_label,
				...style,
			})
		);
	}

	return blocks;
}

/**
 * The position of a cover's content for a legacy overlay alignment: `left`,
 * `top-center` and the like, centered vertically when no row is named.
 *
 * @param {string} align - legacy alignment.
 * @return {string} core content position.
 */
function getContentPosition(align) {
	const [first, second] = String(align || 'center').split('-');

	if (second) {
		return `${first} ${second}`;
	}

	return `center ${first}`;
}

/**
 * Overlay of a cover on hover for a legacy color, which can be a gradient.
 *
 * @param {string} color - legacy color.
 * @return {Object} attributes.
 */
function getHoverOverlay(color) {
	if (!color) {
		return {};
	}

	return {
		...(color.includes('gradient(')
			? { customHoverGradient: color }
			: { customHoverOverlayColor: color }),
		// The legacy color carries its own alpha.
		hoverDimRatio: 100,
	};
}

/**
 * Options of the legacy skin in use, without their prefix.
 *
 * @param {Object} legacy - attributes of the legacy block.
 * @return {Object} skin options.
 */
function getSkinOptions(legacy) {
	const prefix = `items_style_${legacy.items_style}__`;

	return Object.fromEntries(
		Object.entries(legacy)
			.filter(([name]) => name.startsWith(prefix))
			.map(([name, value]) => [name.slice(prefix.length), value])
	);
}

/**
 * The blocks that draw one item: an image with its caption below for the
 * Classic skin, a cover holding the caption for the others.
 *
 * @param {Object} legacy    - attributes of the legacy block.
 * @param {string} queryType - query type of the loop.
 * @return {Array} blocks.
 */
function getItemBlocks(legacy, queryType) {
	const skin = getSkinOptions(legacy);
	const click = getClickAttributes(legacy, queryType);
	const aspectRatio = ['grid', 'masonry'].includes(legacy.layout)
		? getAspectRatio(legacy[`${legacy.layout}_images_aspect_ratio`])
		: '';
	const sliderRatio =
		'slider' === legacy.layout &&
		'dynamic' === legacy.slider_items_height_type &&
		'custom' === legacy.slider_slides_per_view_type
			? `100/${parseFloat(legacy.slider_items_height_dynamic) || 80}`
			: '';
	const ratio = aspectRatio || sliderRatio;
	const radius = skin.images_rounded_corners
		? { style: { border: { radius: skin.images_rounded_corners } } }
		: {};

	if ('default' === legacy.items_style) {
		return [
			createBlock('visual-portfolio/item-image', {
				...click,
				...(ratio ? { aspectRatio: ratio } : {}),
				...radius,
			}),
			...getCaptionBlocks(
				skin,
				{
					textAlign: skin.caption_text_align,
					color: skin.caption_text_color,
					linkColor: skin.caption_links_color,
					titleLink: click,
				},
				queryType
			),
		];
	}

	// A skin Pro adds is drawn by the cover effect of its name, which Pro
	// registers, until the `vpf.loopLegacyTransform` filter maps it better.
	return getCoverBlocks(legacy, skin, click, ratio, radius, queryType);
}

/**
 * An item cover for a skin that draws the caption over the picture.
 *
 * @param {Object} legacy    - attributes of the legacy block.
 * @param {Object} skin      - options of the skin.
 * @param {Object} click     - click attributes.
 * @param {string} ratio     - aspect ratio, or empty for the picture's own.
 * @param {Object} radius    - border radius attributes.
 * @param {string} queryType - query type of the loop.
 * @return {Array} blocks.
 */
function getCoverBlocks(legacy, skin, click, ratio, radius, queryType) {
	const isEmerge = 'emerge' === legacy.items_style;
	const textAlign = isEmerge
		? skin.caption_text_align
		: String(skin.overlay_text_align || 'center')
				.split('-')
				.pop();
	const color =
		(isEmerge ? skin.caption_text_color : skin.overlay_text_color) ||
		COVER_TEXT_COLOR;

	return [
		createBlock(
			'visual-portfolio/item-cover',
			{
				effect: String(legacy.items_style).replace(/_/g, '-'),
				showContent:
					(isEmerge ? skin.show_caption : skin.show_overlay) ||
					'hover',
				aspectRatio: ratio,
				...(isEmerge
					? {}
					: {
							contentPosition: getContentPosition(
								skin.overlay_text_align
							),
						}),
				// Emerge draws its caption on a panel of its own, which the
				// cover paints with the hover overlay.
				...getHoverOverlay(
					(isEmerge
						? skin.caption_bg_color
						: skin.overlay_bg_color) ||
						COVER_PANEL_COLORS[legacy.items_style]
				),
				...click,
				style: {
					color: { text: color },
					...radius.style,
				},
			},
			getCaptionBlocks(
				skin,
				{
					textAlign,
					linkColor: skin.caption_links_color,
					titleLink: { clickAction: 'none' },
				},
				queryType
			)
		),
	];
}

/**
 * Item template attributes for the legacy layout.
 *
 * @param {Object} legacy - attributes of the legacy block.
 * @return {Object} attributes.
 */
function getTemplateAttributes(legacy) {
	const layoutType = LAYOUT_TYPES[legacy.layout] || 'grid';
	const gap = parseFloat(legacy.items_gap);
	const verticalGap = parseFloat(legacy.items_gap_vertical);
	const attributes = { layoutType, layoutColumnsMode: 'manual' };

	if (!Number.isNaN(gap)) {
		attributes.style = {
			spacing: {
				blockGap: {
					left: `${gap}px`,
					top: `${Number.isNaN(verticalGap) ? gap : verticalGap}px`,
				},
			},
		};
	}

	const columns = (count) =>
		clamp(parseInt(count, 10) || 3, [1, MAX_COLUMNS]);

	switch (legacy.layout) {
		case 'tiles':
			attributes.layoutTiles = legacy.tiles_type;
			break;
		case 'masonry':
		case 'grid':
			attributes.layoutColumnCount = columns(
				legacy[`${legacy.layout}_columns`]
			);
			break;
		case 'justified':
			Object.assign(attributes, {
				justifiedRowHeight: clamp(
					parseFloat(legacy.justified_row_height) || 200,
					JUSTIFIED_ROW_HEIGHT
				),
				justifiedRowHeightTolerance:
					parseFloat(legacy.justified_row_height_tolerance) || 0,
				justifiedMaxRowsCount:
					parseInt(legacy.justified_max_rows_count, 10) || 0,
				justifiedLastRow: legacy.justified_last_row || 'left',
			});
			break;
		case 'slider': {
			const autoplay = parseFloat(legacy.slider_autoplay) || 0;

			Object.assign(attributes, {
				carouselEffect: SLIDER_EFFECTS[legacy.slider_effect] || 'none',
				...('auto' === legacy.slider_slides_per_view_type
					? { carouselAutoWidth: true }
					: {
							layoutColumnCount: columns(
								legacy.slider_slides_per_view_custom
							),
						}),
				...(isOn(legacy.slider_centered_slides)
					? { carouselSnapAlign: 'center' }
					: {}),
				carouselRepeat: isOn(legacy.slider_loop),
				carouselFreeScroll: isOn(legacy.slider_free_mode),
				...(autoplay > 0
					? {
							carouselAutoplay: true,
							carouselAutoplayDelay: clamp(
								autoplay,
								AUTOPLAY_DELAY
							),
						}
					: {}),
				...('static' === legacy.slider_items_height_type
					? {
							carouselSlideHeight: `${
								parseFloat(legacy.slider_items_height_static) ||
								300
							}px`,
						}
					: {}),
			});
			break;
		}
		// no default
	}

	return attributes;
}

/**
 * Carousel controls the legacy slider had: arrows over the slides, dots and
 * thumbnails below them.
 *
 * @param {Object} legacy - attributes of the legacy block.
 * @return {{over: Array, after: Array}} blocks inside and after the template.
 */
function getCarouselControls(legacy) {
	if ('slider' !== legacy.layout) {
		return { over: [], after: [] };
	}

	const over = isOn(legacy.slider_arrows)
		? [
				createBlock('visual-portfolio/loop-carousel-nav', {}, [
					createBlock('visual-portfolio/loop-carousel-previous'),
					createBlock('visual-portfolio/loop-carousel-next'),
				]),
			]
		: [];
	const after = [];

	if (isOn(legacy.slider_bullets)) {
		after.push(
			createBlock('visual-portfolio/loop-carousel-nav', {}, [
				createBlock('visual-portfolio/loop-carousel-indicator'),
			])
		);
	}

	if (isOn(legacy.slider_thumbnails)) {
		after.push(
			createBlock('visual-portfolio/loop-carousel-thumbnails', {
				...('static' === legacy.slider_thumbnails_height_type
					? {
							thumbHeight:
								parseFloat(
									legacy.slider_thumbnails_height_static
								) || 100,
						}
					: {}),
			})
		);
	}

	return { over, after };
}

/**
 * The filter and the sort the legacy block placed above its items.
 *
 * @param {Object} legacy - attributes of the legacy block.
 * @return {Array} blocks.
 */
function getTopBlocks(legacy) {
	const top = legacy.layout_elements?.top || {};
	const elements = top.elements || [];
	const justifyContent = JUSTIFY[top.align] || 'center';
	const blocks = [];

	elements.forEach((element) => {
		if ('filter' === element) {
			blocks.push(
				createBlock(
					'visual-portfolio/loop-filter',
					{
						showCount: isOn(legacy.filter_show_count),
						// The legacy filter leaves "All" out when it has no label.
						showAllItem: !!legacy.filter_text_all,
						displayAsDropdown: 'dropdown' === legacy.filter,
						...('default' === legacy.filter
							? { className: 'is-style-fill' }
							: {}),
						layout: { type: 'flex', justifyContent },
					},
					legacy.filter_text_all
						? [
								createBlock(
									'visual-portfolio/loop-filter-item',
									{
										filter: '*',
										text: legacy.filter_text_all,
									}
								),
							]
						: []
				)
			);
		}

		if ('sort' === element) {
			blocks.push(
				createBlock('visual-portfolio/loop-sort', {
					displayAsDropdown: 'dropdown' === legacy.sort,
					layout: { type: 'flex', justifyContent },
				})
			);
		}
	});

	// Filter and sort shared one row.
	return 1 < blocks.length
		? [
				createBlock(
					'core/group',
					{
						layout: {
							type: 'flex',
							flexWrap: 'wrap',
							justifyContent,
						},
					},
					blocks
				),
			]
		: blocks;
}

/**
 * The pagination the legacy block placed below its items.
 *
 * @param {Object} legacy - attributes of the legacy block.
 * @return {Array} blocks.
 */
function getPaginationBlocks(legacy) {
	const bottom = legacy.layout_elements?.bottom || {};

	if (!(bottom.elements || []).includes('pagination')) {
		return [];
	}

	const justifyContent = JUSTIFY[bottom.align] || 'center';
	const type = legacy.pagination;

	if ('paged' === type) {
		const arrows = isOn(legacy.pagination_paged__show_arrows);

		return [
			createBlock(
				'visual-portfolio/loop-pagination',
				{
					layout: {
						type: 'flex',
						justifyContent: arrows
							? 'space-between'
							: justifyContent,
					},
				},
				[
					arrows &&
						createBlock(
							'visual-portfolio/loop-pagination-previous'
						),
					isOn(legacy.pagination_paged__show_numbers) &&
						createBlock('visual-portfolio/loop-pagination-numbers'),
					arrows &&
						createBlock('visual-portfolio/loop-pagination-next'),
				].filter(Boolean)
			),
		];
	}

	const prefix = 'infinite' === type ? 'infinite' : 'load_more';
	const endText = legacy[`pagination_${prefix}_text_end_list`];

	return [
		createBlock(
			'visual-portfolio/loop-pagination',
			{ layout: { type: 'flex', justifyContent } },
			[
				createBlock('visual-portfolio/loop-pagination-trigger', {
					triggerType: 'infinite' === type ? 'infinite' : 'load-more',
					label: legacy[`pagination_${prefix}_text_load`],
					loadingLabel: legacy[`pagination_${prefix}_text_loading`],
				}),
				!isOn(legacy.pagination_hide_on_end) &&
					createBlock(
						'visual-portfolio/loop-pagination-end',
						{},
						endText
							? [
									createBlock('core/paragraph', {
										content: endText,
									}),
								]
							: []
					),
			].filter(Boolean)
		),
	];
}

/**
 * Custom CSS of the legacy block as block custom CSS, where `selector` named
 * the gallery and `&` names the block.
 *
 * @param {string} css - legacy custom CSS, encoded as the block saves it.
 * @return {Object} attributes.
 */
function getCustomCss(css) {
	const decoded = String(maybeDecode(css || '') || '').trim();

	return decoded ? { css: decoded.replace(/\bselector\b/g, '&') } : {};
}

/**
 * A Gallery Loop that shows what a legacy block shows.
 *
 * Pure, because the block switcher runs it for its preview as well.
 *
 * @param {Object} attributes - attributes of the legacy block or the settings of a Saved Layout.
 * @param {Object} wrapper    - `align`, `className` and `anchor` of the block being replaced.
 * @return {Object|Array} block or blocks.
 */
export function convertLegacyBlock(attributes, wrapper = {}) {
	const legacy = getLegacyAttributes(attributes);
	const queryType = getLegacyQueryType(legacy);
	const { align, className, anchor } = { ...legacy, ...wrapper };
	const { over, after } = getCarouselControls(legacy);
	const style = getCustomCss(legacy.custom_css);

	const innerBlocks = [
		...getTopBlocks(legacy),
		createBlock(
			'visual-portfolio/item-template',
			getTemplateAttributes(legacy),
			[...getItemBlocks(legacy, queryType), ...over]
		),
		...after,
		...getPaginationBlocks(legacy),
		...('hide' !== legacy.no_items_action
			? [
					createBlock('visual-portfolio/loop-no-results', {}, [
						createBlock('core/paragraph', {
							content: legacy.no_items_notice,
						}),
					]),
				]
			: []),
	];

	const lightbox = getLightbox(legacy);
	const loop = createBlock(
		LOOP_BLOCK,
		{
			...(ALIGNMENTS.includes(align) ? { align } : {}),
			...(className ? { className } : {}),
			...(anchor ? { anchor } : {}),
			...getQueryAttributes(legacy, queryType),
			...(Object.keys(lightbox).length ? { lightbox } : {}),
			...(Object.keys(style).length ? { style } : {}),
		},
		innerBlocks
	);

	/**
	 * Filters the Gallery Loop a legacy block converts into, for the settings
	 * an extension added to the legacy block.
	 *
	 * @param {Object|Array} loop   - converted block, or blocks.
	 * @param {Object}       legacy - every attribute of the legacy block, defaults resolved.
	 */
	return applyFilters('vpf.loopLegacyTransform', loop, legacy);
}
