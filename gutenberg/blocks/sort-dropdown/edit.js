/**
 * WordPress dependencies
 */
import {
	BlockAlignmentToolbar,
	BlockControls,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { PanelBody, ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import SortableControl from '../../components/sortable-control';

// Map of sort values to human-readable labels
const sortValueLabels = {
	default: __('Default', 'visual-portfolio'),
	date_asc: __('Date Asc', 'visual-portfolio'),
	date_desc: __('Date Desc', 'visual-portfolio'),
	title_asc: __('Title Asc', 'visual-portfolio'),
	title_desc: __('Title Desc', 'visual-portfolio'),
};

// Available sort options for the dropdown
const availableSortOptions = [
	{ label: __('Default', 'visual-portfolio'), value: 'default' },
	{ label: __('Date Ascending', 'visual-portfolio'), value: 'date_asc' },
	{ label: __('Date Descending', 'visual-portfolio'), value: 'date_desc' },
	{ label: __('Title Ascending', 'visual-portfolio'), value: 'title_asc' },
	{ label: __('Title Descending', 'visual-portfolio'), value: 'title_desc' },
];

const defaultSortOptions = [
	{ label: sortValueLabels.default, value: 'default', active: true },
	{ label: sortValueLabels.date_asc, value: 'date_asc', active: false },
	{ label: sortValueLabels.date_desc, value: 'date_desc', active: false },
	{ label: sortValueLabels.title_asc, value: 'title_asc', active: false },
	{ label: sortValueLabels.title_desc, value: 'title_desc', active: false },
];

export default function Edit({ attributes, setAttributes, clientId }) {
	const { sortType, sortOptions = [] } = attributes;

	const { replaceBlock } = useDispatch('core/block-editor');

	// Function to handle transformation to buttons
	const transformToButtons = () => {
		// Exit early if no sort options
		if (!sortOptions.length) {
			return;
		}

		replaceBlock(
			clientId,
			createBlock(
				'visual-portfolio/sort-buttons',
				{
					sortType: 'default',
					align: attributes.align || 'center',
				},
				// Map each sort option to a button block
				sortOptions.map((option) => {
					return createBlock('visual-portfolio/sort-button', {
						label: option.label || 'Default',
						value: option.value || 'default',
						active: option.active || false,
					});
				})
			)
		);
	};

	// Convert sortOptions to the format needed by SortableControl
	const getSortableOptions = () => {
		// Create an object with value as key and label as value
		const options = {};

		// First add all available options
		availableSortOptions.forEach((option) => {
			options[option.value] = option.label;
		});

		// Then add any custom options from the current sortOptions
		// This ensures custom options are included even if not in availableSortOptions
		sortOptions.forEach((option) => {
			if (!options[option.value]) {
				options[option.value] = option.label || option.value;
			}
		});

		return options;
	};

	// Get the current values for SortableControl
	const getSortableValues = () => {
		return sortOptions.map((option) => option.value);
	};

	// Handle changes from SortableControl
	const handleSortableChange = (newValues) => {
		// Map the values array back to full sort options
		const newOptions = newValues.map((value, index) => {
			// Find the original option to preserve custom labels
			const existingOption = sortOptions.find(
				(opt) => opt.value === value
			);

			return {
				value,
				// Use existing label if available, fall back to predefined label, then to value
				label: existingOption?.label || sortValueLabels[value] || value,
				// The first option is always active
				active: index === 0,
			};
		});

		setAttributes({ sortOptions: newOptions });
	};

	// Initialize sortOptions from transform if needed
	useEffect(() => {
		// Only initialize if the block was just transformed and has no sort options
		if (sortOptions.length === 0) {
			// Check if the block we're replacing was a sort-buttons block
			const blockInstance = window.wp.data
				.select('core/block-editor')
				.getSelectedBlock();

			// If we have a selected block and it has inner blocks (from a transformation)
			if (
				blockInstance &&
				blockInstance.innerBlocks &&
				blockInstance.innerBlocks.length > 0
			) {
				// Extract options from innerBlocks
				const extractedOptions = blockInstance.innerBlocks.map(
					(block, index) => ({
						label: block.attributes.label || 'Default',
						value: block.attributes.value || 'default',
						active: block.attributes.active || index === 0,
					})
				);

				if (extractedOptions.length > 0) {
					setAttributes({ sortOptions: extractedOptions });
					return;
				}
			}

			// Default fallback if no transformation data found
			setAttributes({ sortOptions: defaultSortOptions });
		}
	}, []);

	// Get the current alignment setting
	const { align = 'center' } = attributes;

	// Get block props with appropriate class names
	const blockProps = useBlockProps({
		className: `vp-sort vp-sort-${sortType} vp-sort-align-${align}`,
	});

	return (
		<>
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						icon="image-flip-horizontal"
						label={__('Switch to Buttons', 'visual-portfolio')}
						onClick={transformToButtons}
						disabled={!sortOptions.length}
					/>
				</ToolbarGroup>

				{/* Use BlockAlignmentToolbar for wide/full alignment options */}
				<BlockAlignmentToolbar
					value={align}
					onChange={(newAlign) => setAttributes({ align: newAlign })}
					controls={['wide', 'full']} // Only allow wide and full as specified in supports
				/>
			</BlockControls>

			<InspectorControls>
				<PanelBody
					title={__('Sort Options', 'visual-portfolio')}
					initialOpen={true}
				>
					<div className="vp-sort-options-container">
						<SortableControl
							options={getSortableOptions()}
							value={getSortableValues()}
							onChange={handleSortableChange}
							allowDisablingOptions={true}
						/>
					</div>

					{/* Add a note to indicate which option is active */}
					{sortOptions.length > 0 && (
						<p
							className="vp-sort-active-note"
							style={{ marginTop: '10px', fontStyle: 'italic' }}
						>
							{__(
								'The first option in the list is the active one.',
								'visual-portfolio'
							)}
						</p>
					)}
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<div className="vp-sort-dropdown">
					<select className="vp-sort-dropdown-select">
						{sortOptions.map((option, index) => (
							<option key={index} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
			</div>
		</>
	);
}
