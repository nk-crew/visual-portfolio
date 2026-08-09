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

export default function PaginationPreviousEdit({ attributes, setAttributes }) {
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
				href="#pagination-previous-pseudo-link"
				onClick={(event) => event.preventDefault()}
				{...useBlockProps({
					className: 'vp-block-pagination-previous',
				})}
			>
				{showArrow && (
					<span
						className="vp-block-pagination-previous-arrow"
						aria-hidden
					>
						&lsaquo;
					</span>
				)}
				{showLabel && (
					<PlainText
						__experimentalVersion={2}
						tagName="span"
						aria-label={__(
							'Previous page link',
							'visual-portfolio'
						)}
						placeholder={__('Previous', 'visual-portfolio')}
						value={label}
						onChange={(newLabel) =>
							setAttributes({ label: newLabel })
						}
					/>
				)}
			</a>
		</>
	);
}
