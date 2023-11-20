import './style.scss';

import { Component } from '@wordpress/element';

/**
 * Component Class
 */
export default class ProNote extends Component {
	render() {
		const {
			title,
			children,
			contentBefore = '',
			contentAfter = '',
		} = this.props;

		return (
			<div className="vpf-pro-note-wrapper">
				{contentBefore}
				<div className="vpf-pro-note">
					{title ? <h3>{title}</h3> : ''}
					{children ? <div>{children}</div> : ''}
				</div>
				{contentAfter}
			</div>
		);
	}
}

/**
 * Button Component Class
 */
ProNote.Button = class ProNoteButton extends Component {
	render() {
		const { children } = this.props;

		return (
			<a className="vpf-pro-note-button" {...this.props}>
				{children}
			</a>
		);
	}
};
