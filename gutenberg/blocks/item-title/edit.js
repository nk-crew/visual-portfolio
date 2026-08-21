/**
 * WordPress dependencies
 */
import {
	AlignmentControl,
	BlockControls,
	HeadingLevelDropdown,
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	ExternalLink,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';

export default function ItemTitleEdit({
	attributes: { level, levelOptions, textAlign, isLink, rel, linkTarget },
	setAttributes,
	context: { 'vp/itemTitle': itemTitle, 'vp/itemUrl': itemUrl },
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const TagName = level === 0 ? 'p' : `h${level}`;
	const blockProps = useBlockProps({
		className: classnames({
			[`has-text-align-${textAlign}`]: textAlign,
		}),
	});
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
						<AlignmentControl
							value={textAlign}
							onChange={(nextAlign) =>
								setAttributes({ textAlign: nextAlign })
							}
						/>
					</BlockControls>
					<InspectorControls>
						<ToolsPanel
							label={__('Settings', 'visual-portfolio')}
							dropdownMenuProps={dropdownMenuProps}
							resetAll={() =>
								setAttributes({
									isLink: false,
									rel: '',
									linkTarget: '_self',
								})
							}
						>
							<ToolsPanelItem
								label={__(
									'Make title a link',
									'visual-portfolio'
								)}
								isShownByDefault
								hasValue={() => isLink}
								onDeselect={() =>
									setAttributes({ isLink: false })
								}
							>
								<ToggleControl
									label={__(
										'Make title a link',
										'visual-portfolio'
									)}
									checked={isLink}
									onChange={() =>
										setAttributes({ isLink: !isLink })
									}
								/>
							</ToolsPanelItem>
							{isLink && (
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
				{isLink ? (
					// Inert in the editor - it only carries the link styling.
					<a
						href={itemUrl || '#'}
						target={linkTarget}
						rel={rel}
						onClick={(event) => event.preventDefault()}
					>
						{title}
					</a>
				) : (
					title
				)}
			</TagName>
		</>
	);
}
