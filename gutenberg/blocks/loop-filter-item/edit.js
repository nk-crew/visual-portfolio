import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import classnames from 'classnames/dedupe';

export default function BlockEdit({ attributes, setAttributes, context }) {
	const { text, filter, count } = attributes;

	// The "All" item is the one that resets the filter.
	const isAll = '*' === filter;

	// Get context values with fallbacks
	const showCount = context?.['vp/showCount'] || false;

	// Which item is active is a property of the request, not of the saved
	// content. The editor has no filter in its URL, which is the state the
	// render callback marks the "All" item active in.
	const blockProps = useBlockProps({
		className: classnames('vp-block-loop-filter-item', {
			'is-active': isAll,
		}),
	});

	return (
		<a
			href="#filter-pseudo-link"
			onClick={(event) => event.preventDefault()}
			{...blockProps}
		>
			<RichText
				tagName="span"
				value={text}
				onChange={(newText) => setAttributes({ text: newText })}
				placeholder={__('Add category text…', 'visual-portfolio')}
				allowedFormats={[]}
			/>
			{showCount && !isAll && count > 0 && (
				<span className="vp-block-loop-filter-count">{count}</span>
			)}
		</a>
	);
}
