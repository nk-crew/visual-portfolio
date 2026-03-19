import { Button } from '@wordpress/components';
import { useState } from '@wordpress/element';

export default function CollapsibleSection( {
	label,
	children,
	className = '',
	defaultExpanded = false,
} ) {
	const [ isExpanded, setIsExpanded ] = useState( defaultExpanded );

	return (
		<div
			className={ `vpf-component-gallery-control-collapsible-section ${ className }`.trim() }
		>
			<Button
				className="vpf-component-gallery-control-collapsible-section-toggle"
				onClick={ () => {
					setIsExpanded( ! isExpanded );
				} }
				aria-expanded={ isExpanded }
			>
				{ label }
				<svg
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					className="components-panel__arrow"
					aria-hidden="true"
					focusable="false"
				>
					<path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" />
				</svg>
			</Button>
			{ isExpanded ? (
				<div className="vpf-component-gallery-control-collapsible-section-content">
					{ children }
				</div>
			) : null }
		</div>
	);
}
