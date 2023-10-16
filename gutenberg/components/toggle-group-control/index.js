import './style.scss';

import {
	__experimentalToggleGroupControl,
	__experimentalToggleGroupControlOption,
	ToggleGroupControl as __stableToggleGroupControl,
	ToggleGroupControlOption as __stableToggleGroupControlOption,
} from '@wordpress/components';
import { Fragment, useState } from '@wordpress/element';

const ToggleGroupControl =
	__stableToggleGroupControl || __experimentalToggleGroupControl;
const ToggleGroupControlOption =
	__stableToggleGroupControlOption || __experimentalToggleGroupControlOption;

/**
 * Component Class
 *
 * @param props
 */
export default function ToggleGroupCustomControl(props) {
	const { children, options } = props;

	const [collapsed, setCollapsed] = useState(options[0].category);

	return (
		<div className="vpf-component-toggle-group-control">
			<ToggleGroupControl
				className="vpf-component-toggle-group-control-toggle"
				value={collapsed}
				onChange={(val) => {
					setCollapsed(val);
				}}
				isBlock
			>
				{options.map((option) => {
					return (
						<ToggleGroupControlOption
							key={option.category}
							value={option.category}
							label={option.title}
						/>
					);
				})}
			</ToggleGroupControl>

			{options.map((option) => {
				if (collapsed === option.category) {
					return (
						<Fragment key={option.category}>
							{children(option)}
						</Fragment>
					);
				}

				return null;
			})}
		</div>
	);
}
