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

export default function ItemReadMoreEdit({
	attributes: { text, textAlign, showArrow },
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
							resetAll={() => setAttributes({ showArrow: false })}
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
						</ToolsPanel>
					</InspectorControls>
				</>
			)}
			<div {...blockProps}>
				<RichText
					identifier="text"
					tagName="a"
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
