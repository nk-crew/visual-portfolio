import './style.scss';

import classnames from 'classnames/dedupe';

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
