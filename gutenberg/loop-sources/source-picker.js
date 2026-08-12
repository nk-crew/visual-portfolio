import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import classnames from 'classnames/dedupe';

import { useLoopSources } from './registry';

const { pro: isProPlugin } = window.VPGutenbergVariables;

/**
 * The list of content sources, as cards.
 *
 * Switching is soft on purpose: only `queryType` changes, so the settings of
 * the source left behind are still there when the user switches back.
 *
 * @param {Object}   props          - component props.
 * @param {string}   props.value    - selected source name.
 * @param {Function} props.onChange - called with the picked source name.
 * @return {Element} component.
 */
export default function SourcePicker({ value, onChange }) {
	const sources = useLoopSources();

	return (
		<div className="vpf-loop-source-picker">
			{sources.map(({ name, title, icon, isPro }) => (
				<Button
					key={name}
					className={classnames('vpf-loop-source-picker__item', {
						'is-selected': name === value,
					})}
					isPressed={name === value}
					onClick={() => onChange(name)}
					__next40pxDefaultSize
				>
					<span className="vpf-loop-source-picker__icon">{icon}</span>
					<span className="vpf-loop-source-picker__title">
						{title}
					</span>
					{isPro && !isProPlugin ? (
						<span className="vpf-loop-source-picker__badge">
							{__('Pro', 'visual-portfolio')}
						</span>
					) : null}
				</Button>
			))}
		</div>
	);
}
