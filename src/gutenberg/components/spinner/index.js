/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';

import { Spinner } from '@wordpress/components';

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
