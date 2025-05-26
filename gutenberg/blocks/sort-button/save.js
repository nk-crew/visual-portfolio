import { useBlockProps } from '@wordpress/block-editor';

export default function BlockSave({ attributes }) {
	const { label, value, active } = attributes;

	const blockProps = useBlockProps.save({
		className: `${active ? ' vp-sort__item-active' : ''}`,
		href: `?vp_sort=${value}`,
		'data-vp-sort': value,
	});

	return <a {...blockProps}>{label}</a>;
}
