import {
	SelectControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../utils/tools-panel';

import GalleryManager, { getUsedCategories } from './gallery-manager';
import { ImagesIcon } from './icons';
import { registerLoopSource } from './registry';

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

// Defaults of `imagesQuery`, from `blocks/loop/block.json`. The images and the
// categories they carry are left out on purpose: no reset may empty the gallery
// the panel exists to edit.
const DEFAULTS = {
	titlesSource: 'custom',
	descriptionsSource: 'custom',
	orderBy: 'default',
	order: 'asc',
};

/**
 * Settings of the images source.
 *
 * This file is the only one that knows how the images of a loop are edited: the
 * gallery manager it mounts is native, and per-image fields are extended
 * through the `VP.LoopImageSettings` slot rather than through the PHP control
 * registry the legacy gallery control reads.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - loop attributes.
 * @param {Function} props.setAttributes - loop attribute setter.
 * @param {string}   props.clientId      - loop client id.
 * @return {Element} component.
 */
function ImagesSettingsPanel({ attributes, setAttributes, clientId }) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { imagesQuery } = attributes;
	const {
		images = [],
		orderBy = DEFAULTS.orderBy,
		order = DEFAULTS.order,
		titlesSource = DEFAULTS.titlesSource,
		descriptionsSource = DEFAULTS.descriptionsSource,
	} = imagesQuery || {};

	const update = (values) =>
		setAttributes({ imagesQuery: { ...imagesQuery, ...values } });

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
		<ToolsPanel
			label={__('Settings', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			panelId={clientId}
			resetAll={(filters) => update(getResetAllValues(filters, DEFAULTS))}
		>
			<ToolsPanelItem
				label={__('Images', 'visual-portfolio')}
				isShownByDefault
				hasValue={() => false}
				panelId={clientId}
			>
				<GalleryManager
					images={images}
					onChange={(value) => update({ images: value })}
					clientId={clientId}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={__('Item Text Source', 'visual-portfolio')}
				hasValue={() =>
					DEFAULTS.titlesSource !== titlesSource ||
					DEFAULTS.descriptionsSource !== descriptionsSource
				}
				onDeselect={() =>
					update({
						titlesSource: DEFAULTS.titlesSource,
						descriptionsSource: DEFAULTS.descriptionsSource,
					})
				}
				panelId={clientId}
			>
				<VStack spacing={4}>
					<SelectControl
						label={__('Items Title Source', 'visual-portfolio')}
						help={__(
							'Which field of the image the title is read from.',
							'visual-portfolio'
						)}
						value={titlesSource}
						options={TEXT_SOURCE_OPTIONS}
						onChange={(value) => update({ titlesSource: value })}
					/>

					<SelectControl
						label={__(
							'Items Description Source',
							'visual-portfolio'
						)}
						help={__(
							'Which field of the image the description is read from.',
							'visual-portfolio'
						)}
						value={descriptionsSource}
						options={TEXT_SOURCE_OPTIONS}
						onChange={(value) =>
							update({ descriptionsSource: value })
						}
					/>
				</VStack>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={__('Order', 'visual-portfolio')}
				hasValue={() =>
					DEFAULTS.orderBy !== orderBy || DEFAULTS.order !== order
				}
				onDeselect={() =>
					update({
						orderBy: DEFAULTS.orderBy,
						order: DEFAULTS.order,
					})
				}
				panelId={clientId}
			>
				<VStack spacing={4}>
					<SelectControl
						label={__('Order By', 'visual-portfolio')}
						value={orderBy}
						options={ORDER_BY_OPTIONS}
						onChange={(value) => update({ orderBy: value })}
					/>

					<SelectControl
						label={__('Order Direction', 'visual-portfolio')}
						value={order}
						options={ORDER_OPTIONS}
						onChange={(value) => update({ order: value })}
					/>
				</VStack>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}

registerLoopSource({
	name: 'images',
	title: __('Media', 'visual-portfolio'),
	icon: <ImagesIcon />,
	category: 'core',
	SettingsPanel: ImagesSettingsPanel,
});
