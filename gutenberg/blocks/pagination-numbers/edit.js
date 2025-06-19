/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './editor.scss';

import { useBlockProps } from '@wordpress/block-editor';

export default function PaginationNumbersEdit({ context }) {
	const { 'visual-portfolio/baseQuery': baseQuery } = context;

	const maxPages = baseQuery?.maxPages || 1;

	const blockProps = useBlockProps({
		className: 'vp-pagination-numbers',
	});

	// Generate pagination numbers for preview
	const renderPaginationNumbers = () => {
		const items = [];
		const maxPagesToShow = 3; // Number of pages to show before ellipsis
		const currentPage = 1; // Assuming the current page in the editor is 1 for preview

		// Show pages 1 to maxPagesToShow
		for (let i = 1; i <= maxPagesToShow && i <= maxPages; i++) {
			items.push(
				<span
					key={i}
					className={`vp-pagination-number ${i === currentPage ? 'vp-pagination-number-active' : ''}`}
				>
					<a href={`#vp-page-${i}`} data-vp-pagination={i}>
						{i}
					</a>
				</span>
			);
		}

		// Show ellipsis if there are more pages
		if (maxPages > maxPagesToShow + 1) {
			items.push(
				<span key="ellipsis" className="vp-pagination-number-ellipsis">
					...
				</span>
			);
		}

		// Show the last page number if it's not already shown
		if (maxPages > maxPagesToShow) {
			items.push(
				<span key={maxPages} className="vp-pagination-number">
					<a
						href={`#vp-page-${maxPages}`}
						data-vp-pagination={maxPages}
					>
						{maxPages}
					</a>
				</span>
			);
		}

		return items;
	};

	return <div {...blockProps}>{renderPaginationNumbers()}</div>;
}
