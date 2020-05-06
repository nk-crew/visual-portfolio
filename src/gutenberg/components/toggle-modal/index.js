/**
 * WordPress dependencies
 */
const {
    Component,
    Fragment,
} = wp.element;

const {
    Button,
    Modal,
} = wp.components;

/**
 * Component Class
 */
export default class ToggleModal extends Component {
    constructor( ...args ) {
        super( ...args );

        this.state = {
            isOpened: false,
        };
    }

    render() {
        const {
            children,
            modalTitle,
            buttonLabel,
        } = this.props;

        const {
            isOpened,
        } = this.state;

        return (
            <Fragment>
                <Button
                    isSecondary
                    onClick={ () => this.setState( { isOpened: ! isOpened } ) }
                >
                    { buttonLabel }
                </Button>
                { isOpened ? (
                    <Modal
                        title={ modalTitle }
                        onRequestClose={ () => this.setState( { isOpened: ! isOpened } ) }
                    >
                        { children }
                    </Modal>
                ) : '' }
            </Fragment>
        );
    }
}
