/**
 * WordPress dependencies
 */
import {
	AlignmentControl,
	BlockControls,
	InspectorControls,
	RichText,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __, isRTL } from '@wordpress/i18n';
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';

const CLICK_ACTION_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Open the item', 'visual-portfolio'), value: 'url' },
	{ label: __('Open the lightbox', 'visual-portfolio'), value: 'popup' },
];

export default function ItemReadMoreEdit({
	attributes: { text, textAlign, showArrow, clickAction, rel, linkTarget },
	setAttributes,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps({
		className: classnames({
			[`has-text-align-${textAlign}`]: textAlign,
		}),
	});
	const blockEditingMode = useBlockEditingMode();

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
									showArrow: false,
									clickAction: 'url',
									rel: '',
									linkTarget: '_self',
								})
							}
						>
							<ToolsPanelItem
								label={__('Show arrow', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => showArrow}
								onDeselect={() =>
									setAttributes({ showArrow: false })
								}
							>
								<ToggleControl
									label={__('Show arrow', 'visual-portfolio')}
									checked={showArrow}
									onChange={() =>
										setAttributes({
											showArrow: !showArrow,
										})
									}
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={__('On click', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => 'url' !== clickAction}
								onDeselect={() =>
									setAttributes({ clickAction: 'url' })
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
											'Link rel',
											'visual-portfolio'
										)}
										hasValue={() => !!rel}
										onDeselect={() =>
											setAttributes({ rel: '' })
										}
									>
										<TextControl
											label={__(
												'Link rel',
												'visual-portfolio'
											)}
											value={rel}
											onChange={(value) =>
												setAttributes({ rel: value })
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
				<RichText
					identifier="text"
					// A link that leads nowhere is not a link, and the front end
					// renders the same tag.
					tagName={'none' === clickAction ? 'span' : 'a'}
					aria-label={__('“Read more” link text', 'visual-portfolio')}
					placeholder={__('Read more', 'visual-portfolio')}
					value={text}
					onChange={(newText) => setAttributes({ text: newText })}
					allowedFormats={[]}
					withoutInteractiveFormatting
				/>
				{showArrow && (
					<span aria-hidden="true">{isRTL() ? ' ←' : ' →'}</span>
				)}
			</div>
		</>
	);
}
