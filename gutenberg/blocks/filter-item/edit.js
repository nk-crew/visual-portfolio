import classnames from 'classnames/dedupe';

import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function BlockEdit({ attributes, setAttributes, context }) {
	const { text, isActive, isAll, count } = attributes;

	// Get context values with fallbacks
	const showCount = context?.['visual-portfolio-filter/showCount'] || false;

	const blockProps = useBlockProps({
		className: classnames({
			'is-active': isActive,
		}),
	});

	return (
		<div {...blockProps}>
			<RichText
				tagName="span"
				value={text}
				onChange={(newText) => setAttributes({ text: newText })}
				placeholder={__('Add filter text…', 'visual-portfolio')}
				allowedFormats={[]}
			/>
			{showCount && !isAll && count > 0 && (
				<span className="vp-filter__item-count">{`(${count})`}</span>
			)}
		</div>
	);
}
