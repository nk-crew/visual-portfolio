/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	PlainText,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes, setAttributes }) {
	const { label, loadingLabel } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Loading text', 'visual-portfolio')}
						help={__(
							'Announced to screen readers while the next items are loading.',
							'visual-portfolio'
						)}
						value={loadingLabel || ''}
						placeholder={__('Loading...', 'visual-portfolio')}
						onChange={(newLabel) =>
							setAttributes({ loadingLabel: newLabel })
						}
					/>
				</PanelBody>
			</InspectorControls>

			<a
				href="#pagination-infinite-pseudo-link"
				onClick={(event) => event.preventDefault()}
				{...useBlockProps({
					className: 'vp-block-pagination-infinite',
				})}
			>
				<PlainText
					__experimentalVersion={2}
					tagName="span"
					aria-label={__(
						'Infinite scroll trigger',
						'visual-portfolio'
					)}
					placeholder={__('Load More', 'visual-portfolio')}
					value={label}
					onChange={(newLabel) => setAttributes({ label: newLabel })}
				/>
			</a>
		</>
	);
}
