import './style.scss';

import classnames from 'classnames/dedupe';
import $ from 'jquery';

import { Button, Spinner } from '@wordpress/components';
import { Component, RawHTML } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const { ajaxurl, VPGutenbergVariables } = window;

const cachedOptions = {};

/**
 * Component Class
 */
export default class IconsSelector extends Component {
	constructor(...args) {
		super(...args);

		const { callback } = this.props;

		this.state = {
			options: { ...this.props.options },
			ajaxStatus: !!callback,
			collapsed: true,
		};

		cachedOptions[this.props.controlName] = { ...this.props.options };

		this.requestAjax = this.requestAjax.bind(this);
	}

	componentDidMount() {
		const { callback } = this.props;

		if (callback) {
			this.requestAjax({}, (result) => {
				if (result.options) {
					this.setState({
						options: result.options,
					});
				}
			});
		}
	}

	/**
	 * Request AJAX dynamic data.
	 *
	 * @param {Object}   additionalData  - additional data for AJAX call.
	 * @param {Function} callback        - callback.
	 * @param {boolean}  useStateLoading - use state change when loading.
	 */
	requestAjax(
		additionalData = {},
		callback = () => {},
		useStateLoading = true
	) {
		const { controlName, attributes } = this.props;

		if (this.isAJAXinProgress) {
			return;
		}

		this.isAJAXinProgress = true;

		if (useStateLoading) {
			this.setState({
				ajaxStatus: 'progress',
			});
		}

		const ajaxData = {
			action: 'vp_dynamic_control_callback',
			nonce: VPGutenbergVariables.nonce,
			vp_control_name: controlName,
			vp_attributes: attributes,
			...additionalData,
		};

		$.ajax({
			url: ajaxurl,
			method: 'POST',
			dataType: 'json',
			data: ajaxData,
			complete: (data) => {
				const json = data.responseJSON;

				if (callback && json.response) {
					if (json.response.options) {
						cachedOptions[controlName] = {
							...cachedOptions[controlName],
							...json.response.options,
						};
					}

					callback(json.response);
				}

				if (useStateLoading) {
					this.setState({
						ajaxStatus: true,
					});
				}

				this.isAJAXinProgress = false;
			},
		});
	}

	render() {
		const { controlName, value, onChange, collapseRows, isSetupWizard } =
			this.props;

		const { options, ajaxStatus, collapsed } = this.state;

		const isLoading = ajaxStatus && ajaxStatus === 'progress';

		if (isLoading) {
			return (
				<div className="vpf-component-icon-selector">
					<Spinner />
				</div>
			);
		}

		const optionsArray = Object.keys(options);
		const fromIndex = optionsArray.indexOf(value);

		const itemsPerRow = isSetupWizard ? 5 : 3;
		const allowedItems = collapseRows * itemsPerRow;
		const allowCollapsing =
			collapseRows !== false && optionsArray.length > allowedItems;
		const visibleCollapsedItems = allowedItems - 1;

		// Move the selected option to the end of collapsed list
		// in case this item is not visible.
		if (
			allowCollapsing &&
			collapsed &&
			fromIndex >= visibleCollapsedItems
		) {
			const toIndex = visibleCollapsedItems - 1;
			const element = optionsArray[fromIndex];
			optionsArray.splice(fromIndex, 1);
			optionsArray.splice(toIndex, 0, element);
		}

		return (
			<div
				className={classnames(
					'vpf-component-icon-selector',
					allowCollapsing
						? 'vpf-component-icon-selector-allow-collapsing'
						: ''
				)}
				data-control-name={controlName}
			>
				{optionsArray
					.filter((elm, i) => {
						if (allowCollapsing) {
							return collapsed ? i < visibleCollapsedItems : true;
						}
						return true;
					})
					.map((k) => {
						const option = options[k];
						let { icon } = option;

						if (isSetupWizard) {
							if (option.image_preview_wizard) {
								icon = `<img src="${option.image_preview_wizard}" alt="${option.title} Preview">`;
							} else if (option.icon_wizard) {
								icon = option.icon_wizard;
							}
						}

						return (
							<Button
								key={`icon-selector-${option.title}-${option.value}`}
								onClick={() => onChange(option.value)}
								className={classnames(
									'vpf-component-icon-selector-item',
									value === option.value
										? 'vpf-component-icon-selector-item-active'
										: '',
									option.className
								)}
							>
								{icon ? <RawHTML>{icon}</RawHTML> : ''}
								{option.title ? (
									<span>{option.title}</span>
								) : (
									''
								)}
							</Button>
						);
					})}
				{allowCollapsing ? (
					<Button
						onClick={() => {
							this.setState({
								collapsed: !collapsed,
							});
						}}
						className={classnames(
							'vpf-component-icon-selector-item',
							'vpf-component-icon-selector-item-collapse',
							collapsed
								? ''
								: 'vpf-component-icon-selector-item-expanded'
						)}
					>
						<div className="vpf-component-icon-selector-item-collapse">
							<svg
								width="11"
								height="6"
								viewBox="0 0 11 6"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M10 1.25L5.5 4.75L1 1.25"
									stroke="currentColor"
									strokeWidth="1"
								/>
							</svg>
						</div>
						<span>
							{collapsed
								? __('More', 'visual-portfolio')
								: __('Less', 'visual-portfolio')}
						</span>
					</Button>
				) : null}
			</div>
		);
	}
}
