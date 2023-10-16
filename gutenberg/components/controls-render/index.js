import './style.scss';

import classnames from 'classnames/dedupe';

import {
	__experimentalUnitControl,
	BaseControl,
	Button,
	ButtonGroup,
	CheckboxControl,
	Notice,
	PanelBody,
	RadioControl,
	RangeControl,
	TextareaControl,
	TextControl,
	ToggleControl,
	Tooltip,
	UnitControl as __stableUnitControl,
} from '@wordpress/components';
import {
	Component,
	RawHTML,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import controlConditionCheck from '../../utils/control-condition-check';
import controlGetValue from '../../utils/control-get-value';
import { maybeDecode, maybeEncode } from '../../utils/encode-decode';
import AlignControl from '../align-control';
import AspectRatio from '../aspect-ratio';
import ClassesTree from '../classes-tree';
import CodeEditor from '../code-editor';
import CollapseControl from '../collapse-control';
import ColorPicker from '../color-picker';
import DatePicker from '../date-picker';
import ElementsSelector from '../elements-selector';
import GalleryControl from '../gallery-control';
import IconsSelector from '../icons-selector';
import NavigatorControl from '../navigator-control';
import ProNote from '../pro-note';
import SelectControl from '../select-control';
import SortableControl from '../sortable-control';
import TabsControl from '../tabs-control';
import TilesSelector from '../tiles-selector';
import ToggleGroupControl from '../toggle-group-control';
import ToggleModal from '../toggle-modal';

const UnitControl = __stableUnitControl || __experimentalUnitControl;

const {
	controls: registeredControls,
	controls_categories: registeredControlsCategories,
	plugin_version: pluginVersion,
} = window.VPGutenbergVariables;

const openedCategoriesCache = {};

/**
 * Component Class
 */
class ControlsRender extends Component {
	render() {
		const {
			category,
			categoryToggle = true,
			attributes,
			setAttributes,
			controls,
			clientId,
			isSetupWizard,
			showPanel = true,
		} = this.props;

		if (!attributes) {
			return null;
		}

		// content source conditions.
		if (
			/^content-source-/g.test(category) &&
			category !== 'content-source-general' &&
			`content-source-${attributes.content_source}` !== category
		) {
			return null;
		}

		const usedControls = controls || registeredControls;
		const result = [];

		Object.keys(usedControls).forEach((name) => {
			const control = usedControls[name];

			if (
				category &&
				(!control.category || category !== control.category)
			) {
				return;
			}

			const controlData = applyFilters(
				'vpf.editor.controls-render-data',
				{
					attributes,
					setAttributes,
					onChange: (val) => {
						const newAttrs = applyFilters(
							'vpf.editor.controls-on-change',
							{ [control.name]: val },
							control,
							val,
							attributes
						);
						setAttributes(newAttrs);
					},
					...control,
				}
			);

			// Conditions check.
			if (!ControlsRender.AllowRender(controlData, isSetupWizard)) {
				return;
			}

			result.push(
				applyFilters(
					'vpf.editor.controls-render',
					<ControlsRender.Control
						key={`control-${control.name}-${control.label}`}
						{...controlData}
						clientId={clientId}
						isSetupWizard={isSetupWizard}
						renderProps={this.props}
					/>,
					controlData,
					this.props
				)
			);
		});

		let categoryTitle = categoryToggle ? category : false;
		let categoryIcon = false;
		let categoryPro = false;
		let categoryOpened = !categoryToggle;

		if (
			categoryToggle &&
			typeof registeredControlsCategories[category] !== 'undefined'
		) {
			categoryTitle = registeredControlsCategories[category].title;
			categoryIcon = registeredControlsCategories[category].icon || false;
			categoryPro = !!registeredControlsCategories[category].is_pro;

			if (typeof openedCategoriesCache[category] === 'undefined') {
				openedCategoriesCache[category] =
					registeredControlsCategories[category].is_opened || false;
			}
			categoryOpened = openedCategoriesCache[category];
		}

		if (isSetupWizard) {
			return result.length ? (
				<div className="vpf-setup-wizard-panel">{result}</div>
			) : (
				''
			);
		}

		if (!showPanel) {
			return result.length ? result : '';
		}

		return result.length ? (
			<PanelBody
				title={
					categoryTitle ? (
						<>
							{categoryIcon ? (
								<span className="vpf-control-category-title-icon">
									<RawHTML>{categoryIcon}</RawHTML>
								</span>
							) : null}
							<span>{categoryTitle}</span>
							{categoryPro ? (
								<span className="vpf-control-category-title-pro">
									{__('PRO', 'visual-portfolio')}
								</span>
							) : (
								''
							)}
						</>
					) : (
						false
					)
				}
				onToggle={() => {
					openedCategoriesCache[category] = !categoryOpened;
				}}
				initialOpen={categoryOpened}
				scrollAfterOpen
			>
				{result}
			</PanelBody>
		) : (
			''
		);
	}
}

/**
 * Render Single Control.
 *
 * @param {Object} props - control props.
 *
 * @return {JSX} control.
 */
ControlsRender.Control = function (props) {
	const { attributes, onChange, isSetupWizard } = props;
	const $ref = useRef();
	const [positionInGroup, setPositionInGroup] = useState('');

	const controlVal = controlGetValue(props.name, attributes);

	useEffect(() => {
		if (props.group && $ref.current) {
			const $element = $ref.current.parentElement.parentElement;
			let $prevSibling = $element.previousElementSibling;
			let $nextSibling = $element.nextElementSibling;

			// Skip separator.
			while (
				$prevSibling &&
				$prevSibling.classList.contains('vpf-control-group-separator')
			) {
				$prevSibling = $prevSibling.previousElementSibling;
			}
			while (
				$nextSibling &&
				$nextSibling.classList.contains('vpf-control-group-separator')
			) {
				$nextSibling = $nextSibling.nextElementSibling;
			}

			const isGroupEnabled =
				($prevSibling &&
					$prevSibling.classList.contains(
						`vpf-control-group-${props.group}`
					)) ||
				($nextSibling &&
					$nextSibling.classList.contains(
						`vpf-control-group-${props.group}`
					));
			const isStart =
				$prevSibling &&
				!$prevSibling.classList.contains(
					`vpf-control-group-${props.group}`
				) &&
				$prevSibling.classList.contains(`vpf-control-wrap`);
			const isEnd =
				$nextSibling &&
				!$nextSibling.classList.contains(
					`vpf-control-group-${props.group}`
				) &&
				$nextSibling.classList.contains(`vpf-control-wrap`);

			let newPosition = '';

			if (!isGroupEnabled) {
				// skip
			} else if (isStart) {
				newPosition = 'start';
			} else if (isEnd) {
				newPosition = 'end';
			}

			if (positionInGroup !== newPosition) {
				setPositionInGroup(newPosition);
			}
		}
	}, [$ref, props.group, controlVal, positionInGroup]);

	// Conditions check.
	if (!ControlsRender.AllowRender(props, isSetupWizard)) {
		return null;
	}

	let renderControl = '';
	let renderControlLabel = props.label;
	let renderControlAfter = '';
	let renderControlHelp = props.description ? (
		<RawHTML className="components-base-control__help">
			{props.description}
		</RawHTML>
	) : null;
	let renderControlClassName = classnames(
		'vpf-control-wrap',
		`vpf-control-wrap-${props.type}`
	);

	if (props.group) {
		renderControlClassName = classnames(
			renderControlClassName,
			'vpf-control-with-group',
			`vpf-control-group-${props.group}`,
			positionInGroup
				? `vpf-control-group-position-${positionInGroup}`
				: false
		);
	}

	const categoryControlOptions = [];

	// Check if category is empty.
	if (
		(props.type === 'category_tabs' ||
			props.type === 'category_toggle_group' ||
			props.type === 'category_collapse' ||
			props.type === 'category_navigator') &&
		props.options &&
		props.options.length
	) {
		props.options.forEach((opt) => {
			const isEmpty = ControlsRender.isCategoryEmpty({
				...props.renderProps,
				category: opt.category,
				categoryToggle: false,
			});

			if (!isEmpty) {
				categoryControlOptions.push(opt);
			}
		});
	}

	// Specific controls.
	switch (props.type) {
		case 'category_tabs':
			if (categoryControlOptions.length) {
				renderControl = (
					<TabsControl
						controlName={props.name}
						options={categoryControlOptions}
						key={categoryControlOptions}
					>
						{(tab) => {
							return (
								<ControlsRender
									{...props.renderProps}
									category={tab.name}
									categoryToggle={false}
								/>
							);
						}}
					</TabsControl>
				);
			} else {
				renderControl = null;
			}

			break;
		case 'category_toggle_group':
			if (categoryControlOptions.length) {
				renderControl = (
					<ToggleGroupControl
						controlName={props.name}
						options={categoryControlOptions}
						key={categoryControlOptions}
					>
						{(group) => {
							return (
								<ControlsRender
									{...props.renderProps}
									category={group.category}
									categoryToggle={false}
								/>
							);
						}}
					</ToggleGroupControl>
				);
			} else {
				renderControl = null;
			}

			break;
		case 'category_collapse':
			if (categoryControlOptions.length) {
				renderControl = (
					<CollapseControl
						controlName={props.name}
						initialOpen={props.initialOpen}
						options={categoryControlOptions}
						key={categoryControlOptions}
					>
						{(tab) => {
							return (
								<ControlsRender
									{...props.renderProps}
									category={tab.category}
									categoryToggle={false}
								/>
							);
						}}
					</CollapseControl>
				);
			} else {
				renderControl = null;
			}

			break;
		case 'category_navigator':
			if (categoryControlOptions.length) {
				renderControl = (
					<NavigatorControl
						controlName={props.name}
						options={categoryControlOptions}
						key={categoryControlOptions}
					>
						{(tab) => {
							return (
								<ControlsRender
									{...props.renderProps}
									category={tab.category}
									categoryToggle={false}
								/>
							);
						}}
					</NavigatorControl>
				);
			} else {
				renderControl = null;
			}

			break;
		case 'html':
			renderControl = <RawHTML>{props.default}</RawHTML>;
			break;
		case 'select':
		case 'select2':
			renderControl = (
				<SelectControl
					controlName={props.name}
					callback={props.value_callback}
					attributes={attributes}
					value={controlVal}
					options={props.options || {}}
					onChange={(val) => onChange(val)}
					isSearchable={props.searchable}
					isMultiple={props.multiple}
					isCreatable={props.creatable || props.tags}
				/>
			);
			break;
		case 'buttons':
			renderControl = (
				<ButtonGroup>
					{Object.keys(props.options || {}).map((val) => (
						<Button
							isSmall
							isPrimary={controlVal === val}
							isPressed={controlVal === val}
							key={val}
							onClick={() => onChange(val)}
						>
							{props.options[val]}
						</Button>
					))}
				</ButtonGroup>
			);
			break;
		case 'icons_selector':
			renderControl = (
				<IconsSelector
					controlName={props.name}
					callback={props.value_callback}
					attributes={attributes}
					value={controlVal}
					options={props.options}
					onChange={(val) => onChange(val)}
					collapseRows={props.collapse_rows || false}
					isSetupWizard={isSetupWizard}
				/>
			);
			break;
		case 'tiles_selector':
			renderControl = (
				<TilesSelector
					value={controlVal}
					options={props.options}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		case 'elements_selector':
			renderControl = (
				<ElementsSelector
					value={controlVal}
					locations={props.locations}
					options={props.options}
					onChange={(val) => onChange(val)}
					props={props}
				/>
			);
			break;
		case 'align': {
			renderControl = (
				<AlignControl
					value={controlVal}
					options={props.options || 'horizontal'}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		}
		case 'aspect_ratio': {
			renderControl = (
				<AspectRatio
					value={controlVal}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		}
		case 'gallery':
			renderControl = (
				<GalleryControl
					imageControls={props.image_controls}
					focalPoint={props.focal_point}
					attributes={attributes}
					name={props.name}
					value={controlVal}
					onChange={(val) => onChange(val)}
					isSetupWizard={isSetupWizard}
				/>
			);
			break;
		case 'code_editor':
			renderControl = (
				<CodeEditor
					value={props.encode ? maybeDecode(controlVal) : controlVal}
					mode={props.mode}
					maxLines={props.max_lines}
					minLines={props.min_lines}
					codePlaceholder={props.code_placeholder}
					onChange={(val) =>
						onChange(props.encode ? maybeEncode(val) : val)
					}
				/>
			);

			if (props.allow_modal) {
				renderControlAfter = (
					<ToggleModal
						modalTitle={__('Custom CSS', 'visual-portfolio')}
						buttonLabel={__('Open in Modal', 'visual-portfolio')}
						size="md"
					>
						<BaseControl
							id={`vpf-custom-css-${props.label || props.name}`}
							label={props.label}
							help={
								props.description ? (
									<RawHTML>{props.description}</RawHTML>
								) : (
									false
								)
							}
							className={classnames(
								'vpf-control-wrap',
								`vpf-control-wrap-${props.type}`
							)}
						>
							<div>{renderControl}</div>
						</BaseControl>
						{props.classes_tree ? (
							<>
								<p>{__('Classes Tree:', 'visual-portfolio')}</p>
								<ClassesTree {...props} />
							</>
						) : (
							''
						)}
					</ToggleModal>
				);
			}
			break;
		case 'range':
			renderControl = (
				<RangeControl
					min={props.min}
					max={props.max}
					step={props.step}
					value={parseFloat(controlVal)}
					onChange={(val) => onChange(parseFloat(val))}
				/>
			);
			break;
		case 'toggle':
			renderControl = (
				<ToggleControl
					checked={controlVal}
					label={props.alongside}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		case 'checkbox':
			renderControl = (
				<CheckboxControl
					checked={controlVal}
					label={props.alongside}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		case 'radio':
			renderControl = (
				<RadioControl
					label={renderControlLabel}
					selected={controlVal}
					options={Object.keys(props.options || {}).map((val) => ({
						label: props.options[val],
						value: val,
					}))}
					onChange={(option) => onChange(option)}
				/>
			);
			renderControlLabel = false;
			break;
		case 'color':
			renderControl = (
				<ColorPicker
					label={renderControlLabel}
					value={controlVal}
					alpha={props.alpha}
					gradient={props.gradient}
					onChange={(val) => onChange(val)}
				/>
			);
			renderControlLabel = false;
			break;
		case 'date':
			renderControl = (
				<DatePicker
					value={controlVal}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		case 'textarea':
			renderControl = (
				<TextareaControl
					label={renderControlLabel}
					value={controlVal}
					onChange={(val) => onChange(val)}
				/>
			);
			renderControlLabel = false;
			break;
		case 'url':
			renderControl = (
				<TextControl
					label={renderControlLabel}
					type="url"
					value={controlVal}
					onChange={(val) => onChange(val)}
				/>
			);
			renderControlLabel = false;
			break;
		case 'number':
			renderControl = (
				<TextControl
					label={renderControlLabel}
					type="number"
					min={props.min}
					max={props.max}
					step={props.step}
					value={parseFloat(controlVal)}
					onChange={(val) => onChange(parseFloat(val))}
				/>
			);
			renderControlLabel = false;
			break;
		case 'unit':
			renderControl = (
				<UnitControl
					label={renderControlLabel}
					value={controlVal}
					onChange={(val) => onChange(val)}
					labelPosition="edge"
					__unstableInputWidth="70px"
				/>
			);
			renderControlLabel = false;
			break;
		case 'hidden':
			renderControl = (
				<TextControl
					type="hidden"
					value={controlVal}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		case 'notice':
			renderControl = renderControlHelp ? (
				<Notice status={props.status} isDismissible={false}>
					{renderControlHelp}
				</Notice>
			) : (
				''
			);
			renderControlHelp = false;
			break;
		case 'pro_note':
			renderControl = (
				<ProNote title={renderControlLabel}>
					{renderControlHelp || ''}
					<ProNote.Button
						target="_blank"
						rel="noopener noreferrer"
						href={`https://visualportfolio.co/pricing/?utm_source=plugin&utm_medium=block_settings&utm_campaign=${props.name}&utm_content=${pluginVersion}`}
					>
						{__('Go Pro', 'visual-portfolio')}
					</ProNote.Button>
				</ProNote>
			);
			renderControlLabel = false;
			renderControlHelp = false;
			break;
		case 'sortable':
			renderControl = (
				<SortableControl
					label={renderControlLabel}
					controlName={props.name}
					attributes={attributes}
					value={controlVal}
					options={props.options || {}}
					defaultVal={props.default || {}}
					allowDisablingOptions={
						props.allow_disabling_options || false
					}
					onChange={(val) => onChange(val)}
				/>
			);
			break;
		default:
			renderControl = (
				<TextControl
					label={renderControlLabel}
					value={controlVal}
					onChange={(val) => onChange(val)}
				/>
			);
			renderControlLabel = false;
	}

	// Hint.
	if (props.hint) {
		renderControl = (
			<Tooltip text={props.hint} position={props.hint_place}>
				<div>{renderControl}</div>
			</Tooltip>
		);
	}

	// TODO: use this filter for custom controls.
	const data = applyFilters(
		'vpf.editor.controls-render-inner-data',
		{
			renderControl,
			renderControlLabel,
			renderControlHelp,
			renderControlAfter,
			renderControlClassName,
		},
		{ props, controlVal }
	);

	// Prevent rendering.
	if (data.renderControl === null) {
		return null;
	}

	return (
		<>
			{positionInGroup === 'start' ? (
				<div className="vpf-control-group-separator" />
			) : null}
			<BaseControl
				id={`vpf-control-group-${props.name}`}
				label={data.renderControlLabel}
				className={data.renderControlClassName}
			>
				<div ref={$ref}>{data.renderControl}</div>
				{data.renderControlHelp}
			</BaseControl>
			{data.renderControlAfter}
			{positionInGroup === 'end' ? (
				<div className="vpf-control-group-separator" />
			) : null}
		</>
	);
};

/**
 * Check if control is allowed to rendering.
 *
 * @param props
 * @param isSetupWizard
 */
ControlsRender.AllowRender = function (props, isSetupWizard = false) {
	if (props.skip) {
		return false;
	}

	if (
		props.condition &&
		props.condition.length &&
		!controlConditionCheck(props.condition, props.attributes)
	) {
		return false;
	}

	if (isSetupWizard && !props.setup_wizard) {
		return false;
	}

	return true;
};

/**
 * Check if category does not contains controls.
 *
 * @param props
 */
ControlsRender.isCategoryEmpty = function (props) {
	const { category, attributes, setAttributes, controls, isSetupWizard } =
		props;

	const usedControls = controls || registeredControls;
	let isEmpty = true;

	Object.keys(usedControls).forEach((name) => {
		if (!isEmpty) {
			return;
		}

		const control = usedControls[name];

		if (category && (!control.category || category !== control.category)) {
			return;
		}

		const controlData = applyFilters('vpf.editor.controls-render-data', {
			attributes,
			setAttributes,
			onChange: (val) => {
				const newAttrs = applyFilters(
					'vpf.editor.controls-on-change',
					{ [control.name]: val },
					control,
					val,
					attributes
				);
				setAttributes(newAttrs);
			},
			...control,
		});

		// Conditions check.
		if (!ControlsRender.AllowRender(controlData, isSetupWizard)) {
			return;
		}

		isEmpty = false;
	});

	return isEmpty;
};

export default ControlsRender;
