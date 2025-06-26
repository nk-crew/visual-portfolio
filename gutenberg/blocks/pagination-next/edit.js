/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	PlainText,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function PaginationNextEdit({ attributes, setAttributes }) {
	const { label, showLabel, showArrow } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody>
					<ToggleControl
						label={__('Show label text', 'visual-portfolio')}
						checked={showLabel}
						onChange={() =>
							setAttributes({ showLabel: !showLabel })
						}
						disabled={!showArrow && showLabel}
					/>
					<ToggleControl
						label={__('Show arrow', 'visual-portfolio')}
						checked={showArrow}
						onChange={() =>
							setAttributes({ showArrow: !showArrow })
						}
						disabled={!showLabel && showArrow}
					/>
				</PanelBody>
			</InspectorControls>

			<a
				href="#pagination-next-pseudo-link"
				onClick={(event) => event.preventDefault()}
				{...useBlockProps({ className: 'vp-block-pagination-next' })}
			>
				{showLabel && (
					<PlainText
						__experimentalVersion={2}
						tagName="span"
						aria-label={__('Next page link', 'visual-portfolio')}
						placeholder={__('Next', 'visual-portfolio')}
						value={label}
						onChange={(newLabel) =>
							setAttributes({ label: newLabel })
						}
					/>
				)}
				{showArrow && (
					<span
						className="vp-block-pagination-next-arrow"
						aria-hidden
					>
						&rsaquo;
					</span>
				)}
			</a>
		</>
	);
}
