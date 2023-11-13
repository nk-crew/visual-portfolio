import './style.scss';

import classnames from 'classnames/dedupe';

import {
	Button,
	Dropdown,
	DropdownMenu,
	Modal,
	PanelBody,
	Toolbar,
	ToolbarButton,
} from '@wordpress/components';
import { Component, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import ControlsRender from '../controls-render';

const alignIcons = {
	left: (
		<svg
			width="24"
			height="24"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			role="img"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M9 9v6h11V9H9zM4 20h1.5V4H4v16z" />
		</svg>
	),
	center: (
		<svg
			width="24"
			height="24"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			role="img"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M20 9h-7.2V4h-1.6v5H4v6h7.2v5h1.6v-5H20z" />
		</svg>
	),
	right: (
		<svg
			width="24"
			height="24"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			role="img"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M4 15h11V9H4v6zM18.5 4v16H20V4h-1.5z" />
		</svg>
	),
	between: (
		<svg
			width="24"
			height="24"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			role="img"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M9 15h6V9H9v6zm-5 5h1.5V4H4v16zM18.5 4v16H20V4h-1.5z" />
		</svg>
	),
};

/**
 * Options render
 *
 * @param props
 */
function ElementsSelectorOptions(props) {
	const {
		location,
		locationData,
		value,
		onChange,
		options,
		optionName,
		parentProps,
	} = props;

	const [isOpen, setOpen] = useState(false);
	const openModal = () => setOpen(true);
	const closeModal = () => setOpen(false);

	return (
		<>
			<button
				type="button"
				aria-expanded={isOpen}
				className="vpf-component-elements-selector-control-location-options-item"
				onClick={openModal}
			>
				{options[optionName] ? options[optionName].title : optionName}
				<svg
					width="20"
					height="20"
					viewBox="0 0 20 20"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M11 4L17 10M17 10L11 16M17 10H3"
						stroke="black"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
			{isOpen ? (
				<Modal
					title={`${
						options[optionName]
							? options[optionName].title
							: optionName
					} ${__('Settings', 'visual-portfolio')}`}
					onRequestClose={(e) => {
						if (
							e?.relatedTarget?.classList?.contains('media-modal')
						) {
							// Don't close modal if opened media modal.
						} else {
							closeModal(e);
						}
					}}
					className="vpf-component-elements-selector-modal"
				>
					{options[optionName] && options[optionName].category ? (
						<ControlsRender
							{...parentProps.props}
							category={options[optionName].category}
							categoryToggle={false}
						/>
					) : null}
					{optionName !== 'items' ? (
						<PanelBody>
							<Button
								isLink
								style={{
									color: 'red',
									marginTop: '5px',
								}}
								onClick={() => {
									if (
										// eslint-disable-next-line no-alert
										window.confirm(
											__(
												'Are you sure you want to remove the element?',
												'visual-portfolio'
											)
										)
									) {
										onChange({
											...value,
											[location]: {
												...value[location],
												elements:
													locationData.elements.filter(
														(elementName) =>
															elementName !==
															optionName
													),
											},
										});
									}
								}}
							>
								{__('Remove', 'visual-portfolio')}
								{` ${
									options[optionName]
										? options[optionName].title
										: optionName
								}`}
							</Button>
						</PanelBody>
					) : null}
				</Modal>
			) : null}
		</>
	);
}

/**
 * Component Class
 */
export default class ElementsSelector extends Component {
	constructor(...args) {
		super(...args);

		this.getLocationData = this.getLocationData.bind(this);
		this.renderLocation = this.renderLocation.bind(this);
		this.renderAlignSettings = this.renderAlignSettings.bind(this);
	}

	getLocationData(location) {
		const { options, locations, value } = this.props;

		const title =
			(locations[location] && locations[location].title) || false;
		const elements =
			value[location] && value[location].elements
				? value[location].elements
				: [];
		const align =
			value[location] && value[location].align
				? value[location].align
				: false;
		const availableAlign =
			locations[location] && locations[location].align
				? locations[location].align
				: [];
		const availableElements = {};

		// find all available elements
		Object.keys(options).forEach((name) => {
			const data = options[name];

			if (
				(!data.allowed_locations ||
					data.allowed_locations.indexOf(location) !== -1) &&
				elements.indexOf(name) === -1
			) {
				availableElements[name] = data;
			}
		});

		return {
			title,
			elements,
			align,
			availableAlign,
			availableElements,
		};
	}

	renderAlignSettings(location) {
		const { value, onChange } = this.props;

		const locationData = this.getLocationData(location);
		const controls = [];

		if (locationData.availableAlign.length) {
			locationData.availableAlign.forEach((alignName) => {
				controls.push(
					<ToolbarButton
						key={alignName}
						icon={alignIcons[alignName]}
						label={`${
							alignName.charAt(0).toUpperCase() +
							alignName.slice(1)
						}`}
						onClick={() =>
							onChange({
								...value,
								[location]: {
									...value[location],
									align: alignName,
								},
							})
						}
						isActive={
							locationData.align
								? locationData.align === alignName
								: false
						}
					/>
				);
			});
		}

		if (!controls.length) {
			return null;
		}

		return (
			<Dropdown
				className="vpf-component-elements-selector-align__dropdown"
				contentClassName="vpf-component-elements-selector-align__dropdown-content"
				popoverProps={{
					placement: 'left-start',
					offset: 36,
					shift: true,
				}}
				renderToggle={({ isOpen, onToggle }) => (
					<button
						type="button"
						aria-expanded={isOpen}
						className="vpf-component-elements-selector-control-location-options-item"
						onClick={onToggle}
					>
						{locationData.align && alignIcons[locationData.align]
							? alignIcons[locationData.align]
							: alignIcons.center}
					</button>
				)}
				renderContent={() => (
					<Toolbar label="Elements Selector">{controls}</Toolbar>
				)}
			/>
		);
	}

	renderLocation(location) {
		const { value, onChange, options } = this.props;

		const locationData = this.getLocationData(location);
		const { availableElements } = locationData;

		return (
			<div
				key={location}
				className="vpf-component-elements-selector-control-location"
			>
				{locationData.title ? (
					<div className="vpf-component-elements-selector-control-location-title">
						{locationData.title}
					</div>
				) : null}

				{locationData.availableAlign.length &&
				locationData.elements.length ? (
					<div className="vpf-component-elements-selector-control-location-align">
						{this.renderAlignSettings(location)}
					</div>
				) : null}

				<div
					className={classnames(
						'vpf-component-elements-selector-control-location-options',
						locationData.align
							? `vpf-component-elements-selector-control-location-options-${locationData.align}`
							: ''
					)}
				>
					{locationData.elements.length
						? locationData.elements.map((optionName) => (
								<ElementsSelectorOptions
									key={optionName}
									location={location}
									locationData={locationData}
									value={value}
									onChange={onChange}
									options={options}
									optionName={optionName}
									parentProps={this.props}
								/>
						  ))
						: null}
					{Object.keys(availableElements).length ? (
						<DropdownMenu
							className="vpf-component-elements-selector-control-location-options-add-button"
							popoverProps={{
								position: 'bottom center',
							}}
							icon={
								<svg
									width="20"
									height="20"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									role="img"
									aria-hidden="true"
									focusable="false"
								>
									<path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
								</svg>
							}
							controls={Object.keys(availableElements).map(
								(optionName) => ({
									title: (
										<>
											{
												availableElements[optionName]
													.title
											}
											{availableElements[optionName]
												.is_pro ? (
												<span className="vpf-component-elements-selector-control-location-options-title-pro">
													{__(
														'PRO',
														'visual-portfolio'
													)}
												</span>
											) : (
												''
											)}
										</>
									),
									onClick() {
										if (
											availableElements[optionName].is_pro
										) {
											return;
										}

										const newElements = [
											...locationData.elements,
										];

										if (
											newElements.indexOf(optionName) ===
											-1
										) {
											newElements.push(optionName);

											onChange({
												...value,
												[location]: {
													...value[location],
													elements: newElements,
												},
											});
										}
									},
								})
							)}
						/>
					) : (
						''
					)}
				</div>
			</div>
		);
	}

	render() {
		const { locations } = this.props;

		return (
			<div className="vpf-component-elements-selector-control">
				{Object.keys(locations).map((name) =>
					this.renderLocation(name)
				)}
			</div>
		);
	}
}
