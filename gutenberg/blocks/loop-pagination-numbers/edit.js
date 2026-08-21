/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	RangeControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';

// Keep in sync with the `midSize` default in `block.json`.
const DEFAULT_MID_SIZE = 2;

const createPaginationItem = (content, Tag = 'a', className = '') => (
	<Tag key={content} className={className}>
		{content}
	</Tag>
);

const previewPaginationNumbers = (midSize, lastItem) => {
	const paginationItems = [];

	// First set of pagination items.
	for (let i = 1; i <= midSize; i++) {
		paginationItems.push(createPaginationItem(i));
	}

	// Current pagination item.
	paginationItems.push(
		createPaginationItem(midSize + 1, 'span', 'is-active')
	);

	// Second set of pagination items.
	for (let i = 1; i <= midSize; i++) {
		paginationItems.push(createPaginationItem(midSize + 1 + i));
	}

	// Dots.
	paginationItems.push(
		createPaginationItem('...', 'span', 'vp-block-loop-pagination-dots')
	);

	// Last pagination item.
	paginationItems.push(createPaginationItem(lastItem));

	return <>{paginationItems}</>;
};

export default function PaginationNumbersEdit({
	attributes,
	setAttributes,
	context,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { midSize } = attributes;
	const { 'vp/baseQuery': baseQuery } = context;

	const maxPages = baseQuery?.maxPages || 1;
	const paginationNumbers = previewPaginationNumbers(
		parseInt(midSize, 10),
		Math.max(maxPages, midSize * 2 + 3)
	);

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'visual-portfolio')}
					resetAll={() =>
						setAttributes({ midSize: DEFAULT_MID_SIZE })
					}
					dropdownMenuProps={dropdownMenuProps}
				>
					<ToolsPanelItem
						label={__('Number of links', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => DEFAULT_MID_SIZE !== midSize}
						onDeselect={() =>
							setAttributes({ midSize: DEFAULT_MID_SIZE })
						}
					>
						<RangeControl
							label={__('Number of links', 'visual-portfolio')}
							help={__(
								'Specify how many links can appear before and after the current page number. Links to the first, current and last page are always visible.',
								'visual-portfolio'
							)}
							value={midSize}
							onChange={(value) => {
								setAttributes({
									midSize: parseInt(value, 10),
								});
							}}
							min={0}
							max={5}
							withInputField={false}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			<div
				{...useBlockProps({
					className: 'vp-block-loop-pagination-numbers',
				})}
			>
				{paginationNumbers}
			</div>
		</>
	);
}
