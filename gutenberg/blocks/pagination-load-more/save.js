/**
 * WordPress dependencies
 */
import { RichText, useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
	const { label, loadingLabel, endListLabel, showLoadingText } = attributes;

	// Determine style class based on className
	let styleClass = 'vp-pagination__style-minimal'; // Default style

	if (attributes.className) {
		if (attributes.className.includes('is-style-classic')) {
			styleClass = 'vp-pagination__style-default';
		} else if (attributes.className.includes('is-style-minimal')) {
			styleClass = 'vp-pagination__style-minimal';
		}
	}

	const blockProps = useBlockProps.save({
		className: `vp-pagination ${styleClass}`,
	});

	return (
		<div className="vp-portfolio__pagination-wrap">
			<div {...blockProps} data-vp-pagination-type="load-more">
				<div className="vp-pagination__item">
					<a className="vp-pagination__load-more" href="#vp-page">
						<RichText.Content tagName="span" value={label} />
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
