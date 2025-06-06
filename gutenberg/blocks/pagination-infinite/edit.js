/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './editor.scss';

import {
	InspectorControls,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function PaginationInfiniteEdit({
	attributes,
	setAttributes,
	context,
}) {
	const { loadingLabel, showLoadingText, loadMoreLabel, endListLabel } =
		attributes;
	const { 'visual-portfolio/maxPages': maxPages = 1 } = context;

	const blockProps = useBlockProps({
		className: `vp-pagination`,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody>
					<ToggleControl
						label={__('Show Loading Text', 'visual-portfolio')}
						checked={showLoadingText}
						onChange={(value) =>
							setAttributes({ showLoadingText: value })
						}
					/>
					{showLoadingText && (
						<TextControl
							label={__('Loading Label', 'visual-portfolio')}
							value={loadingLabel}
							onChange={(value) =>
								setAttributes({ loadingLabel: value })
							}
						/>
					)}
					<TextControl
						label={__('End of List Text', 'visual-portfolio')}
						value={endListLabel}
						onChange={(value) =>
							setAttributes({ endListLabel: value })
						}
					/>
				</PanelBody>
			</InspectorControls>

			{maxPages > 1 ? (
				<div className="vp-portfolio__pagination-wrap">
					<div {...blockProps} data-vp-pagination-type="infinite">
						<div className="vp-pagination__item">
							<a
								className="vp-pagination__load-more"
								href="#vp-page"
							>
								<RichText
									tagName="span"
									value={loadMoreLabel}
									onChange={(value) =>
										setAttributes({ loadMoreLabel: value })
									}
									placeholder={__(
										'Load More',
										'visual-portfolio'
									)}
								/>
								<span className="vp-pagination__load-more-loading">
									<span className="vp-spinner"></span>
									{showLoadingText && (
										<span className="vp-screen-reader-text">
											{loadingLabel}
										</span>
									)}
								</span>
								<span className="vp-pagination__load-more-no-more">
									{endListLabel}
								</span>
							</a>
						</div>
					</div>
				</div>
			) : (
				<div {...blockProps}>
					<div className="vp-pagination-info">
						{__(
							'Pagination will be displayed when the number of pages is more than 1.',
							'visual-portfolio'
						)}
					</div>
				</div>
			)}
		</>
	);
}
