import {
	InspectorControls,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { useCallback } from '@wordpress/element';
import { escapeHTML } from '@wordpress/escape-html';
import { __ } from '@wordpress/i18n';
import { create } from '@wordpress/rich-text';
import classnames from 'classnames/dedupe';

export default function BlockEdit({ attributes, setAttributes, context }) {
	const { text, filter, count } = attributes;

	// The "All" item is the one that resets the filter.
	const isAll = '*' === filter;

	// Get context values with fallbacks
	const showCount = context?.['vp/showCount'] || false;
	const isOption = !!context?.['vp/displayAsDropdown'];
	// Picked in the List tab, a dropdown's item is invisible in the canvas, and
	// the row that had the focus leaves with the tab, so the focus would be
	// nowhere: it goes to the label as the field appears.
	const focusLabelIfLost = useCallback((node) => {
		if (!node) {
			return;
		}

		window.requestAnimationFrame(() => {
			const { activeElement } = node.ownerDocument;

			if (!activeElement || activeElement === node.ownerDocument.body) {
				node.focus();
			}
		});
	}, []);

	// Which item is active is a property of the request, not of the saved
	// content. The editor has no filter in its URL, which is the state the
	// render callback marks the "All" item active in.
	const blockProps = useBlockProps({
		className: classnames('vp-block-loop-filter-item', {
			'is-active': isAll,
		}),
	});

	// A dropdown's item has no place in the canvas to type its label in.
	return (
		<>
			{isOption && (
				<InspectorControls>
					<PanelBody title={__('Settings', 'visual-portfolio')}>
						<TextControl
							ref={focusLabelIfLost}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Label', 'visual-portfolio')}
							value={create({ html: text }).text}
							onChange={(value) =>
								setAttributes({ text: escapeHTML(value) })
							}
						/>
					</PanelBody>
				</InspectorControls>
			)}
			<a
				href="#filter-pseudo-link"
				onClick={(event) => event.preventDefault()}
				{...blockProps}
			>
				<RichText
					tagName="span"
					value={text}
					onChange={(newText) => setAttributes({ text: newText })}
					placeholder={__('Add category text…', 'visual-portfolio')}
					allowedFormats={[]}
				/>
				{showCount && !isAll && count > 0 && (
					<span className="vp-block-loop-filter-count">{count}</span>
				)}
			</a>
		</>
	);
}
