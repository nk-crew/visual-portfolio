/**
 * WordPress dependencies
 */
const { Component } = wp.element;

const { __ } = wp.i18n;

const {
    __experimentalGetSettings: getSettings,
    dateI18n,
} = wp.date;

const {
    Dropdown,
    Button,
    DatePicker,
} = wp.components;

/**
 * Component Class
 */
export default class VPDatePicker extends Component {
    render() {
        const {
            value,
            onChange,
        } = this.props;

        const settings = getSettings();
        const resolvedFormat = settings.formats.datetime || 'F j, Y';

        return (
            <Dropdown
                renderToggle={ ( { onToggle } ) => (
                    <Button
                        isSecondary
                        isSmall
                        onClick={ onToggle }
                    >
                        { value ? dateI18n( resolvedFormat, value ) : __( 'Select Date', '@@text_domain' ) }
                    </Button>
                ) }
                renderContent={ () => (
                    <div className="components-datetime vpf-component-date-picker">
                        <DatePicker
                            currentDate={ value }
                            onChange={ onChange }
                        />
                        { value ? (
                            <Button
                                isSecondary
                                isSmall
                                onClick={ () => {
                                    onChange( '' );
                                } }
                            >
                                { __( 'Reset Date', '@@text_domain' ) }
                            </Button>
                        ) : '' }
                    </div>
                ) }
            />
        );
    }
}
