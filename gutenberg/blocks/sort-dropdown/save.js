/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';

export default function Save({ attributes }) {
	const {
		sortType,
		align,
		sortOptions = defaultSortOptions, // Use default sort options if none provided
	} = attributes;

	const blockProps = useBlockProps.save({
		className: `vp-sort vp-sort-${sortType} vp-sort-align-${align}`,
	});

	return (
		<div {...blockProps}>
			<div className="vp-sort-dropdown">
				<select className="vp-sort-dropdown-select">
					{sortOptions.map((option) => (
						<option
							key={option.value}
							value={option.value}
							selected={option.active ? 'selected' : undefined}
						>
							{option.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}

// Define defaultSortOptions in save.js as well to ensure consistency
const defaultSortOptions = [
	{ label: 'Default', value: 'default', active: true },
	{ label: 'Date Asc', value: 'date_asc', active: false },
	{ label: 'Date Desc', value: 'date_desc', active: false },
	{ label: 'Title Asc', value: 'title_asc', active: false },
	{ label: 'Title Desc', value: 'title_desc', active: false },
];
