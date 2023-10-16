import { addFilter } from '@wordpress/hooks';

// live reload
addFilter(
	'vpf.editor.changed-attributes',
	'vpf/editor/changed-attributes/live-reload',
	(data) => {
		if (!data.$framePortfolio) {
			return data;
		}

		let reload = false;

		Object.keys(data.attributes).forEach((name) => {
			const val = data.attributes[name];

			switch (name) {
				case 'tiles_type':
				case 'masonry_columns':
				case 'masonry_images_aspect_ratio':
				case 'grid_columns':
				case 'grid_images_aspect_ratio':
				case 'justified_row_height':
				case 'justified_row_height_tolerance':
				case 'justified_max_rows_count':
				case 'justified_last_row':
				case 'slider_effect':
				case 'slider_speed':
				case 'slider_autoplay':
				case 'slider_autoplay_hover_pause':
				case 'slider_centered_slides':
				case 'slider_loop':
				case 'slider_free_mode':
				case 'slider_free_mode_sticky':
				case 'slider_bullets_dynamic':
				case 'items_gap':
				case 'items_gap_vertical': {
					data.$framePortfolio.attr(
						`data-vp-${name.replace(/_/g, '-')}`,
						val
					);
					data.$framePortfolio.vpf('init');

					break;
				}
				case 'items_style_default__align':
				case 'items_style_fade__align':
				case 'items_style_fly__align':
				case 'items_style_emerge__align': {
					let allAlignClasses = '';

					[
						'left',
						'center',
						'right',
						'top-left',
						'top-center',
						'top-right',
						'bottom-left',
						'bottom-center',
						'bottom-right',
					].forEach((alignName) => {
						allAlignClasses += `${
							allAlignClasses ? ' ' : ''
						}vp-portfolio__item-align-${alignName}`;
					});

					data.$framePortfolio
						.find('.vp-portfolio__item-overlay')
						.removeClass(allAlignClasses)
						.addClass(`vp-portfolio__item-align-${val}`);

					break;
				}
				case 'items_style_default__caption_text_align':
				case 'items_style_fade__caption_text_align':
				case 'items_style_fly__caption_text_align':
				case 'items_style_emerge__caption_text_align': {
					let allAlignClasses = '';

					[
						'left',
						'center',
						'right',
						'top-left',
						'top-center',
						'top-right',
						'bottom-left',
						'bottom-center',
						'bottom-right',
					].forEach((alignName) => {
						allAlignClasses += `${
							allAlignClasses ? ' ' : ''
						}vp-portfolio__item-caption-text-align-${alignName}`;
					});

					data.$framePortfolio
						.find('.vp-portfolio__item-caption')
						.removeClass(allAlignClasses)
						.addClass(
							`vp-portfolio__item-caption-text-align-${val}`
						);

					break;
				}
				case 'items_style_default__overlay_text_align':
				case 'items_style_fade__overlay_text_align':
				case 'items_style_fly__overlay_text_align':
				case 'items_style_emerge__overlay_text_align': {
					let allAlignClasses = '';

					[
						'left',
						'center',
						'right',
						'top-left',
						'top-center',
						'top-right',
						'bottom-left',
						'bottom-center',
						'bottom-right',
					].forEach((alignName) => {
						allAlignClasses += `${
							allAlignClasses ? ' ' : ''
						}vp-portfolio__item-overlay-text-align-${alignName}`;
					});

					data.$framePortfolio
						.find('.vp-portfolio__item-overlay')
						.removeClass(allAlignClasses)
						.addClass(
							`vp-portfolio__item-overlay-text-align-${val}`
						);

					break;
				}
				// prevent some options reload
				case 'list_name':
					// no reload
					break;
				default:
					reload = reload || data.reload;
					break;
			}
		});

		return {
			...data,
			reload,
		};
	}
);
