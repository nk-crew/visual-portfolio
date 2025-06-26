/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

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
		createPaginationItem('...', 'span', 'vp-block-pagination-dots')
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
				<PanelBody>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Number of links')}
						help={__(
							'Specify how many links can appear before and after the current page number. Links to the first, current and last page are always visible.'
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
				</PanelBody>
			</InspectorControls>
			<div
				{...useBlockProps({ className: 'vp-block-pagination-numbers' })}
			>
				{paginationNumbers}
			</div>
		</>
	);
}
