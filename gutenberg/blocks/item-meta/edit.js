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
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import { getMetaText, META_TYPES } from './meta-types';

export default function ItemMetaEdit({
	attributes: {
		metaType,
		textAlign,
		showIcon,
		showZero,
		prefix,
		suffix,
		isLink,
	},
	setAttributes,
	context,
}) {
	const blockProps = useBlockProps({
		className: classnames({
			[`has-text-align-${textAlign}`]: textAlign,
		}),
	});
	const blockEditingMode = useBlockEditingMode();

	const meta = META_TYPES[metaType] || META_TYPES.comments;
	const value = context[meta.contextKey];

	// An item without the value still needs something to lay out against, and
	// the block would otherwise vanish from the item it was just dropped into.
	const previewValue =
		value === undefined || value === '' ? meta.sample : value;

	const Icon = meta.icon;
	const inner = (
		<>
			{showIcon && <Icon aria-hidden="true" focusable="false" />}
			<span>
				{prefix}
				{getMetaText(metaType, previewValue)}
				{suffix}
			</span>
		</>
	);

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
							resetAll={() =>
								setAttributes({
									showIcon: true,
									showZero: false,
									prefix: '',
									suffix: '',
									isLink: false,
								})
							}
						>
							<ToolsPanelItem
								label={__('Show icon', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => !showIcon}
								onDeselect={() =>
									setAttributes({ showIcon: true })
								}
							>
								<ToggleControl
									__nextHasNoMarginBottom
									label={__('Show icon', 'visual-portfolio')}
									checked={showIcon}
									onChange={() =>
										setAttributes({ showIcon: !showIcon })
									}
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={__(
									'Show empty value',
									'visual-portfolio'
								)}
								isShownByDefault
								hasValue={() => showZero}
								onDeselect={() =>
									setAttributes({ showZero: false })
								}
							>
								<ToggleControl
									__nextHasNoMarginBottom
									label={__(
										'Show empty value',
										'visual-portfolio'
									)}
									help={__(
										'Items with nothing to show here are skipped unless this is on.',
										'visual-portfolio'
									)}
									checked={showZero}
									onChange={() =>
										setAttributes({ showZero: !showZero })
									}
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={__('Prefix text', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => !!prefix}
								onDeselect={() => setAttributes({ prefix: '' })}
							>
								<TextControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={__(
										'Prefix text',
										'visual-portfolio'
									)}
									value={prefix}
									onChange={(nextPrefix) =>
										setAttributes({ prefix: nextPrefix })
									}
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={__('Suffix text', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => !!suffix}
								onDeselect={() => setAttributes({ suffix: '' })}
							>
								<TextControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={__(
										'Suffix text',
										'visual-portfolio'
									)}
									value={suffix}
									onChange={(nextSuffix) =>
										setAttributes({ suffix: nextSuffix })
									}
								/>
							</ToolsPanelItem>
							{metaType === 'comments' && (
								<ToolsPanelItem
									label={__(
										'Link to comments',
										'visual-portfolio'
									)}
									isShownByDefault
									hasValue={() => isLink}
									onDeselect={() =>
										setAttributes({ isLink: false })
									}
								>
									<ToggleControl
										__nextHasNoMarginBottom
										label={__(
											'Link to comments',
											'visual-portfolio'
										)}
										checked={isLink}
										onChange={() =>
											setAttributes({ isLink: !isLink })
										}
									/>
								</ToolsPanelItem>
							)}
						</ToolsPanel>
					</InspectorControls>
				</>
			)}
			<div {...blockProps}>
				{isLink && metaType === 'comments' ? (
					// Inert in the editor - it only carries the link styling.
					<a
						href={context['vp/itemCommentsUrl'] || '#'}
						onClick={(event) => event.preventDefault()}
					>
						{inner}
					</a>
				) : (
					<span>{inner}</span>
				)}
			</div>
		</>
	);
}
