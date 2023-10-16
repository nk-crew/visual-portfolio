import './style.scss';

import classnames from 'classnames/dedupe';

import { Button } from '@wordpress/components';
import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import MasonryWrapper from '../masonry-wrapper';
import StylesRender from '../styles-render';
import ToggleModal from '../toggle-modal';

/**
 * Component Class
 */
export default class TilesSelector extends Component {
	constructor(...args) {
		super(...args);

		this.renderPreview = this.renderPreview.bind(this);
	}

	renderPreview(tilesType) {
		const settings = tilesType.split(/[:|]/);
		const selector = `[data-tiles-preview="${tilesType}"]`;
		let styles = '';

		// remove last empty item
		if (
			typeof settings[settings.length - 1] !== 'undefined' &&
			!settings[settings.length - 1]
		) {
			settings.pop();
		}

		// get columns number
		const columns = parseInt(settings[0], 10) || 1;
		settings.shift();

		// set columns
		styles += `${selector} .vpf-tiles-preview-item-wrap { width: ${
			100 / columns
		}%; }`;

		// set items sizes
		if (settings && settings.length) {
			for (let k = 0; k < settings.length; k += 1) {
				const size = settings[k].split(',');
				const w = parseFloat(size[0]) || 1;
				const h = parseFloat(size[1]) || 1;

				let itemSelector = '.vpf-tiles-preview-item-wrap';
				if (settings.length > 1) {
					itemSelector += `:nth-of-type(${settings.length}n+${
						k + 1
					})`;
				}

				if (w && w !== 1) {
					styles += `${selector} ${itemSelector} { width: ${
						(w * 100) / columns
					}%; }`;
				}
				styles += `${selector} ${itemSelector} .vpf-tiles-preview-item::after { padding-top: ${
					h * 100
				}%; }`;
			}
		}

		return (
			<>
				<StylesRender>{styles}</StylesRender>
				<MasonryWrapper
					data-tiles-preview={tilesType}
					options={{
						transitionDuration: 0,
					}}
				>
					{Array(...Array(4 * columns)).map((i) => (
						<div key={i} className="vpf-tiles-preview-item-wrap">
							<div className="vpf-tiles-preview-item" />
						</div>
					))}
				</MasonryWrapper>
			</>
		);
	}

	render() {
		const { value, options, onChange } = this.props;

		return (
			<div className="vpf-component-tiles-selector">
				<ToggleModal
					modalTitle={__('Tiles', 'visual-portfolio')}
					buttonLabel={__('Edit Tiles', 'visual-portfolio')}
				>
					<div className="vpf-component-tiles-selector-items">
						{options.map((data) => (
							<Button
								key={data.value}
								onClick={() => onChange(data.value)}
								className={classnames(
									'vpf-tiles-preview-button',
									value === data.value
										? 'vpf-tiles-preview-button-active'
										: ''
								)}
							>
								{this.renderPreview(data.value)}
							</Button>
						))}
					</div>
				</ToggleModal>
				<div className="vpf-tiles-preview-button">
					{this.renderPreview(value)}
				</div>
			</div>
		);
	}
}
