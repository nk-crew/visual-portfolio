/**
 * WordPress dependencies
 */
const {
    Component,
} = wp.element;

const {
    Spinner,
} = wp.components;

/**
 * Component Class
 */
export default class SpinnerComponent extends Component {
    render() {
        return (
            <div className="vpf-component-spinner">
                <Spinner />
            </div>
        );
    }
}
