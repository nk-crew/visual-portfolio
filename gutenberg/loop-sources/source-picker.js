import { Button } from '@wordpress/components';
import { applyFilters } from '@wordpress/hooks';
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
	/**
	 * Filters the sources a loop may be switched to, such as images alone in
	 * a post type that only works with them. Registered sources stay
	 * registered: a loop saved with another one keeps it.
	 *
	 * @param {Array}  sources - registered sources.
	 * @param {Object} args    - `{ value }`, the loop's current source.
	 */
	const sources = applyFilters('vpf.loopSources', useLoopSources(), {
		value,
	});

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
