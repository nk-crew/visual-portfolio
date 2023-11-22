import './style.scss';

import { Button, ToggleControl } from '@wordpress/components';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import ControlsRender from '../controls-render';
import StepsWizard from './steps-wizard';

const { plugin_name: pluginName } = window.VPGutenbergVariables;

const NOTICE_LIMIT = parseInt(
	window.VPGutenbergVariables.items_count_notice_limit,
	10
);

function renderControls(props, category) {
	return <ControlsRender {...props} category={category} isSetupWizard />;
}

function hasLayoutElement(element, attributes) {
	const { layout_elements: layoutElements } = attributes;
	const checkIn = element === 'filter' ? 'top' : 'bottom';

	return (
		typeof layoutElements[checkIn] !== 'undefined' &&
		layoutElements[checkIn]?.elements.includes(element)
	);
}

function toggleLayoutElement(element, attributes) {
	const { layout_elements: layoutElements } = attributes;
	const checkIn = element === 'filter' ? 'top' : 'bottom';

	if (
		typeof layoutElements[checkIn] === 'undefined' ||
		!layoutElements[checkIn]?.elements
	) {
		return layoutElements;
	}

	const result = JSON.parse(JSON.stringify(layoutElements));

	if (hasLayoutElement(element, attributes)) {
		result[checkIn].elements = [];
	} else {
		result[checkIn].elements = [element];
	}

	return result;
}

/**
 * Component Class
 *
 * @param props
 */
