/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

export default function PagedPaginationEdit({ attributes, setAttributes }) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { showLabel, showArrow } = attributes;

	const blockProps = useBlockProps({ className: 'vp-block-loop-pagination' });

	// The allowed blocks are declared in `block.json`.
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
	});

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'visual-portfolio')}
					dropdownMenuProps={dropdownMenuProps}
					resetAll={(filters) =>
						setAttributes(
							getResetAllValues(filters, {
								showLabel: true,
								showArrow: true,
							})
						)
					}
				>
					<ToolsPanelItem
						label={__('Show label text', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !showLabel}
						onDeselect={() => setAttributes({ showLabel: true })}
					>
						<ToggleControl
							label={__('Show label text', 'visual-portfolio')}
							checked={showLabel}
							onChange={() =>
								setAttributes({ showLabel: !showLabel })
							}
							// A link with neither a label nor an arrow has
							// nothing left to click.
							disabled={!showArrow && showLabel}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={__('Show arrow', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !showArrow}
						onDeselect={() => setAttributes({ showArrow: true })}
					>
						<ToggleControl
							label={__('Show arrow', 'visual-portfolio')}
							checked={showArrow}
							onChange={() =>
								setAttributes({ showArrow: !showArrow })
							}
							disabled={!showLabel && showArrow}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</>
	);
}
