/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';

// Register a filter for handling pagination block variations
function registerPaginationVariationHandler() {
	addFilter(
		'editor.BlockEdit',
		'visual-portfolio/pagination-variation-handler',
		(BlockEdit) => {
			return (props) => {
				const { name, attributes, setAttributes, clientId } = props;

				// Only handle our pagination blocks
				if (
					name !== 'visual-portfolio/paged-pagination' &&
					name !== 'visual-portfolio/pagination-load-more' &&
					name !== 'visual-portfolio/pagination-infinite'
				) {
					return <BlockEdit {...props} />;
				}

				// Check if paginationType has changed and needs a transformation
				if (
					name === 'visual-portfolio/paged-pagination' &&
					attributes.paginationType !== 'default'
				) {
					const { replaceBlock } =
						wp.data.dispatch('core/block-editor');

					if (attributes.paginationType === 'load-more') {
						setTimeout(() => {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/pagination-load-more',
									{
										label: 'Load More',
										loadingLabel: 'Loading...',
									}
								)
							);
						}, 0);
					} else if (attributes.paginationType === 'infinity') {
						setTimeout(() => {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/pagination-infinite',
									{
										loadingLabel: 'Loading...',
										showLoadingText: true,
									}
								)
							);
						}, 0);
					}

					// Reset paginationType to prevent infinite loop
					setAttributes({ paginationType: 'default' });
				} else if (
					name === 'visual-portfolio/pagination-load-more' &&
					attributes.paginationType !== 'load-more'
				) {
					const { replaceBlock } =
						wp.data.dispatch('core/block-editor');

					if (attributes.paginationType === 'default') {
						setTimeout(() => {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/paged-pagination',
									{
										paginationType: 'default',
									},
									[
										createBlock(
											'visual-portfolio/pagination-previous'
										),
										createBlock(
											'visual-portfolio/pagination-numbers'
										),
										createBlock(
											'visual-portfolio/pagination-next'
										),
									]
								)
							);
						}, 0);
					} else if (attributes.paginationType === 'infinity') {
						setTimeout(() => {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/pagination-infinite',
									{
										loadingLabel:
											attributes.loadingLabel ||
											'Loading...',
										showLoadingText: true,
									}
								)
							);
						}, 0);
					}

					// Reset paginationType to prevent infinite loop
					setAttributes({ paginationType: 'load-more' });
				} else if (
					name === 'visual-portfolio/pagination-infinite' &&
					attributes.paginationType !== 'infinity'
				) {
					const { replaceBlock } =
						wp.data.dispatch('core/block-editor');

					if (attributes.paginationType === 'default') {
						setTimeout(() => {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/paged-pagination',
									{
										paginationType: 'default',
									},
									[
										createBlock(
											'visual-portfolio/pagination-previous'
										),
										createBlock(
											'visual-portfolio/pagination-numbers'
										),
										createBlock(
											'visual-portfolio/pagination-next'
										),
									]
								)
							);
						}, 0);
					} else if (attributes.paginationType === 'load-more') {
						setTimeout(() => {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/pagination-load-more',
									{
										label: 'Load More',
										loadingLabel:
											attributes.loadingLabel ||
											'Loading...',
									}
								)
							);
						}, 0);
					}

					// Reset paginationType to prevent infinite loop
					setAttributes({ paginationType: 'infinity' });
				}

				return <BlockEdit {...props} />;
			};
		}
	);
}

// Initialize the hooks
registerPaginationVariationHandler();
