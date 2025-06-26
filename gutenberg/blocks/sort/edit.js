/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { Disabled } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit() {
	return (
		<div {...useBlockProps({ className: 'vp-block-sort' })}>
			<Disabled>
				<select>
					<option>{__('Default sorting', 'visual-portfolio')}</option>
				</select>
			</Disabled>
		</div>
	);
}
