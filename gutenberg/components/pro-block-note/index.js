import './style.scss';

import { ExternalLink } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { getProUrl } from '../pro-teaser';

/**
 * A note in the editor canvas, where a block set up in Pro shows nothing on
 * the page: what it is, why the page is empty, and one link to Pro.
 *
 * @param {Object} props          - component props.
 * @param {string} props.title    - what the block is.
 * @param {string} props.children - why the page shows nothing.
 * @param {string} props.campaign - UTM campaign of the link.
 *
 * @return {Element} component.
 */
export default function ProBlockNote({ title, children, campaign }) {
	return (
		<div className="vpf-pro-block-note">
			<div className="vpf-pro-block-note__title">
				<span className="vpf-pro-block-note__badge">
					{__('Pro', 'visual-portfolio')}
				</span>
				{title}
			</div>
			<p className="vpf-pro-block-note__text">
				{children}{' '}
				<ExternalLink href={getProUrl(campaign)}>
					{__('Go Pro', 'visual-portfolio')}
				</ExternalLink>
			</p>
		</div>
	);
}
