/* eslint-disable no-useless-escape */

/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import IconsSelector from '../icons-selector';
import CodeEditor from '../code-editor';
import TilesSelector from '../tiles-selector';
import AlignControl from '../align-control';
import SelectControl from '../select-control';
// eslint-disable-next-line import/no-cycle
import GalleryControl from '../gallery-control';
import ColorPicker from '../color-picker';
import ClassesTree from '../classes-tree';
import ToggleModal from '../toggle-modal';
import controlConditionCheck from '../../utils/control-condition-check';
import controlGetValue from '../../utils/control-get-value';

/**
 * WordPress dependencies
 */
const {
    __,
} = wp.i18n;

const {
    Component,
    Fragment,
    RawHTML,
} = wp.element;

const {
    applyFilters,
} = wp.hooks;

const {
    PanelBody,
    Tooltip,
    BaseControl,
    ButtonGroup,
    Button,
    TextControl,
    TextareaControl,
    CheckboxControl,
    RadioControl,
    ToggleControl,
} = wp.components;

const {
    controls: registeredControls,
    controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

const {
    VPSavedLayoutVariables,
} = window;

/**
 * Component Class
 */
class ControlsRender extends Component {
    render() {
        const {
            category,
            attributes,
            setAttributes,
            controls,
            clientId,
            isSetupWizard,
        } = this.props;

        if ( ! attributes ) {
            return '';
        }

        // content source conditions.
        if ( /^content-source-/g.test( category ) && 'content-source-additional' !== category && `content-source-${ attributes.content_source }` !== category ) {
            return '';
        }

        const usedControls = controls || registeredControls;
        const result = [];

        Object.keys( usedControls )
            .forEach( ( name ) => {
                const control = usedControls[ name ];

                if ( category && ( ! control.category || category !== control.category ) ) {
                    return;
                }

                // Allow Stretch control on Saved Layouts editor only.
                if ( 'stretch' === control.name && ! VPSavedLayoutVariables ) {
                    return;
                }

                const controlData = applyFilters( 'vpf.editor.controls-render', {
                    attributes,
                    onChange: ( val ) => {
                        setAttributes( { [ control.name ]: val } );
                    },
                    ...control,
                } );

                // Conditions check.
                if ( ! ControlsRender.AllowRender( controlData, isSetupWizard ) ) {
                    return;
                }

                result.push(
                    <ControlsRender.Control
                        key={ `control-${ control.name }-${ control.label }` }
                        { ...controlData }
                        clientId={ clientId }
                        isSetupWizard={ isSetupWizard }
                    />
                );
            } );

        const categoryTitle = 'undefined' !== typeof registeredControlsCategories[ category ] ? registeredControlsCategories[ category ] : category;

        if ( isSetupWizard ) {
            return (
                result.length ? (
                    <div className="vpf-setup-wizard-panel">
                        { result }
                    </div>
                ) : ''
            );
        }

        return (
            result.length ? (
                <PanelBody title={ categoryTitle }>
                    { result }
                </PanelBody>
            ) : ''
        );
    }
}

/**
 * Render Single Control.
 *
 * @param {Object} props - control props.
 *
 * @returns {JSX} control.
 */
ControlsRender.Control = function( props ) {
    const {
        attributes,
        onChange,
        isSetupWizard,
    } = props;

    // Conditions check.
    if ( ! ControlsRender.AllowRender( props, isSetupWizard ) ) {
        return '';
    }

    let renderControl = '';
    let renderControlLabel = props.label;
    let renderControlAfter = '';
    const renderControlHelp = props.description ? <RawHTML>{ props.description }</RawHTML> : false;
    const renderControlClassName = classnames( 'vpf-control-wrap', `vpf-control-wrap-${ props.type }` );
    const controlVal = controlGetValue( props.name, attributes );

    // Specific controls.
    switch ( props.type ) {
    case 'html':
        renderControl = (
            <RawHTML>{ props.default }</RawHTML>
        );
        break;
    case 'select':
    case 'select2':
        renderControl = (
            <SelectControl
                controlName={ props.name }
                callback={ props.value_callback }
                attributes={ attributes }
                value={ controlVal }
                options={ props.options || {} }
                onChange={ ( val ) => onChange( val ) }
                isSearchable={ props.searchable }
                isMultiple={ props.multiple }
                isCreatable={ props.creatable || props.tags }
            />
        );
        break;
    case 'buttons':
        renderControl = (
            <ButtonGroup>
                { Object.keys( props.options || {} ).map( ( val ) => (
                    <Button
                        isSmall
                        isSecondary
                        isPrimary={ controlVal === val }
                        key={ val }
                        onClick={ () => onChange( val ) }
                    >
                        { props.options[ val ] }
                    </Button>
                ) ) }
            </ButtonGroup>
        );
        break;
    case 'icons_selector':
        renderControl = (
            <IconsSelector
                controlName={ props.name }
                callback={ props.value_callback }
                attributes={ attributes }
                value={ controlVal }
                options={ props.options }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        break;
    case 'tiles_selector':
        renderControl = (
            <TilesSelector
                value={ controlVal }
                options={ props.options }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        break;
    case 'align': {
        renderControl = (
            <AlignControl
                value={ controlVal }
                extended={ props.extended }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        break;
    }
    case 'gallery':
        renderControl = (
            <GalleryControl
                imageControls={ props.image_controls }
                attributes={ attributes }
                name={ props.name }
                value={ controlVal }
                onChange={ ( val ) => onChange( val ) }
                isSetupWizard={ isSetupWizard }
            />
        );
        break;
    case 'code_editor':
        renderControl = (
            <CodeEditor
                value={ controlVal }
                mode={ props.mode }
                maxLines={ props.max_lines }
                minLines={ props.min_lines }
                onChange={ ( val ) => onChange( val ) }
            />
        );

        if ( props.allow_modal ) {
            renderControlAfter = (
                <ToggleModal
                    modalTitle={ __( 'Custom CSS', '@@text_domain' ) }
                    buttonLabel={ __( 'Open in Modal', '@@text_domain' ) }
                >
                    <BaseControl
                        label={ props.label }
                        help={ props.description ? <RawHTML>{ props.description }</RawHTML> : false }
                        className={ classnames( 'vpf-control-wrap', `vpf-control-wrap-${ props.type }` ) }
                    >
                        <div>
                            { renderControl }
                        </div>
                    </BaseControl>
                    { props.classes_tree ? (
                        <Fragment>
                            <p>{ __( 'Classes Tree:', '@@text_domain' ) }</p>
                            <ClassesTree { ...props } />
                        </Fragment>
                    ) : '' }
                </ToggleModal>
            );
        }
        break;
    case 'range':
        // We can't use RangeControl just because it automatically resets value, that is not in range of min and max.
        //
        // <RangeControl
        //     min={ props.min }
        //     max={ props.max }
        //     step={ props.step }
        //     value={ controlVal }
        //     onChange={ ( val ) => onChange( val ) }
        // />
        renderControl = (
            <div className="components-base-control components-range-control">
                <div className="components-base-control__field">
                    <input
                        className="components-range-control__slider"
                        type="range"
                        min={ props.min }
                        max={ props.max }
                        step={ props.step }
                        value={ controlVal }
                        onChange={ ( e ) => onChange( parseFloat( e.target.value ) ) }
                    />
                    <input
                        className="components-range-control__number"
                        type="number"
                        min={ props.min }
                        max={ props.max }
                        step={ props.step }
                        value={ controlVal }
                        onChange={ ( e ) => onChange( parseFloat( e.target.value ) ) }
                    />
                </div>
            </div>
        );
        break;
    case 'toggle':
        renderControl = (
            <ToggleControl
                checked={ controlVal }
                label={ props.alongside }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        break;
    case 'checkbox':
        renderControl = (
            <CheckboxControl
                checked={ controlVal }
                label={ props.alongside }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        break;
    case 'radio':
        renderControl = (
            <RadioControl
                label={ renderControlLabel }
                selected={ controlVal }
                options={ (
                    Object.keys( props.options || {} ).map( ( val ) => (
                        {
                            label: props.options[ val ],
                            value: val,
                        }
                    ) )
                ) }
                onChange={ ( option ) => onChange( option ) }
            />
        );
        renderControlLabel = false;
        break;
    case 'color':
        renderControl = (
            <ColorPicker
                value={ controlVal }
                alpha={ props.alpha }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        break;
    case 'textarea':
        renderControl = (
            <TextareaControl
                label={ renderControlLabel }
                value={ controlVal }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        renderControlLabel = false;
        break;
    case 'url':
        renderControl = (
            <TextControl
                label={ renderControlLabel }
                type="url"
                value={ controlVal }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        renderControlLabel = false;
        break;
    case 'hidden':
        renderControl = (
            <TextControl
                type="hidden"
                value={ controlVal }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        break;
    default:
        renderControl = (
            <TextControl
                label={ renderControlLabel }
                value={ controlVal }
                onChange={ ( val ) => onChange( val ) }
            />
        );
        renderControlLabel = false;
    }

    // Hint.
    if ( props.hint ) {
        renderControl = (
            <Tooltip text={ props.hint } position={ props.hint_place }>
                <div>{ renderControl }</div>
            </Tooltip>
        );
    }

    return (
        <Fragment>
            <BaseControl
                label={ renderControlLabel }
                help={ renderControlHelp }
                className={ renderControlClassName }
            >
                <div>
                    { renderControl }
                </div>
            </BaseControl>
            { renderControlAfter }
        </Fragment>
    );
};

/**
 * Check if control is allowed to rendering.
 */
ControlsRender.AllowRender = function( props, isSetupWizard = false ) {
    if ( props.condition && props.condition.length && ! controlConditionCheck( props.condition, props.attributes ) ) {
        return false;
    }

    // console.log(isSetupWizard);


    if ( isSetupWizard && ! props.setup_wizard ) {
        return false;
    }

    return true;
};

export default ControlsRender;
