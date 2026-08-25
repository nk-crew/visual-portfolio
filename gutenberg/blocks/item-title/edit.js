/**
 * WordPress dependencies
 */
import {
	BlockControls,
	HeadingLevelDropdown,
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	ExternalLink,
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

const CLICK_ACTION_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Open the item', 'visual-portfolio'), value: 'url' },
	{ label: __('Open the lightbox', 'visual-portfolio'), value: 'popup' },
];

export default function ItemTitleEdit({
	attributes,
	setAttributes,
	context: { 'vp/itemTitle': itemTitle, 'vp/itemUrl': itemUrl },
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { level, levelOptions, rel, linkTarget } = attributes;

	// A title saved before the click action existed keeps meaning what its link
	// toggle said - only an unset action falls back to it.
	const clickAction =
		attributes.clickAction ?? (attributes.isLink ? 'url' : 'none');

	const TagName = level === 0 ? 'p' : `h${level}`;
	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	const title = itemTitle
		? decodeEntities(itemTitle)
		: __('Gallery item title', 'visual-portfolio');

	return (
		<>
			{blockEditingMode === 'default' && (
				<>
					<BlockControls group="block">
						<HeadingLevelDropdown
							value={level}
							options={levelOptions}
							onChange={(newLevel) =>
								setAttributes({ level: newLevel })
							}
						/>
					</BlockControls>
					<InspectorControls>
						<ToolsPanel
							label={__('Settings', 'visual-portfolio')}
							dropdownMenuProps={dropdownMenuProps}
							resetAll={(filters) =>
								setAttributes(
									getResetAllValues(filters, {
										clickAction: 'none',
										isLink: false,
										rel: '',
										linkTarget: '_self',
									})
								)
							}
						>
							<ToolsPanelItem
								label={__('On click', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => 'none' !== clickAction}
								onDeselect={() =>
									setAttributes({ clickAction: 'none' })
								}
							>
								<SelectControl
									label={__('On click', 'visual-portfolio')}
									value={clickAction}
									options={CLICK_ACTION_OPTIONS}
									onChange={(value) =>
										setAttributes({ clickAction: value })
									}
								/>
							</ToolsPanelItem>
							{'url' === clickAction && (
								<>
									<ToolsPanelItem
										label={__(
											'Open in new tab',
											'visual-portfolio'
										)}
										isShownByDefault
										hasValue={() => linkTarget === '_blank'}
										onDeselect={() =>
											setAttributes({
												linkTarget: '_self',
											})
										}
									>
										<ToggleControl
											label={__(
												'Open in new tab',
												'visual-portfolio'
											)}
											checked={linkTarget === '_blank'}
											onChange={(value) =>
												setAttributes({
													linkTarget: value
														? '_blank'
														: '_self',
												})
											}
										/>
									</ToolsPanelItem>
									<ToolsPanelItem
										label={__(
											'Link relation',
											'visual-portfolio'
										)}
										isShownByDefault
										hasValue={() => !!rel}
										onDeselect={() =>
											setAttributes({ rel: '' })
										}
									>
										<TextControl
											label={__(
												'Link relation',
												'visual-portfolio'
											)}
											help={createInterpolateElement(
												__(
													'The <a>Link Relation</a> attribute defines the relationship between a linked resource and the current document.',
													'visual-portfolio'
												),
												{
													a: (
														<ExternalLink href="https://developer.mozilla.org/docs/Web/HTML/Attributes/rel" />
													),
												}
											)}
											value={rel}
											onChange={(newRel) =>
												setAttributes({ rel: newRel })
											}
										/>
									</ToolsPanelItem>
								</>
							)}
						</ToolsPanel>
					</InspectorControls>
				</>
			)}
			<TagName {...blockProps}>
				{'none' === clickAction ? (
					title
				) : (
					// Inert in the editor - it only carries the link styling.
					<a
						href={('url' === clickAction && itemUrl) || '#'}
						target={linkTarget}
						rel={rel}
						onClick={(event) => event.preventDefault()}
					>
						{title}
					</a>
				)}
			</TagName>
		</>
	);
}
