/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import controlGetValue from '../utils/control-get-value';

/**
 * WordPress dependencies
 */
const {
    __,
} = wp.i18n;

const {
    addFilter,
} = wp.hooks;

const {
    RawHTML,
} = wp.element;

const {
    BaseControl,
    ButtonGroup,
    Button,
} = wp.components;

// Items count with "All Items" button.
addFilter( 'vpf.editor.controls-render', 'vpf/editor/controls-render/customize-controls', ( render, data ) => {
    if ( 'items_count' === data.name ) {
        const {
            description,
            attributes,
            onChange,
        } = data;

        const renderControlHelp = description ? <RawHTML>{ description }</RawHTML> : false;
        const renderControlClassName = classnames( 'vpf-control-wrap', `vpf-control-wrap-${ data.type }` );
        const controlVal = controlGetValue( data.name, attributes );

        render = (
            <BaseControl
                label={ data.label }
                help={ renderControlHelp }
                className={ renderControlClassName }
            >
                <div>
                    <ButtonGroup>
                        <Button
                            isSmall
                            isSecondary
                            isPrimary={ -1 !== controlVal }
                            onClick={ () => {
                                if ( -1 === controlVal ) {
                                    onChange( parseFloat( data.default || 6 ) );
                                }
                            } }
                        >
                            { __( 'Custom Count', '@@text_domain' ) }
                        </Button>
                        <Button
                            isSmall
                            isSecondary
                            isPrimary={ -1 === controlVal }
                            onClick={ () => {
                                // eslint-disable-next-line no-alert
                                if ( -1 !== controlVal && window.confirm( __( 'Be careful, the output of all your items can adversely affect the performance of your site, this option may be helpful for image galleries.', '@@text_domain' ) ) ) {
                                    onChange( -1 );
                                }
                            } }
                        >
                            { __( 'All Items', '@@text_domain' ) }
                        </Button>
                    </ButtonGroup>
                    { -1 !== controlVal ? (
                        <div className="components-base-control components-range-control">
                            <br />
                            <div className="components-base-control__field">
                                <input
                                    className="components-range-control__slider"
                                    type="range"
                                    min={ data.min }
                                    max={ data.max }
                                    step={ data.step }
                                    value={ controlVal }
                                    onChange={ ( e ) => onChange( parseFloat( e.target.value ) ) }
                                />
                                <input
                                    className="components-range-control__number"
                                    type="number"
                                    min={ data.min }
                                    max={ data.max }
                                    step={ data.step }
                                    value={ controlVal }
                                    onChange={ ( e ) => onChange( parseFloat( e.target.value ) ) }
                                />
                            </div>
                        </div>
                    ) : '' }
                </div>
            </BaseControl>
        );
    }

    return render;
} );
