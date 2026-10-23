import './style.scss';

import { ExternalLink } from '@wordpress/components';
import { __, _n } from '@wordpress/i18n';

import { getProUrl } from '../pro-teaser';

/**
 * The settings Pro adds in a place, for an install without Pro: a row per
 * setting with its name and what it does, and one link to Pro under them.
 *
 * @param {Object} props          - component props.
 * @param {Array}  props.features - `{ label, description }` of the settings;
 *                                the description is optional.
 * @param {string} props.campaign - UTM campaign of the link.
 *
 * @return {Element} component.
 */
export default function ProNote({ features = [], campaign }) {
	return (
		<div className="vpf-pro-features">
			{features.map(({ label, description }) => (
				<div key={label} className="vpf-pro-features__row">
					<div className="vpf-pro-features__name">
						{label}
						<span className="vpf-pro-features__badge">
							{__('Pro', 'visual-portfolio')}
						</span>
					</div>
					{description ? (
						<p className="vpf-pro-features__description">
							{description}
						</p>
					) : null}
				</div>
			))}
			<p className="vpf-pro-features__footer">
				{_n(
					'This comes with Visual Portfolio Pro.',
					'These come with Visual Portfolio Pro.',
					features.length,
					'visual-portfolio'
				)}{' '}
				<ExternalLink href={getProUrl(campaign)}>
					{__('Go Pro', 'visual-portfolio')}
				</ExternalLink>
			</p>
		</div>
	);
}
