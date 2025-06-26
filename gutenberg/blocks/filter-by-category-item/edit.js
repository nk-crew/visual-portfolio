import classnames from 'classnames/dedupe';

import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function BlockEdit({ attributes, setAttributes, context }) {
	const { text, isActive, isAll, count } = attributes;

	// Get context values with fallbacks
	const showCount =
		context?.['visual-portfolio-filter-by-category/showCount'] || false;

	const blockProps = useBlockProps({
		className: classnames('vp-block-filter-by-category-item', {
			'is-active': isActive,
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
				<span className="vp-block-filter-by-category-count">
					{count}
				</span>
			)}
		</a>
	);
}
