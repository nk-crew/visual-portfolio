/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';
import { useEffect, useRef } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';

// Register a filter for handling pagination block variations
function registerPaginationVariationHandler() {
	addFilter(
		'editor.BlockEdit',
		'visual-portfolio/pagination-variation-handler',
		(BlockEdit) => {
			return (props) => {
				const { name, attributes, setAttributes, clientId } = props;
				const hasProcessedRef = useRef(false);

				// Only handle our pagination blocks
				if (
					name !== 'visual-portfolio/pagination' &&
					name !== 'visual-portfolio/pagination-load-more' &&
					name !== 'visual-portfolio/pagination-infinite'
				) {
					return <BlockEdit {...props} />;
				}

				// Use useEffect to handle block transformations and attribute updates
				useEffect(() => {
					// Prevent infinite loops
					if (hasProcessedRef.current) {
						return;
					}

					const { replaceBlock } =
						wp.data.dispatch('core/block-editor');

					// Handle pagination block transformations
					if (
						name === 'visual-portfolio/pagination' &&
						attributes.paginationType !== 'default'
					) {
						hasProcessedRef.current = true;

						if (attributes.paginationType === 'load-more') {
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
						} else if (attributes.paginationType === 'infinity') {
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
						}

						// Reset paginationType after transformation
						setTimeout(() => {
							setAttributes({ paginationType: 'default' });
							hasProcessedRef.current = false;
						}, 100);
					}
					// Handle load-more pagination block transformations
					else if (
						name === 'visual-portfolio/pagination-load-more' &&
						attributes.paginationType !== 'load-more'
					) {
						hasProcessedRef.current = true;

						if (attributes.paginationType === 'default') {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/pagination',
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
						} else if (attributes.paginationType === 'infinity') {
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
						}

						// Reset paginationType after transformation
						setTimeout(() => {
							setAttributes({ paginationType: 'load-more' });
							hasProcessedRef.current = false;
						}, 100);
					}
					// Handle infinite pagination block transformations
					else if (
						name === 'visual-portfolio/pagination-infinite' &&
						attributes.paginationType !== 'infinity'
					) {
						hasProcessedRef.current = true;

						if (attributes.paginationType === 'default') {
							replaceBlock(
								clientId,
								createBlock(
									'visual-portfolio/pagination',
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
						} else if (attributes.paginationType === 'load-more') {
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
						}

						// Reset paginationType after transformation
						setTimeout(() => {
							setAttributes({ paginationType: 'infinity' });
							hasProcessedRef.current = false;
						}, 100);
					}
				}, [
					name,
					attributes.paginationType,
					clientId,
					setAttributes,
					attributes.loadingLabel,
				]);

				return <BlockEdit {...props} />;
			};
		}
	);
}

// Initialize the hooks
registerPaginationVariationHandler();
