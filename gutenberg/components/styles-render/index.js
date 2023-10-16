import { useEffect } from '@wordpress/element';

/**
 * Render dynamic styles for editor.
 *
 * @param  root0
 * @param  root0.children
 * @return {null} nothing.
 */
export default function StylesRender({ children }) {
	useEffect(() => {
		const node = document.createElement('style');
		node.innerHTML = children;
		document.body.appendChild(node);

		return () => document.body.removeChild(node);
	}, [children]);

	return null;
}
