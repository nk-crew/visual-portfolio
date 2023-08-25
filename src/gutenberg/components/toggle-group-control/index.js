/**
 * WordPress dependencies
 */
const { Fragment, useState } = wp.element;

const {
	ToggleGroupControl: __stableToggleGroupControl,
	ToggleGroupControlOption: __stableToggleGroupControlOption,
	__experimentalToggleGroupControl,
	__experimentalToggleGroupControlOption,
} = wp.components;

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
