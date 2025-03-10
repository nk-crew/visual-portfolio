import classnames from 'classnames/dedupe';

import { RichText, useBlockProps } from '@wordpress/block-editor';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export default function BlockEdit({ attributes, setAttributes, context }) {
	const { text, isActive, isAll, count } = attributes;

	// Get context values with fallbacks
	const filterStyle = context?.['visual-portfolio/filter_style'] || 'minimal';
	const showCount = context?.['visual-portfolio/filter_show_count'] || false;
	const textAll =
		context?.['visual-portfolio/filter_text_all'] ||
		__('All', 'visual-portfolio');

	// Update "All" text when context changes
	useEffect(() => {
		if (isAll && textAll && text !== textAll) {
			setAttributes({ text: textAll });
		}
	}, [isAll, textAll, text, setAttributes]);

	const blockProps = useBlockProps({
		className: classnames('vp-filter__item', {
			'vp-filter__item-active': isActive,
			[`vp-filter__item-style-${filterStyle}`]: true,
		}),
	});

	if (filterStyle === 'dropdown') {
		return null;
	}

	return (
		<div {...blockProps}>
			<RichText
				tagName="span"
				value={text}
				onChange={(newText) => setAttributes({ text: newText })}
				placeholder={
					isAll ? textAll : __('Add filter text…', 'visual-portfolio')
				}
				allowedFormats={[]}
			/>
			{showCount && !isAll && count > 0 && (
				<span className="vp-filter__item-count">{`(${count})`}</span>
			)}
		</div>
	);
}
