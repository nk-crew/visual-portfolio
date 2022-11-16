/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * WordPress dependencies
 */
const { Notice } = wp.components;

/**
 * Component Class
 */
export default function NoticeComponent(props) {
  const { className, ...allProps } = props;

  return <Notice className={classnames('vpf-component-notice', className)} {...allProps} />;
}
