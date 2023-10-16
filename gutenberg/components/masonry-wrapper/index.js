import { useEffect, useRef } from '@wordpress/element';

const { Masonry } = window;

export default function MasonryWrapper(props) {
	const { options, children, ...restProps } = props;

	const ref = useRef();

	// Init.
	useEffect(() => {
		const instance = new Masonry(ref.current, options);

		return () => {
			instance.destroy();
		};
	}, [ref, options, children]);

	return (
		<div ref={ref} {...restProps}>
			{children}
		</div>
	);
}