export default function SetupWizard(props) {
	const { attributes, setAttributes } = props;
	const {
		align,
		content_source: contentSource,
		items_click_action: clickAction,
		layout,
		images,
	} = attributes;

	const [step, setStep] = useState(0);
	const [allowNextStep, setAllowNextStep] = useState(false);
	const maxSteps = 2.5;

	// Add startup attributes.
	useEffect(() => {
		if (!align && !contentSource) {
			setAttributes({ align: 'wide' });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Set some starter attributes for different content sources.
	// And hide the setup wizard.
	const setStarterAttributes = useCallback(() => {
		let newAttributes = {};

		switch (contentSource) {
			case 'images':
				// Hide setup wizard once user select images.
				if (images && images.length) {
					newAttributes = {
						...newAttributes,
						items_count: -1,
						items_click_action: 'popup_gallery',
					};

					// Add infinite scroll to the gallery when user adds a lot of images.
					if (layout !== 'slider' && images.length > NOTICE_LIMIT) {
						newAttributes = {
							...newAttributes,
							items_count: NOTICE_LIMIT,
							layout_elements: {
								top: {
									elements: [],
									align: 'center',
								},
								items: {
									elements: ['items'],
								},
								bottom: {
									elements: ['pagination'],
									align: 'center',
								},
							},
							pagination: 'infinite',
							pagination_hide_on_end: true,
						};
					}
				}
				break;
			case 'post-based':
			case 'social-stream':
				newAttributes = {
					...newAttributes,
					layout_elements: {
						top: {
							elements: [],
							align: 'center',
						},
						items: {
							elements: ['items'],
						},
						bottom: {
							elements: ['pagination'],
							align: 'center',
						},
					},
				};
				break;
			// no default
		}

		// Prepare better default settings for Popup.
		// We can't change defaults of registered controls because it may break existing user galleries.
		// This is why we change it here, in the Setup Wizard.
		newAttributes = {
			...newAttributes,
			items_click_action_popup_title_source:
				contentSource === 'post-based' ? 'title' : 'item_title',
			items_click_action_popup_description_source:
				contentSource === 'post-based'
					? 'description'
					: 'item_description',
			items_click_action_popup_deep_link_pid: 'filename',
		};

		setAttributes(newAttributes);
		setAllowNextStep(true);
	}, [contentSource, images, layout, setAttributes]);

	useEffect(() => {
		if (contentSource) {
			setStarterAttributes();
		}
		// We have to check for contentSource change here because we don't want to run this on every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [contentSource]);

	return (
		<div className={`vpf-setup-wizard vpf-setup-wizard-step-${step}`}>
			<StepsWizard step={step}>
				{/* Step 0: Content Source */}
				<StepsWizard.Step>
					<div className="vpf-setup-wizard-title">{pluginName}</div>
					<div
						className="vpf-setup-wizard-description"
						dangerouslySetInnerHTML={{
							__html: __(
								'Set the common settings in the setup wizard,<br />more options will be available in the block settings.<br />Select the Content Source first:',
								'visual-portfolio'
							),
						}}
					/>
					{renderControls(props, 'content-source')}
					{renderControls(props, 'content-source-images')}
					{renderControls(props, 'content-source-social-stream')}
				</StepsWizard.Step>

				{/* Step 1: Items Style */}
				<StepsWizard.Step>
					<div className="vpf-setup-wizard-title">
						{__('Items Style', 'visual-portfolio')}
					</div>
					<div
						className="vpf-setup-wizard-description"
						dangerouslySetInnerHTML={{
							__html: __(
								'Select one of the featured styles to get started.<br />More style settings will be available in the block settings.',
								'visual-portfolio'
							),
						}}
					/>
					{renderControls(props, 'items-style')}
				</StepsWizard.Step>

				{/* Step 2: Layout Elements */}
				<StepsWizard.Step>
					<div className="vpf-setup-wizard-title">
						{__('Additional Settings', 'visual-portfolio')}
					</div>
					<div className="vpf-setup-wizard-layout-elements">
						<div>
							<ToggleControl
								label={__('Filter', 'visual-portfolio')}
								checked={hasLayoutElement('filter', attributes)}
								onChange={() => {
									setAttributes({
										layout_elements: toggleLayoutElement(
											'filter',
											attributes
										),
									});
								}}
							/>
						</div>
						<div>
							<ToggleControl
								label={__('Pagination', 'visual-portfolio')}
								checked={hasLayoutElement(
									'pagination',
									attributes
								)}
								onChange={() => {
									setAttributes({
										layout_elements: toggleLayoutElement(
											'pagination',
											attributes
										),
									});
								}}
							/>
						</div>
						<div>
							<ToggleControl
								label={__('Popup Gallery', 'visual-portfolio')}
								checked={clickAction === 'popup_gallery'}
								onChange={() => {
									setAttributes({
										items_click_action:
											clickAction === 'popup_gallery'
												? 'url'
												: 'popup_gallery',
									});
								}}
							/>
						</div>
					</div>
				</StepsWizard.Step>
			</StepsWizard>

			{/* Pagination */}
			<div className="vpf-setup-wizard-pagination">
				{contentSource ? (
					<>
						<div className="vpf-setup-wizard-pagination-button">
							<Button
								isLink
								onClick={() => {
									// Skip Setup
									if (step === 0) {
										setAttributes({
											setup_wizard: '',
											content_source:
												attributes.contentSource ||
												'images',
										});

										// Previous Step
									} else {
										setStep(step - 1);
									}
								}}
							>
								{step === 0
									? __('Skip Setup', 'visual-portfolio')
									: __('Previous Step', 'visual-portfolio')}
							</Button>
						</div>
						<div className="vpf-setup-wizard-pagination-progress">
							<div
								style={{
									width: `${Math.max(
										15,
										Math.min(100, (100 * step) / maxSteps)
									)}%`,
								}}
							/>
						</div>
						<div className="vpf-setup-wizard-pagination-button vpf-setup-wizard-pagination-button-end">
							<Button
								isPrimary
								disabled={!allowNextStep}
								onClick={() => {
									if (step === 2) {
										setAttributes({ setup_wizard: '' });
									} else {
										setStep(step + 1);
									}
								}}
							>
								{__('Continue', 'visual-portfolio')}
								<svg
									width="14"
									height="14"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									style={{ marginLeft: '5px' }}
								>
									<path
										d="M3 10H17"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										fill="none"
									/>
									<path
										d="M11 4L17 10L11 16"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										fill="none"
									/>
								</svg>
							</Button>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
