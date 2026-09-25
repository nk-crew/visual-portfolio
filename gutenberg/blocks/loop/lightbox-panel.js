import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	SelectControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { mayOpenLightbox } from '../../utils/click-actions';
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';

// The caption sources of the classic gallery's lightbox, and the defaults the
// server falls back to (`Visual_Portfolio_Popup::get_item_popup()`).
const SOURCES = [
	{ value: 'none', label: __('None', 'visual-portfolio') },
	{ value: 'title', label: __('Image Title', 'visual-portfolio') },
	{ value: 'caption', label: __('Image Caption', 'visual-portfolio') },
	{ value: 'alt', label: __('Image Alt', 'visual-portfolio') },
	{
		value: 'description',
		label: __('Image Description', 'visual-portfolio'),
	},
	{ value: 'item_title', label: __('Item Title', 'visual-portfolio') },
	{
		value: 'item_description',
		label: __('Item Description', 'visual-portfolio'),
	},
	{ value: 'item_excerpt', label: __('Item Excerpt', 'visual-portfolio') },
	{ value: 'item_author', label: __('Item Author', 'visual-portfolio') },
];

const DEFAULTS = {
	titleSource: 'item_title',
	descriptionSource: 'item_excerpt',
};

/**
 * The caption of the lightbox, shown while a block of the loop opens it.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - loop attributes.
 * @param {Function} props.setAttributes - loop attribute setter.
 * @param {string}   props.clientId      - loop client id.
 *
 * @return {Element|null} component.
 */
export default function LightboxPanel({ attributes, setAttributes, clientId }) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();
	const opensLightbox = useSelect(
		(select) => {
			const editor = select(blockEditorStore);

			return editor
				.getClientIdsOfDescendants(clientId)
				.some((id) =>
					mayOpenLightbox(editor.getBlockAttributes(id)?.clickAction)
				);
		},
		[clientId]
	);

	if (!opensLightbox) {
		return null;
	}

	const lightbox = attributes.lightbox || {};
	const set = (key, value) => {
		const next = { ...lightbox, [key]: value };

		// A source back at its default leaves no key behind.
		if (DEFAULTS[key] === value) {
			delete next[key];
		}

		setAttributes({ lightbox: next });
	};

	const items = [
		{
			key: 'titleSource',
			label: __('Title', 'visual-portfolio'),
			help: __(
				'What the lightbox shows as the title of a slide.',
				'visual-portfolio'
			),
		},
		{
			key: 'descriptionSource',
			label: __('Description', 'visual-portfolio'),
			help: __(
				'What the lightbox shows under the title.',
				'visual-portfolio'
			),
		},
	];

	return (
		<ToolsPanel
			label={__('Lightbox', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={() => setAttributes({ lightbox: {} })}
		>
			{items.map(({ key, label, help }) => (
				<ToolsPanelItem
					key={key}
					label={label}
					isShownByDefault
					hasValue={() => !!lightbox[key]}
					onDeselect={() => set(key, DEFAULTS[key])}
				>
					<SelectControl
						label={label}
						help={help}
						value={lightbox[key] || DEFAULTS[key]}
						options={SOURCES}
						onChange={(value) => set(key, value)}
					/>
				</ToolsPanelItem>
			))}
		</ToolsPanel>
	);
}
