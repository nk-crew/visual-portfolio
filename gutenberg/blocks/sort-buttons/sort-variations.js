/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';

// Filter to handle variation selection
addFilter(
	'blocks.switchToBlockType.transformedBlock',
	'visual-portfolio/sort-variations',
	(transformedBlock, originalBlock) => {
		// Only handle our sort blocks
		if (
			originalBlock.name !== 'visual-portfolio/sort-dropdown' &&
			originalBlock.name !== 'visual-portfolio/sort-buttons'
		) {
			return transformedBlock;
		}

		const { attributes } = transformedBlock;

		// Check if we need to transform to a different block type
		if (
			originalBlock.name === 'visual-portfolio/sort-dropdown' &&
			attributes.sortType === 'default'
		) {
			// Get sort options from dropdown to create button blocks
			const sortOptions = originalBlock.attributes.sortOptions || [];

			return createBlock(
				'visual-portfolio/sort-buttons',
				{
					sortType: 'default',
				},
				sortOptions.map((option) => {
					return createBlock('visual-portfolio/sort-button', {
						label: option.label || 'Default',
						value: option.value || 'default',
						active: option.active || false,
					});
				})
			);
		} else if (
			originalBlock.name === 'visual-portfolio/sort-buttons' &&
			attributes.sortType === 'dropdown'
		) {
			// Get the inner blocks from the store directly
			const innerBlocks = window.wp.data
				.select('core/block-editor')
				.getBlocks(originalBlock.clientId);

			// Extract sort options from button blocks
			const sortOptions = innerBlocks.map((block) => ({
				label: block.attributes.label || 'Default',
				value: block.attributes.value || 'default',
				active: block.attributes.active || false,
			}));

			return createBlock('visual-portfolio/sort-dropdown', {
				sortType: 'dropdown',
				sortOptions: sortOptions.length
					? sortOptions
					: [
							{
								label: 'Default',
								value: 'default',
								active: true,
							},
						],
			});
		}

		return transformedBlock;
	}
);

// Component to handle sortType changes
const SortVariationHandler = (props) => {
	const { name, attributes, setAttributes, clientId } = props;
	const { replaceBlock } = useDispatch('core/block-editor');

	const { innerBlocks } = useSelect(
		(select) => {
			if (name !== 'visual-portfolio/sort-buttons') {
				return { innerBlocks: [] };
			}
			const { getBlocks } = select('core/block-editor');
			return {
				innerBlocks: getBlocks(clientId),
			};
		},
		[clientId, name]
	);

	useEffect(() => {
		if (
			name === 'visual-portfolio/sort-dropdown' &&
			attributes.sortType === 'default'
		) {
			// Get sort options from dropdown
			const sortOptions = attributes.sortOptions || [];

			replaceBlock(
				clientId,
				createBlock(
					'visual-portfolio/sort-buttons',
					{
						sortType: 'default',
					},
					sortOptions.map((option) => {
						return createBlock('visual-portfolio/sort-button', {
							label: option.label || 'Default',
							value: option.value || 'default',
							active: option.active || false,
						});
					})
				)
			);

			// Reset sortType to prevent infinite loop
			setAttributes({ sortType: 'dropdown' });
		} else if (
			name === 'visual-portfolio/sort-buttons' &&
			attributes.sortType === 'dropdown'
		) {
			// Make sure we have the innerBlocks data
			if (innerBlocks && innerBlocks.length > 0) {
				// Extract sort options from button blocks
				const sortOptions = innerBlocks.map((block) => ({
					label: block.attributes.label || 'Default',
					value: block.attributes.value || 'default',
					active: block.attributes.active || false,
				}));

				replaceBlock(
					clientId,
					createBlock('visual-portfolio/sort-dropdown', {
						sortType: 'dropdown',
						sortOptions,
					})
				);
			} else {
				// If no inner blocks, use default options
				replaceBlock(
					clientId,
					createBlock('visual-portfolio/sort-dropdown', {
						sortType: 'dropdown',
						sortOptions: [
							{
								label: 'Default',
								value: 'default',
								active: true,
							},
						],
					})
				);
			}

			// Reset sortType to prevent infinite loop
			setAttributes({ sortType: 'default' });
		}
	}, [
		name,
		attributes.sortType,
		attributes.sortOptions,
		replaceBlock,
		clientId,
		setAttributes,
		innerBlocks,
	]);

	return null;
};

// Register a filter for handling sort block variations
addFilter(
	'editor.BlockEdit',
	'visual-portfolio/sort-variation-handler',
	(BlockEdit) => {
		return (props) => {
			const { name } = props;

			// Only handle our sort blocks
			if (
				name !== 'visual-portfolio/sort-dropdown' &&
				name !== 'visual-portfolio/sort-buttons'
			) {
				return <BlockEdit {...props} />;
			}

			// Return both the variation handler and the block edit
			return (
				<>
					<SortVariationHandler {...props} />
					<BlockEdit {...props} />
				</>
			);
		};
	}
);
