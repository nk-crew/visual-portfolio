import { PanelBody, SelectControl } from '@wordpress/components';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import GalleryControl from '../components/gallery-control';
import { convertModernToLegacy } from '../utils/convert-legacy-attributes';
import { ImagesIcon } from './icons';
import { registerLoopSource } from './registry';

// Per-image fields, registered from PHP together with the legacy gallery
// control. Temporary: the gallery manager owns these fields, and the
// `VP.LoopImageSettings` slot replaces `vpf_extend_image_controls` with them.
const { controls: registeredControls } = window.VPGutenbergVariables;

const TEXT_SOURCE_OPTIONS = [
	{ value: 'none', label: __('None', 'visual-portfolio') },
	{ value: 'custom', label: __('Custom', 'visual-portfolio') },
	{ value: 'title', label: __('Image Title', 'visual-portfolio') },
	{ value: 'caption', label: __('Image Caption', 'visual-portfolio') },
	{ value: 'alt', label: __('Image Alt', 'visual-portfolio') },
	{
		value: 'description',
		label: __('Image Description', 'visual-portfolio'),
	},
];

const ORDER_BY_OPTIONS = [
	{ value: 'default', label: __('Manual', 'visual-portfolio') },
	{ value: 'title', label: __('Item Title', 'visual-portfolio') },
	{ value: 'description', label: __('Item Description', 'visual-portfolio') },
	{ value: 'image_title', label: __('Image Title', 'visual-portfolio') },
	{ value: 'image_caption', label: __('Image Caption', 'visual-portfolio') },
	{ value: 'image_alt', label: __('Image Alt', 'visual-portfolio') },
	{
		value: 'image_description',
		label: __('Image Description', 'visual-portfolio'),
	},
	{ value: 'date', label: __('Image Uploaded', 'visual-portfolio') },
	{ value: 'rand', label: __('Random', 'visual-portfolio') },
];

const ORDER_OPTIONS = [
	{ value: 'asc', label: __('Ascending', 'visual-portfolio') },
	{ value: 'desc', label: __('Descending', 'visual-portfolio') },
];

/**
 * Every category used by at least one image.
 *
 * The filter block reads `imagesQuery.categories`, so it has to follow what the
 * images themselves carry.
 *
 * @param {Array} images - gallery images.
 * @return {Array} categories.
 */
function getUsedCategories(images) {
	const categories = new Set();

	images.forEach((image) => {
		if (Array.isArray(image.categories)) {
			image.categories.forEach((category) => {
				categories.add(category);
			});
		}
	});

	return Array.from(categories);
}

/**
 * Settings of the images source.
 *
 * The gallery grid is still the legacy `GalleryControl`: it is driven by the
 * per-image fields registered in PHP and by the legacy attribute names, so it
 * gets legacy-shaped attributes handed to it. This is the seam - the native
 * gallery manager and the `VP.LoopImageSettings` slot replace this component,
 * and nothing outside this file knows how the images are edited.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - loop attributes.
 * @param {Function} props.setAttributes - loop attribute setter.
 * @param {string}   props.clientId      - loop client id.
 * @return {Element} component.
 */
function ImagesSettingsPanel({ attributes, setAttributes, clientId }) {
	const { imagesQuery } = attributes;
	const {
		images = [],
		orderBy,
		order,
		titlesSource,
		descriptionsSource,
	} = imagesQuery || {};

	const update = (values) =>
		setAttributes({ imagesQuery: { ...imagesQuery, ...values } });

	const legacyAttributes = useMemo(
		() => convertModernToLegacy(attributes),
		[attributes]
	);

	useEffect(() => {
		const used = getUsedCategories(images);

		if (
			JSON.stringify(imagesQuery?.categories || []) !==
			JSON.stringify(used)
		) {
			setAttributes({
				imagesQuery: { ...imagesQuery, categories: used },
			});
		}
	}, [images, imagesQuery, setAttributes]);

	return (
		<PanelBody title={__('Media Settings', 'visual-portfolio')}>
			<GalleryControl
				name="images"
				imageControls={registeredControls?.images?.image_controls}
				focalPoint={registeredControls?.images?.focal_point}
				attributes={legacyAttributes}
				value={images}
				onChange={(value) => update({ images: value })}
				clientId={clientId}
			/>

			<SelectControl
				label={__('Items Title Source', 'visual-portfolio')}
				value={titlesSource}
				options={TEXT_SOURCE_OPTIONS}
				onChange={(value) => update({ titlesSource: value })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<SelectControl
				label={__('Items Description Source', 'visual-portfolio')}
				value={descriptionsSource}
				options={TEXT_SOURCE_OPTIONS}
				onChange={(value) => update({ descriptionsSource: value })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<SelectControl
				label={__('Order By', 'visual-portfolio')}
				value={orderBy}
				options={ORDER_BY_OPTIONS}
				onChange={(value) => update({ orderBy: value })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<SelectControl
				label={__('Order Direction', 'visual-portfolio')}
				value={order}
				options={ORDER_OPTIONS}
				onChange={(value) => update({ order: value })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}

registerLoopSource({
	name: 'images',
	title: __('Media', 'visual-portfolio'),
	icon: <ImagesIcon />,
	category: 'core',
	SettingsPanel: ImagesSettingsPanel,
});
