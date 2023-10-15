import { TextareaControl, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Change Title and Description controls when used dynamic source option.
 *
 * @param props
 */
function RenderTitleAndDescriptionImageControls(props) {
	const { data, textSource, img, name, index } = props;

	const { imgData } = useSelect(
		(select) => {
			const { getMedia } = select('core');

			return {
				imgData: img.id ? getMedia(img.id) : null,
			};
		},
		[img]
	);

	let text = '';
	let description = '';

	switch (textSource) {
		case 'title':
			text = imgData?.title?.raw || '';
			description = __(
				'Loaded automatically from the image Title',
				'visual-portfolio'
			);
			break;
		case 'caption':
			text = imgData?.caption?.raw || '';
			description = __(
				'Loaded automatically from the image Caption',
				'visual-portfolio'
			);
			break;
		case 'alt':
			text = imgData?.alt_text || '';
			description = __(
				'Loaded automatically from the image Alt',
				'visual-portfolio'
			);
			break;
		case 'description':
			text = imgData?.description?.raw || '';
			description = __(
				'Loaded automatically from the image Description',
				'visual-portfolio'
			);
			break;
		// no default
	}

	const ThisControl = name === 'title' ? TextControl : TextareaControl;

	return (
		<ThisControl
			className={`vpf-control-wrap vpf-control-wrap-${
				name === 'title' ? 'text' : 'textarea'
			}`}
			key={`${
				img.id || img.imgThumbnailUrl || img.imgUrl
			}-${index}-${name}`}
			label={data.label}
			value={text}
			help={description}
			disabled
		/>
	);
}

// Change gallery image Title and Description control .
addFilter(
	'vpf.editor.gallery-controls-render',
	'vpf/editor/gallery-controls-render/title-and-description-render-by-source',
	(control, data, props, controlData) => {
		const { attributes, img } = props;
		const { name, index } = controlData;

		if (
			(name === 'title' &&
				attributes.images_titles_source &&
				attributes.images_titles_source !== 'custom') ||
			(name === 'description' &&
				attributes.images_descriptions_source &&
				attributes.images_descriptions_source !== 'custom')
		) {
			control = (
				<RenderTitleAndDescriptionImageControls
					{...{
						data,
						textSource: attributes[`images_${name}s_source`],
						img,
						name,
						index,
					}}
				/>
			);
		}

		return control;
	}
);
