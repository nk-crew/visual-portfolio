import './style.scss';

import selectStyles from 'gutenberg-react-select-styles';
import $ from 'jquery';
import rafSchd from 'raf-schd';
import Select, { components } from 'react-select';
import AsyncSelect from 'react-select/async';
import CreatableSelect from 'react-select/creatable';
import {
	SortableContainer,
	SortableElement,
	sortableHandle,
} from 'react-sortable-hoc';
import { debounce } from 'throttle-debounce';

import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const { Option } = components;

const { ajaxurl, VPGutenbergVariables } = window;

const cachedOptions = {};

const SortableSelect = SortableContainer(Select);
const SortableCreatableSelect = SortableContainer(CreatableSelect);
const SortableAsyncSelect = SortableContainer(AsyncSelect);
const SortableMultiValueLabel = sortableHandle((props) => (
	<components.MultiValueLabel {...props} />
));
const SortableMultiValue = SortableElement((props) => {
	// this prevents the menu from being opened/closed when the user clicks
	// on a value to begin dragging it. ideally, detecting a click (instead of
	// a drag) would still focus the control and toggle the menu, but that
	// requires some magic with refs that are out of scope for this example
	const onMouseDown = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const innerProps = { ...props.innerProps, onMouseDown };
	return <components.MultiValue {...props} innerProps={innerProps} />;
});

function arrayMove(array, from, to) {
	array = array.slice();
	array.splice(to < 0 ? array.length + to : to, 0, array.splice(from, 1)[0]);
	return array;
}

/**
 * Component Class
 */
