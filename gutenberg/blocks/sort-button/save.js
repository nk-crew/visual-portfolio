import classnames from 'classnames/dedupe';

import { RichText, useBlockProps } from '@wordpress/block-editor';

export default function BlockSave({ attributes }) {
	const { label, value, active } = attributes;

	const blockProps = useBlockProps.save({
		className: classnames({
			'is-active': active,
		}),
		'data-vp-sort': value,
	});

	return (
		<div {...blockProps}>
			<RichText.Content
				tagName={'a'}
				type={'button'}
				href={`?vp_sort=${value}`}
				value={label}
			/>
		</div>
	);
}
