/**
 * WordPress dependencies
 */
import { PlainText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function PaginationPreviousEdit({
	attributes,
	setAttributes,
	context: { 'vp/showLabel': showLabel, 'vp/showArrow': showArrow },
}) {
	const { label } = attributes;

	return (
		<a
			href="#pagination-previous-pseudo-link"
			onClick={(event) => event.preventDefault()}
			{...useBlockProps({
				className: 'vp-block-loop-pagination-previous',
			})}
		>
			{showArrow && (
				<span
					className="vp-block-loop-pagination-previous-arrow"
					aria-hidden
				>
					&lsaquo;
				</span>
			)}
			{showLabel && (
				<PlainText
					__experimentalVersion={2}
					tagName="span"
					aria-label={__('Previous page link', 'visual-portfolio')}
					placeholder={__('Previous', 'visual-portfolio')}
					value={label}
					onChange={(newLabel) => setAttributes({ label: newLabel })}
				/>
			)}
		</a>
	);
}
