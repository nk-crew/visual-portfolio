import './style.scss';

import { TabPanel } from '@wordpress/components';
import { Component, RawHTML } from '@wordpress/element';

/**
 * Component Class
 */
export default class TabsControl extends Component {
	render() {
		const { onChange, children, options } = this.props;

		return (
			<TabPanel
				className="vpf-component-tabs-control"
				onSelect={onChange}
				tabs={options.map((item) => {
					return {
						name: item.category,
						title: item.title,
						icon: item.icon ? <RawHTML>{item.icon}</RawHTML> : null,
					};
				})}
			>
				{children}
			</TabPanel>
		);
	}
}
