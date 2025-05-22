/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
	const { label } = attributes;

	const blockProps = useBlockProps.save({
		className: 'vp-pagination-prev',
	});

	return (
		<div {...blockProps}>
			<span className="vp-pagination-prev-icon">←</span>
			<span className="vp-pagination-prev-label">{label}</span>
		</div>
	);
}