export default class VpfSelectControl extends Component {
	constructor(...args) {
		super(...args);

		const { callback } = this.props;

		this.state = {
			options: {},
			ajaxStatus: !!callback,
		};

		this.getOptions = this.getOptions.bind(this);
		this.getDefaultValue = this.getDefaultValue.bind(this);
		this.findValueData = this.findValueData.bind(this);
		this.requestAjax = this.requestAjax.bind(this);
		this.requestAjaxDebounce = debounce(300, rafSchd(this.requestAjax));
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
	 * Get options list.
	 *
	 * @return {Object} - options list for React Select.
	 */
	getOptions() {
		const { controlName } = this.props;

		if (cachedOptions[controlName]) {
			return cachedOptions[controlName];
		}

		return Object.keys(this.state.options).length
			? this.state.options
			: this.props.options;
	}

	/**
	 * Get default value in to support React Select attribute.
	 *
	 * @return {Object} - value object for React Select.
	 */
	getDefaultValue() {
		const { value, isMultiple } = this.props;

		let result = null;

		if (isMultiple) {
			if ((!value && typeof value !== 'string') || !value.length) {
				return result;
			}

			result = [];

			value.forEach((innerVal) => {
				result.push(this.findValueData(innerVal));
			});
		} else {
			if (!value && typeof value !== 'string') {
				return result;
			}

			result = this.findValueData(value);
		}

		return result;
	}

	/**
	 * Find option data by value.
	 *
	 * @param {string} findVal - value.
	 *
	 * @return {Object | boolean} - value object.
	 */
	findValueData(findVal) {
		let result = {
			value: findVal,
			label: findVal,
		};

		const options = this.getOptions();

		// Find value in options.
		if (options) {
			Object.keys(options).forEach((val) => {
				const data = options[val];

				if (val === findVal) {
					if (typeof data === 'string') {
						result.label = data;
					} else {
						result = data;
					}
				}
			});
		}

		return result;
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

	/**
	 * Prepare options for React Select structure.
	 *
	 * @param {Object} options - options object.
	 *
	 * @return {Object} - prepared options.
	 */
	prepareOptions(options) {
		return Object.keys(options || {}).map((val) => {
			const option = options[val];
			let result = {
				value: val,
				label: options[val],
			};

			if (typeof option === 'object') {
				result = { ...option };
			}

			return result;
		});
	}

	render() {
		const { onChange, isMultiple, isSearchable, isCreatable, callback } =
			this.props;

		const { ajaxStatus } = this.state;

		const isAsync = !!callback && isSearchable;
		const isLoading = ajaxStatus && ajaxStatus === 'progress';

		const selectProps = {
			// Test opened menu items:
			// menuIsOpen: true,
			className: 'vpf-component-select',
			styles: {
				...selectStyles,
				menuPortal: (styles) => {
					return {
						...styles,
						zIndex: 1000000,
					};
				},
			},
			menuPortalTarget: document.body,
			components: {
				Option(optionProps) {
					const { data } = optionProps;

					return (
						<Option {...optionProps}>
							{typeof data.img !== 'undefined' ? (
								<div className="vpf-component-select-option-img">
									{data.img ? (
										<img src={data.img} alt={data.label} />
									) : (
										''
									)}
								</div>
							) : (
								''
							)}
							<span className="vpf-component-select-option-label">
								{data.label}
							</span>
							{data.category ? (
								<div className="vpf-component-select-option-category">
									{data.category}
								</div>
							) : (
								''
							)}
						</Option>
					);
				},
			},
			value: this.getDefaultValue(),
			options: this.prepareOptions(this.getOptions()),
			onChange(val) {
				if (isMultiple) {
					if (Array.isArray(val)) {
						const result = [];

						val.forEach((innerVal) => {
							result.push(innerVal ? innerVal.value : '');
						});

						onChange(result);
					} else {
						onChange([]);
					}
				} else {
					onChange(val ? val.value : '');
				}
			},
			isMulti: isMultiple,
			isSearchable,
			isLoading,
			isClearable: false,
			placeholder: isSearchable
				? __('Type to search…', 'visual-portfolio')
				: __('Select…', 'visual-portfolio'),
		};

		// Multiple select.
		if (isMultiple) {
			selectProps.useDragHandle = true;
			selectProps.axis = 'xy';
			selectProps.onSortEnd = ({ oldIndex, newIndex }) => {
				const newValue = arrayMove(
					this.getDefaultValue(),
					oldIndex,
					newIndex
				);
				selectProps.onChange(newValue);
			};
			selectProps.distance = 4;
			// small fix for https://github.com/clauderic/react-sortable-hoc/pull/352:
			selectProps.getHelperDimensions = ({ node }) =>
				node.getBoundingClientRect();
			selectProps.components.MultiValue = SortableMultiValue;
			selectProps.components.MultiValueLabel = SortableMultiValueLabel;

			// prevent closing options dropdown after select.
			selectProps.closeMenuOnSelect = false;
		}

		// Creatable select.
		if (isCreatable) {
			selectProps.placeholder = __(
				'Type and press Enter…',
				'visual-portfolio'
			);
			selectProps.isSearchable = true;

			if (isMultiple) {
				return <SortableCreatableSelect {...selectProps} />;
			}

			return <CreatableSelect {...selectProps} />;
		}

		// Async select.
		if (isAsync) {
			selectProps.loadOptions = (inputValue, cb) => {
				this.requestAjaxDebounce(
					{ q: inputValue },
					(result) => {
						const newOptions = [];

						if (result && result.options) {
							Object.keys(result.options).forEach((k) => {
								newOptions.push(result.options[k]);
							});
						}

						cb(newOptions.length ? newOptions : null);
					},
					false
				);
			};
			selectProps.cacheOptions = true;
			selectProps.defaultOptions = selectProps.options;

			delete selectProps.options;
			delete selectProps.isLoading;

			if (isMultiple) {
				return <SortableAsyncSelect {...selectProps} />;
			}

			return <AsyncSelect {...selectProps} />;
		}

		// Default select.
		if (isMultiple) {
			return <SortableSelect {...selectProps} />;
		}

		return <Select {...selectProps} />;
	}
}
