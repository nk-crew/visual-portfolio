import { Button, DatePicker, Dropdown } from '@wordpress/components';
import {
	__experimentalGetSettings as getSettings,
	dateI18n,
} from '@wordpress/date';
import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Component Class
 */
export default class VPDatePicker extends Component {
	render() {
		const { value, onChange } = this.props;

		const settings = getSettings();
		const resolvedFormat = settings.formats.datetime || 'F j, Y';

		return (
			<Dropdown
				renderToggle={({ onToggle }) => (
					<Button isSecondary isSmall onClick={onToggle}>
						{value
							? dateI18n(resolvedFormat, value)
							: __('Select Date', 'visual-portfolio')}
					</Button>
				)}
				renderContent={() => (
					<div className="components-datetime vpf-component-date-picker">
						<DatePicker currentDate={value} onChange={onChange} />
						{value ? (
							<Button
								isSecondary
								isSmall
								onClick={() => {
									onChange('');
								}}
							>
								{__('Reset Date', 'visual-portfolio')}
							</Button>
						) : (
							''
						)}
					</div>
				)}
			/>
		);
	}
}
