/**
 * WordPress dependencies
 */
import { PlainText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes, setAttributes }) {
	const { label } = attributes;

	return (
		<a
			href="#pagination-load-more-pseudo-link"
			onClick={(event) => event.preventDefault()}
			{...useBlockProps({ className: 'vp-block-pagination-infinite' })}
		>
			<PlainText
				__experimentalVersion={2}
				tagName="span"
				aria-label={__('Load more link', 'visual-portfolio')}
				placeholder={__('Load More', 'visual-portfolio')}
				value={label}
				onChange={(newLabel) => setAttributes({ label: newLabel })}
			/>
		</a>
	);
}
