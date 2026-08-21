/**
 * WordPress dependencies
 */
import {
	AlignmentControl,
	BlockControls,
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

const DEFAULT_PREFIX = 'by ';

export default function ItemAuthorEdit({
	attributes: { textAlign, showPrefix, prefix, isLink, rel, linkTarget },
	setAttributes,
	context: { 'vp/itemAuthor': itemAuthor, 'vp/itemAuthorUrl': itemAuthorUrl },
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps({
		className: classnames({
			[`has-text-align-${textAlign}`]: textAlign,
		}),
	});
	const blockEditingMode = useBlockEditingMode();

	const author = itemAuthor
		? decodeEntities(itemAuthor)
		: __('Gallery item author', 'visual-portfolio');

	return (
		<>
			{blockEditingMode === 'default' && (
				<>
					<BlockControls group="block">
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
									showPrefix: true,
									prefix: DEFAULT_PREFIX,
									isLink: false,
									rel: '',
									linkTarget: '_self',
								})
							}
						>
							<ToolsPanelItem
								label={__('Show prefix', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => !showPrefix}
								onDeselect={() =>
									setAttributes({ showPrefix: true })
								}
							>
								<ToggleControl
									label={__(
										'Show prefix',
										'visual-portfolio'
									)}
									checked={showPrefix}
									onChange={() =>
										setAttributes({
											showPrefix: !showPrefix,
										})
									}
								/>
							</ToolsPanelItem>
							{showPrefix && (
								<ToolsPanelItem
									label={__(
										'Prefix text',
										'visual-portfolio'
									)}
									isShownByDefault
									hasValue={() => prefix !== DEFAULT_PREFIX}
									onDeselect={() =>
										setAttributes({
											prefix: DEFAULT_PREFIX,
										})
									}
								>
									<TextControl
										label={__(
											'Prefix text',
											'visual-portfolio'
										)}
										value={prefix}
										onChange={(newPrefix) =>
											setAttributes({ prefix: newPrefix })
										}
									/>
								</ToolsPanelItem>
							)}
							<ToolsPanelItem
								label={__('Link to author', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => isLink}
								onDeselect={() =>
									setAttributes({ isLink: false })
								}
							>
								<ToggleControl
									label={__(
										'Link to author',
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
			<div {...blockProps}>
				{showPrefix && prefix}
				{isLink ? (
					// Inert in the editor - it only carries the link styling.
					<a
						href={itemAuthorUrl || '#'}
						target={linkTarget}
						rel={rel}
						onClick={(event) => event.preventDefault()}
					>
						{author}
					</a>
				) : (
					author
				)}
			</div>
		</>
	);
}
