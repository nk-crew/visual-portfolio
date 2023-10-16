import './style.scss';

import { SelectControl, TextControl } from '@wordpress/components';
import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const DEFAULT_RATIOS = {
	'': __('Auto', 'visual-portfolio'),
	'16:9': __('Wide 16:9', 'visual-portfolio'),
	'21:9': __('Ultra Wide 21:9', 'visual-portfolio'),
	'4:3': __('TV 4:3', 'visual-portfolio'),
	'3:2': __('Classic Film 3:2', 'visual-portfolio'),
	custom: __('Custom', 'visual-portfolio'),
};

/**
 * Component Class
 */
export default class AspectRatio extends Component {
	constructor(...args) {
		super(...args);

		this.state = {
			isCustom: typeof DEFAULT_RATIOS[this.props.value] === 'undefined',
		};

		this.updatePart = this.updatePart.bind(this);
	}

	/**
	 * Parse aspect ratio string.
	 *
	 * @param {string} val - aspect ratio string.
	 *
	 * @return {Array}
	 */
	parseParts(val) {
		let left = '';
		let right = '';

		if (val && /:/g.test(val)) {
			const parts = val.split(':');

			[left, right] = parts;
		}

		return [left, right];
	}

	/**
	 * Update part of aspect ration string
	 *
	 * @param {string}  val  - new value for ratio part
	 * @param {boolean} left - left part of aspect ratio
	 */
	updatePart(val, left = true) {
		const { value, onChange } = this.props;

		const parse = this.parseParts(value);

		if (!val || !parse[0] || !parse[1]) {
			return;
		}

		if (left) {
			parse[0] = val;
		} else {
			parse[1] = val;
		}

		onChange(`${parse[0]}:${parse[1]}`);
	}

	render() {
		const { value, onChange } = this.props;

		const { isCustom } = this.state;

		const parts = this.parseParts(value);

		return (
			<div className="vpf-component-aspect-ratio">
				<SelectControl
					value={isCustom ? 'custom' : value}
					onChange={(val) => {
						if (val === 'custom') {
							this.setState({
								isCustom: true,
							});

							if (!value) {
								onChange('3:4');
							}
						} else {
							this.setState({
								isCustom: false,
							});
							onChange(val);
						}
					}}
					options={Object.keys(DEFAULT_RATIOS).map((ratio) => ({
						label: DEFAULT_RATIOS[ratio],
						value: ratio,
					}))}
				/>
				{isCustom ? (
					<div className="vpf-component-aspect-ratio-custom">
						<TextControl
							label={__('Width', 'visual-portfolio')}
							type="number"
							value={parts[0]}
							onChange={(val) => this.updatePart(val, true)}
						/>
						<TextControl
							label={__('Height', 'visual-portfolio')}
							type="number"
							value={parts[1]}
							onChange={(val) => this.updatePart(val, false)}
						/>
					</div>
				) : (
					''
				)}
			</div>
		);
	}
}
