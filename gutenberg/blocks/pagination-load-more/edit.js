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

export default function PaginationLoadMoreEdit({
	attributes,
	setAttributes,
	context,
}) {
	const { label, loadingLabel, endListLabel, showLoadingText } = attributes;
	const { 'visual-portfolio/maxPages': maxPages = 1 } = context;

	// Determine style class based on className
	let styleClass = 'vp-pagination__style-minimal'; // Default style

	if (attributes.className) {
		if (attributes.className.includes('is-style-classic')) {
			styleClass = 'vp-pagination__style-default';
		} else if (attributes.className.includes('is-style-minimal')) {
			styleClass = 'vp-pagination__style-minimal';
		}
	}

	const blockProps = useBlockProps({
		className: `vp-pagination ${styleClass}`,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'visual-portfolio')}>
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
					<div {...blockProps} data-vp-pagination-type="load-more">
						<div className="vp-pagination__item">
							<a
								className="vp-pagination__load-more"
								href="#vp-page"
							>
								<RichText
									tagName="span"
									value={label}
									onChange={(value) =>
										setAttributes({ label: value })
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
