import classnames from 'classnames/dedupe';
import { debounce } from 'throttle-debounce';

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

const { ResizeObserver, MutationObserver } = window;

function stepsWizard(props) {
	const { step, children } = props;

	const $ref = useRef();
	const [newStep, setNewStep] = useState(step);
	const [height, setHeight] = useState(0);

	const maybeUpdateHeight = useCallback(() => {
		let newHeight = 0;

		$ref.current.childNodes.forEach(($child) => {
			const styles = window.getComputedStyle($child);
			const margin =
				parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);

			newHeight += Math.ceil($child.offsetHeight + margin);
		});

		setHeight(`${newHeight}px`);
	}, [$ref]);

	useEffect(() => {
		if (step !== newStep) {
			setNewStep(step);
		}
	}, [step, newStep]);

	useEffect(() => {
		maybeUpdateHeight();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newStep]);

	useEffect(() => {
		const $element = $ref.current;

		const calculateHeight = debounce(100, () => {
			maybeUpdateHeight();
		});

		// Resize observer is used to properly set height
		// when selected images, saved post and reloaded page.
		const resizeObserver = new ResizeObserver(calculateHeight);
		const mutationObserver = new MutationObserver(calculateHeight);

		resizeObserver.observe($element);
		mutationObserver.observe($element, {
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true,
			attributeOldValue: true,
			characterDataOldValue: true,
		});

		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [$ref.current]);

	return typeof children[newStep] !== 'undefined' ? (
		<div
			ref={$ref}
			className={classnames(
				'vpf-component-steps-wizard',
				step !== newStep
					? `vpf-component-steps-wizard-animate-${
							newStep > step ? 'left' : 'right'
					  }`
					: false
			)}
			style={height ? { height } : {}}
		>
			{children[newStep]}
		</div>
	) : null;
}

stepsWizard.Step = function (props) {
	const { children } = props;
	return children;
};

export default stepsWizard;
