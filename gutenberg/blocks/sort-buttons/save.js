import { useInnerBlocksProps } from '@wordpress/block-editor';

export default function BlockSave({ attributes }) {
	const { sortType } = attributes;
	const innerBlocksProps = useInnerBlocksProps.save({
		className: `wp-block-visual-portfolio-sort vp-sort vp-sort-${sortType} vp-sort-style-${attributes.className?.includes('is-style-') ? attributes.className.replace(/.*is-style-(\S+).*/, '$1') : 'minimal'}`,
	});

	return <div {...innerBlocksProps} />;
}
