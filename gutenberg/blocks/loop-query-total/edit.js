/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	SelectControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

const DEFAULT_DISPLAY_TYPE = 'total-results';

// Sample numbers, as the core Query Total block shows in the editor: the count
// is resolved on the page, against the filter and the page the visitor is on.
const SAMPLE_TOTAL = 12;
const SAMPLE_END = 6;

export default function LoopQueryTotalEdit({
	attributes: { displayType },
	setAttributes,
	context,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();
	const blockEditingMode = useBlockEditingMode();

	useLoopOrphanWarning('visual-portfolio/loop-query-total', context);

	const text =
		'range-display' === displayType
			? sprintf(
					/* translators: 1: number of the first item shown, 2: number of the last item shown, 3: number of items found. */
					__('Displaying %1$s – %2$s of %3$s', 'visual-portfolio'),
					1,
					SAMPLE_END,
					SAMPLE_TOTAL
				)
			: sprintf(
					/* translators: %d: number of items found. */
					_n('%d item', '%d items', SAMPLE_TOTAL, 'visual-portfolio'),
					SAMPLE_TOTAL
				);

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
									displayType: DEFAULT_DISPLAY_TYPE,
								})
							)
						}
					>
						<ToolsPanelItem
							label={__('Display type', 'visual-portfolio')}
							isShownByDefault
							hasValue={() =>
								DEFAULT_DISPLAY_TYPE !== displayType
							}
							onDeselect={() =>
								setAttributes({
									displayType: DEFAULT_DISPLAY_TYPE,
								})
							}
						>
							<SelectControl
								label={__('Display type', 'visual-portfolio')}
								value={displayType}
								options={[
									{
										value: 'total-results',
										label: __(
											'Total results',
											'visual-portfolio'
										),
									},
									{
										value: 'range-display',
										label: __(
											'Range display',
											'visual-portfolio'
										),
									},
								]}
								onChange={(value) =>
									setAttributes({ displayType: value })
								}
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</InspectorControls>
			)}
			<div {...useBlockProps({ className: 'vp-block-loop-query-total' })}>
				{text}
			</div>
		</>
	);
}
