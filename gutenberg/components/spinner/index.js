import './style.scss';

import { Spinner } from '@wordpress/components';
import { Component } from '@wordpress/element';

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
