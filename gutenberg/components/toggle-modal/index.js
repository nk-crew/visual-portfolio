import './style.scss';

import classnames from 'classnames/dedupe';

import { Button, Modal } from '@wordpress/components';
import { Component } from '@wordpress/element';

/**
 * Component Class
 */
export default class ToggleModal extends Component {
	constructor(...args) {
		super(...args);

		this.state = {
			isOpened: false,
		};
	}

	render() {
		const { children, modalTitle, buttonLabel, size } = this.props;

		const { isOpened } = this.state;

		return (
			<>
				<Button
					isSecondary
					onClick={() => this.setState({ isOpened: !isOpened })}
				>
					{buttonLabel}
				</Button>
				{isOpened ? (
					<Modal
						title={modalTitle}
						onRequestClose={() =>
							this.setState({ isOpened: !isOpened })
						}
						className={classnames(
							'vpf-component-modal',
							size ? `vpf-component-modal-size-${size}` : ''
						)}
					>
						{children}
					</Modal>
				) : (
					''
				)}
			</>
		);
	}
}
