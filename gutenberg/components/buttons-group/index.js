import './style.scss';

/**
 * Lightweight replacement for deprecated wp.components.ButtonGroup.
 *
 * @param {Object} props Component props.
 * @return {JSX.Element} Group wrapper.
 */
export default function ButtonsGroup( props ) {
	const { children, className = '', ...restProps } = props;

	return (
		<div
			className={ `vpf-component-buttons-group ${ className }`.trim() }
			role="group"
			{ ...restProps }
		>
			{ children }
		</div>
	);
}
