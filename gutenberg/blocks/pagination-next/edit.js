/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './editor.scss';

import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function PaginationNextEdit({ attributes, setAttributes }) {
	const { label } = attributes;

	const blockProps = useBlockProps({
		className: 'vp-pagination-next',
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'visual-portfolio')}>
					<TextControl
						label={__('Next Label', 'visual-portfolio')}
						value={label}
						onChange={(value) => setAttributes({ label: value })}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<span className="vp-pagination-next-label">{label}</span>
				<span className="vp-pagination-next-icon">→</span>
			</div>
		</>
	);
}
