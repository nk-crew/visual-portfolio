/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
//import './editor.scss';

import {
	InspectorControls,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Define a validation function that can be reused
const validateSortValue = (value) => {
	// If the value doesn't match the allowed pattern, return a safe default
	const pattern = /^[a-zA-Z0-9_-]*$/;
	return pattern.test(value) ? value : 'default';
};

export default function Edit({ attributes, setAttributes, context }) {
	const { label, value, active } = attributes;
	const parentStyle = context['visual-portfolio/sort-buttons-style'];

	// Sanitize value when component loads
	const sanitizedValue = validateSortValue(attributes.value);
	if (sanitizedValue !== attributes.value) {
		setAttributes({ value: sanitizedValue });
	}

	// Handle input validation
	const handleValueChange = (newValue) => {
		// Allow empty string for editing purposes
		if (newValue === '') {
			setAttributes({ value: '' });
			return;
		}

		// Validate the input
		if (/^[a-zA-Z0-9_-]*$/.test(newValue)) {
			setAttributes({ value: newValue });
		}
		// If invalid, don't update the state
	};

	// If the parent has a style class, extract the actual style name
	const styleClass = parentStyle?.includes('is-style-')
		? parentStyle.replace(/.*is-style-(\S+).*/, '$1')
		: 'minimal';

	const blockProps = useBlockProps({
		className: `vp-sort__item${active ? ' vp-sort__item-active' : ''}`,
		'data-vp-sort': sanitizedValue,
		'data-parent-style': styleClass, // Optional: for debugging
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Button Settings', 'visual-portfolio')}>
					<TextControl
						label={__('Sort Value', 'visual-portfolio')}
						value={value}
						onChange={handleValueChange}
						help={__(
							'Value used for sorting (e.g., date_asc, title_desc)',
							'visual-portfolio'
						)}
					/>
					<ToggleControl
						label={__('Active', 'visual-portfolio')}
						checked={active}
						onChange={() => {
							setAttributes({ active: !active });
						}}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<button
					type="button"
					className="vp-sort__item-button"
					onClick={(e) => e.preventDefault()}
					data-vp-sort={sanitizedValue}
				>
					<RichText
						tagName="span"
						value={label}
						onChange={(val) => setAttributes({ label: val })}
						placeholder={__('Button Label', 'visual-portfolio')}
					/>
				</button>
			</div>
		</>
	);
}
