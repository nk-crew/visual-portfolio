/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import metadata from './block.json';

export default function CarouselPreviousEdit({
	attributes,
	setAttributes,
	context,
}) {
	const { isHidden } = attributes;

	useLoopOrphanWarning(metadata.name, context);

	// The same button the render callback prints, minus the one thing a
	// preview has no answer for: on the page the arrow is switched off at the
	// end it has run out of, and an editor has no scroll position to run out.
	const blockProps = useBlockProps({
		className: blockClassName('vp-block-loop-carousel-previous', isHidden),
	});

	return (
		<>
			<VisibilityToolbar
				isHidden={isHidden}
				setAttributes={setAttributes}
			/>
			<button
				type="button"
				aria-label={__('Previous slide', 'visual-portfolio')}
				onClick={(event) => event.preventDefault()}
				{...blockProps}
			>
				<span aria-hidden="true" />
			</button>
		</>
	);
}
