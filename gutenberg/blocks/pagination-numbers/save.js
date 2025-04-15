/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';

export default function save() {
	const blockProps = useBlockProps.save({
		className: 'vp-pagination-numbers',
	});

	// The actual pagination numbers will be rendered dynamically on the frontend
	return <div {...blockProps}></div>;
}
