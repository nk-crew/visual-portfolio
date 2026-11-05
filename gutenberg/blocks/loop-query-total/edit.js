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
import { useMemo } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';
import { useLoopItems } from '../../utils/use-loop-items';

const DEFAULT_DISPLAY_TYPE = 'total-results';

/**
 * What the block says, for the first page of the gallery.
 *
 * The same words the render callback picks. Where the page prints nothing the
 * editor says why, since a block with no text could not be selected.
 *
 * @param {string}      displayType - display type.
 * @param {number|null} total       - items found, null where the source does not say.
 * @param {number}      end         - items on the first page.
 * @return {string} text.
 */
function getText(displayType, total, end) {
	if (null === total) {
		return __(
			'This source does not report a count, so the page shows none.',
			'visual-portfolio'
		);
	}

	if ('range-display' !== displayType) {
		return sprintf(
			/* translators: %d: number of items found. */
			_n('%d item', '%d items', total, 'visual-portfolio'),
			total
		);
	}

	if (!end) {
		return __(
			'The gallery is empty, so the page shows no range.',
			'visual-portfolio'
		);
	}

	return 1 === end
		? sprintf(
				/* translators: 1: number of the item shown, 2: number of items found. */
				__('Displaying %1$s of %2$s', 'visual-portfolio'),
				1,
				total
			)
		: sprintf(
				/* translators: 1: number of the first item shown, 2: number of the last item shown, 3: number of items found. */
				__('Displaying %1$s – %2$s of %3$s', 'visual-portfolio'),
				1,
				end,
				total
			);
}

export default function LoopQueryTotalEdit({
	attributes: { displayType },
	setAttributes,
	context,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();
	const blockEditingMode = useBlockEditingMode();

	useLoopOrphanWarning('visual-portfolio/loop-query-total', context);

	const {
		'vp/queryType': queryType,
		'vp/baseQuery': baseQuery,
		'vp/postsQuery': postsQuery,
		'vp/imagesQuery': imagesQuery,
		'vp/sourceQuery': sourceQuery,
	} = context;

	const query = useMemo(
		() => ({
			queryType,
			baseQuery: { perPage: baseQuery?.perPage },
			postsQuery,
			imagesQuery,
			sourceQuery,
		}),
		[queryType, baseQuery?.perPage, postsQuery, imagesQuery, sourceQuery]
	);

	const { items, foundItems, isFirstLoad } = useLoopItems(query);

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
				{isFirstLoad
					? '…'
					: getText(displayType, foundItems, items.length)}
			</div>
		</>
	);
}
