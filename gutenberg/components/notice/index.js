/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * WordPress dependencies
 */
import { Notice } from '@wordpress/components';

/**
 * Component Class
 *
 * @param props
 */
export default function NoticeComponent(props) {
	const { className, ...allProps } = props;

	return (
		<Notice
			className={classnames('vpf-component-notice', className)}
			{...allProps}
		/>
	);
}
