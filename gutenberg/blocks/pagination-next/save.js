/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
	const { label } = attributes;

	const blockProps = useBlockProps.save({
		className: 'vp-pagination-next',
	});

	return (
		<div {...blockProps}>
			<span className="vp-pagination-next-label">{label}</span>
			<span className="vp-pagination-next-icon">→</span>
		</div>
	);
}
