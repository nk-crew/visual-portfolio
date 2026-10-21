import './style.scss';

import { Spinner } from '@wordpress/components';
import { lazy, Suspense } from '@wordpress/element';

// Ace is the largest part of the editor bundle and only this control uses it,
// so it is fetched as a separate chunk the first time a code control renders.
const AceCodeEditor = lazy(
	() => import(/* webpackChunkName: "gutenberg/code-editor" */ './editor')
);

/**
 * Component
 *
 * @param {Object} props component props.
 */
export default function CodeEditor(props) {
	return (
		<Suspense fallback={<Spinner />}>
			<AceCodeEditor {...props} />
		</Suspense>
	);
}
