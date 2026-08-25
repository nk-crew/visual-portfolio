/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	RangeControl,
	SelectControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

// Keep in sync with `Visual_Portfolio_Block_Item_Description::DEFAULT_EXCERPT_LENGTH`.
const DEFAULT_EXCERPT_LENGTH = 15;

/**
 * Reduce HTML to the text a reader would see.
 *
 * @param {string} html Source HTML.
 * @return {string} Plain text.
 */
function stripTags(html) {
	const doc = new window.DOMParser().parseFromString(html, 'text/html');

	return doc.body.textContent || '';
}

/**
 * @param {string} text  Plain text.
 * @param {number} count Word limit.
 * @return {string} Text cut to the word limit.
 */
function trimWords(text, count) {
	const words = text.trim().split(/\s+/);

	if (words.length <= count) {
		return text;
	}

	return `${words.slice(0, count).join(' ')}...`;
}

export default function ItemDescriptionEdit({
	attributes: { source, excerptLength },
	setAttributes,
	context: { 'vp/itemExcerpt': itemExcerpt, 'vp/itemContent': itemContent },
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	let preview;

	if (source === 'content') {
		preview = stripTags(itemContent || '');
	} else {
		// The context excerpt is trimmed to the default length, so a longer setting
		// has nothing left to show and falls back to the content. The server can do
		// better - it still prefers a handwritten post excerpt.
		const raw =
			excerptLength > DEFAULT_EXCERPT_LENGTH
				? itemContent || itemExcerpt
				: itemExcerpt;

		preview = trimWords(stripTags(raw || ''), excerptLength);
	}

	preview = preview
		? decodeEntities(preview)
		: __('Gallery item description', 'visual-portfolio');

	// The render callback prints the whole content in a `div`, the way core's
	// Post Content block does, and only an excerpt in a `p`.
	const TagName = source === 'content' ? 'div' : 'p';

	return (
		<>
			{blockEditingMode === 'default' && (
				<InspectorControls>
					<ToolsPanel
						label={__('Settings', 'visual-portfolio')}
						dropdownMenuProps={dropdownMenuProps}
						resetAll={(filters) =>
							setAttributes(
								getResetAllValues(filters, {
									source: 'excerpt',
									excerptLength: DEFAULT_EXCERPT_LENGTH,
								})
							)
						}
					>
						<ToolsPanelItem
							label={__('Source', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => source !== 'excerpt'}
							onDeselect={() =>
								setAttributes({ source: 'excerpt' })
							}
						>
							<SelectControl
								label={__('Source', 'visual-portfolio')}
								value={source}
								options={[
									{
										label: __(
											'Excerpt',
											'visual-portfolio'
										),
										value: 'excerpt',
									},
									{
										label: __(
											'Full content',
											'visual-portfolio'
										),
										value: 'content',
									},
								]}
								onChange={(newSource) =>
									setAttributes({ source: newSource })
								}
							/>
						</ToolsPanelItem>
						{source === 'excerpt' && (
							<ToolsPanelItem
								label={__(
									'Max number of words',
									'visual-portfolio'
								)}
								isShownByDefault
								hasValue={() =>
									excerptLength !== DEFAULT_EXCERPT_LENGTH
								}
								onDeselect={() =>
									setAttributes({
										excerptLength: DEFAULT_EXCERPT_LENGTH,
									})
								}
							>
								<RangeControl
									label={__(
										'Max number of words',
										'visual-portfolio'
									)}
									value={excerptLength}
									onChange={(value) =>
										setAttributes({
											excerptLength: value,
										})
									}
									min={1}
									max={100}
								/>
							</ToolsPanelItem>
						)}
					</ToolsPanel>
				</InspectorControls>
			)}
			<TagName {...blockProps}>{preview}</TagName>
		</>
	);
}
