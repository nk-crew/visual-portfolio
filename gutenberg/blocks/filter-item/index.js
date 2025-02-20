/* eslint-disable jsx-a11y/anchor-is-valid */
// filter-item/index.js
import './style.scss';

import classnames from 'classnames/dedupe';

import { RichText, useBlockProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';

registerBlockType('visual-portfolio/filter-item', {
	...metadata,
	edit: ({ attributes, setAttributes, context }) => {
		const { text, isActive, isAll, filter, count } = attributes;

		// Get context values with fallbacks
		const filterStyle =
			context?.['visual-portfolio/filter_style'] || 'minimal';
		const showCount =
			context?.['visual-portfolio/filter_show_count'] || false;
		const textAll =
			context?.['visual-portfolio/filter_text_all'] ||
			__('All', 'visual-portfolio');

		// Update "All" text when context changes
		useEffect(() => {
			if (isAll && textAll && text !== textAll) {
				setAttributes({ text: textAll });
			}
		}, [isAll, textAll, text, setAttributes]);

		const blockProps = useBlockProps({
			className: classnames('vp-filter__item', {
				'vp-filter__item-active': isActive,
				[`vp-filter__item-style-${filterStyle}`]: true,
			}),
		});

		if (filterStyle === 'dropdown') {
			return null;
		}

		return (
			<div {...blockProps}>
				<a
					className="vp-filter__item-button"
					href={'#'}
					data-vp-filter={filter}
				>
					<RichText
						tagName="span"
						value={text}
						onChange={(newText) => setAttributes({ text: newText })}
						placeholder={
							isAll
								? textAll
								: __('Add filter text…', 'visual-portfolio')
						}
						allowedFormats={[]}
					/>
					{showCount && !isAll && count > 0 && (
						<span className="vp-filter__item-count">
							{`(${count})`}
						</span>
					)}
				</a>
			</div>
		);
	},

	save: () => {
		return null;
	},
});
