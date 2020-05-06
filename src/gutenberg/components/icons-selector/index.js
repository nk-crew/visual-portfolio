/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * WordPress dependencies
 */
const {
    jQuery: $,
    ajaxurl,
    VPGutenbergVariables,
} = window;

const {
    Component,
    RawHTML,
} = wp.element;

const {
    Button,
    Spinner,
} = wp.components;

const cachedOptions = {};

/**
 * Component Class
 */
export default class IconsSelector extends Component {
    constructor( ...args ) {
        super( ...args );

        const {
            callback,
        } = this.props;

        this.state = {
            options: { ...this.props.options },
            ajaxStatus: !! callback,
        };

        cachedOptions[ this.props.controlName ] = { ...this.props.options };

        this.requestAjax = this.requestAjax.bind( this );
    }

    componentDidMount() {
        const {
            callback,
        } = this.props;

        if ( callback ) {
            this.requestAjax( {}, ( result ) => {
                if ( result.options ) {
                    this.setState( {
                        options: result.options,
                    } );
                }
            } );
        }
    }

    /**
     * Request AJAX dynamic data.
     *
     * @param {Object} additionalData - additional data for AJAX call.
     * @param {Function} callback - callback.
     * @param {Boolean} useStateLoading - use state change when loading.
     */
    requestAjax( additionalData = {}, callback, useStateLoading = true ) {
        const {
            controlName,
            attributes,
        } = this.props;

        if ( this.isAJAXinProgress ) {
            return;
        }

        this.isAJAXinProgress = true;

        if ( useStateLoading ) {
            this.setState( {
                ajaxStatus: 'progress',
            } );
        }

        const ajaxData = {
            action: 'vp_dynamic_control_callback',
            nonce: VPGutenbergVariables.nonce,
            vp_control_name: controlName,
            vp_attributes: attributes,
            ...additionalData,
        };

        $.ajax( {
            url: ajaxurl,
            method: 'POST',
            dataType: 'json',
            data: ajaxData,
            complete: ( data ) => {
                const json = data.responseJSON;

                if ( callback && json.response ) {
                    if ( json.response.options ) {
                        cachedOptions[ controlName ] = {
                            ...cachedOptions[ controlName ],
                            ...json.response.options,
                        };
                    }

                    callback( json.response );
                }

                if ( useStateLoading ) {
                    this.setState( {
                        ajaxStatus: true,
                    } );
                }

                this.isAJAXinProgress = false;
            },
        } );
    }

    render() {
        const {
            value,
            onChange,
        } = this.props;

        const {
            options,
            ajaxStatus,
        } = this.state;

        const isLoading = ajaxStatus && 'progress' === ajaxStatus;

        if ( isLoading ) {
            return (
                <div className="vpf-component-icon-selector">
                    <Spinner />
                </div>
            );
        }

        return (
            <div className="vpf-component-icon-selector">
                { Object.keys( options || {} ).map( ( k ) => {
                    const option = options[ k ];

                    return (
                        <Button
                            key={ `icon-selector-${ option.title }-${ option.value }` }
                            onClick={ () => onChange( option.value ) }
                            className={ classnames(
                                'vpf-component-icon-selector-item',
                                value === option.value ? 'vpf-component-icon-selector-item-active' : '',
                                option.className
                            ) }
                        >
                            { option.icon ? (
                                <RawHTML>{ option.icon }</RawHTML>
                            ) : '' }
                            { option.title ? (
                                <span>{ option.title }</span>
                            ) : '' }
                        </Button>
                    );
                } ) }
            </div>
        );
    }
}
