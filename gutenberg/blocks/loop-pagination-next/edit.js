/**
 * WordPress dependencies
 */
import { PlainText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function PaginationNextEdit({
	attributes,
	setAttributes,
	context: { 'vp/showLabel': showLabel, 'vp/showArrow': showArrow },
}) {
	const { label } = attributes;

	return (
		<a
			href="#pagination-next-pseudo-link"
			onClick={(event) => event.preventDefault()}
			{...useBlockProps({
				className: 'vp-block-loop-pagination-next',
			})}
		>
			{showLabel && (
				<PlainText
					__experimentalVersion={2}
					tagName="span"
					aria-label={__('Next page link', 'visual-portfolio')}
					placeholder={__('Next', 'visual-portfolio')}
					value={label}
					onChange={(newLabel) => setAttributes({ label: newLabel })}
				/>
			)}
			{showArrow && (
				<span
					className="vp-block-loop-pagination-next-arrow"
					aria-hidden
				>
					&rsaquo;
				</span>
			)}
		</a>
	);
}
