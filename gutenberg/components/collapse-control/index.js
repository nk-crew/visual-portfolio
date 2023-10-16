import './style.scss';

import classnames from 'classnames/dedupe';

import { Button } from '@wordpress/components';
import { Fragment, useState } from '@wordpress/element';

/**
 * Component Class
 *
 * @param props
 */
export default function CollapseControl(props) {
	const { children, options, initialOpen } = props;

	const [collapsed, setCollapsed] = useState(initialOpen);

	return (
		<div className="vpf-component-collapse-control">
			{options.map((option) => {
				return (
					<Fragment key={option.category}>
						<Button
							onClick={() => {
								setCollapsed(
									option.category === collapsed
										? ''
										: option.category
								);
							}}
							className={classnames(
								'vpf-component-collapse-control-toggle',
								option.category === collapsed
									? 'vpf-component-collapse-control-active'
									: ''
							)}
						>
							<span>{option.title}</span>
							<svg
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								className="components-panel__arrow"
								aria-hidden="true"
								focusable="false"
							>
								<path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" />
							</svg>
						</Button>
						<div
							className={classnames(
								'vpf-component-collapse-control-content',
								option.category === collapsed
									? 'vpf-component-collapse-control-content-active'
									: ''
							)}
						>
							{children(option)}
						</div>
					</Fragment>
				);
			})}
		</div>
	);
}
