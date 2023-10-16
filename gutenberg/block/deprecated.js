import save from './save';

const { attributes } = window.VPGutenbergVariables;

const V2_23_0_ATTRIBUTES = {
	// Align.
	items_style_default__align: 'items_style_default__caption_text_align',
	items_style_fade__align: 'items_style_fade__overlay_text_align',
	items_style_fly__align: 'items_style_fly__overlay_text_align',
	items_style_emerge__align: 'items_style_emerge__caption_text_align',
	items_style_caption_move__align:
		'items_style_caption_move__caption_text_align',

	// Color.
	items_style_default__bg_color: 'items_style_default__overlay_bg_color',
	items_style_default__text_color: 'items_style_default__overlay_text_color',
	items_style_default__meta_text_color:
		'items_style_default__caption_text_color',
	items_style_default__meta_links_color:
		'items_style_default__caption_links_color',
	items_style_default__meta_links_hover_color:
		'items_style_default__caption_links_hover_color',
	items_style_fade__bg_color: 'items_style_fade__overlay_bg_color',
	items_style_fade__text_color: 'items_style_fade__overlay_text_color',
	items_style_fly__bg_color: 'items_style_fly__overlay_bg_color',
	items_style_fly__text_color: 'items_style_fly__overlay_text_color',
	items_style_emerge__bg_color: 'items_style_emerge__caption_bg_color',
	items_style_emerge__text_color: 'items_style_emerge__caption_text_color',
	items_style_emerge__links_color: 'items_style_emerge__caption_links_color',
	items_style_emerge__links_hover_color:
		'items_style_emerge__caption_links_hover_color',
	items_style_emerge__img_overlay_bg_color:
		'items_style_emerge__overlay_bg_color',
	'items_style_caption-move__bg_color':
		'items_style_caption-move__caption_bg_color',
	'items_style_caption-move__text_color':
		'items_style_caption-move__caption_text_color',
	'items_style_caption-move__img_overlay_bg_color':
		'items_style_caption-move__overlay_bg_color',
	'items_style_caption-move__overlay_text_color':
		'items_style_caption-move__overlay_text_color',

	// Move Under Image.
	items_style_fade__move_overlay_under_image:
		'items_style_fade__overlay_under_image',
	items_style_fly__move_overlay_under_image:
		'items_style_fly__overlay_under_image',
	items_style_emerge__move_overlay_under_image:
		'items_style_emerge__caption_under_image',
	'items_style_caption-move__move_overlay_under_image':
		'items_style_caption-move__caption_under_image',
};

const V2_23_0_BORDER_RADIUS = [
	'items_style_default__images_rounded_corners',
	'items_style_fade__images_rounded_corners',
	'items_style_fly__images_rounded_corners',
	'items_style_emerge__images_rounded_corners',
	'items_style_caption_move__images_rounded_corners',
];

export default [
	// v3.0.0
	// Changed items style builtin_controls structure.
	{
		attributes: {
			...attributes,
			...(() => {
				const attrs = {};
				Object.keys(V2_23_0_ATTRIBUTES).forEach((k) => {
					attrs[k] = { type: 'string' };
				});
				return attrs;
			})(),
			...(() => {
				const attrs = {};
				V2_23_0_BORDER_RADIUS.forEach((k) => {
					attrs[k] = { type: 'number', default: 0 };
				});
				return attrs;
			})(),
		},
		migrate(oldAttributes) {
			const newAttributes = { ...oldAttributes };

			Object.keys(V2_23_0_ATTRIBUTES).forEach((k) => {
				if (k in newAttributes) {
					if (newAttributes[k]) {
						newAttributes[V2_23_0_ATTRIBUTES[k]] = newAttributes[k];
					}

					delete newAttributes[k];
				}
			});

			V2_23_0_BORDER_RADIUS.forEach((k) => {
				if (typeof newAttributes[k] === 'number') {
					newAttributes[k] = `${newAttributes[k]}px`;
				}
			});

			return [newAttributes, []];
		},
		isEligible(attrs) {
			const keys = Object.keys(V2_23_0_ATTRIBUTES);
			let eligible = false;

			keys.forEach((key) => {
				if (!eligible && key in attrs) {
					eligible = true;
				}
			});

			V2_23_0_BORDER_RADIUS.forEach((k) => {
				if (!eligible && typeof attrs[k] === 'number') {
					eligible = true;
				}
			});

			return eligible;
		},
		save,
	},
];
