/**
 * WordPress dependencies
 */
import { RichText, useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
	const { loadingLabel, showLoadingText, loadMoreLabel, endListLabel } =
		attributes;

	const blockProps = useBlockProps.save();

	return (
		<div className="vp-portfolio__pagination-wrap">
			<div {...blockProps} data-vp-pagination-type="infinite">
				<div className="vp-pagination__item">
					<a className="vp-pagination__load-more" href="#vp-page">
						<RichText.Content
							tagName="span"
							value={loadMoreLabel}
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
	);
}
