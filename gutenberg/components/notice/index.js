import './style.scss';

import { Notice } from '@wordpress/components';
import classnames from 'classnames/dedupe';

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
