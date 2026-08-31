/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { seen, unseen } from '@wordpress/icons';

/**
 * The class an editor block carries while the page will not render it.
 */
export const HIDDEN_CLASS = 'vp-block-is-hidden';

/**
 * The switch a block is taken off the page with.
 *
 * The carousel controls cannot be deleted - `lock.remove` is their default - so
 * hiding is how one is taken off a page, and the switch is on the toolbar
 * rather than in the sidebar: it is the setting these blocks are reached for,
 * and a block a visitor never sees has to be easy to find and bring back.
 *
 * @param {Object}   props               - component props.
 * @param {boolean}  props.isHidden      - whether the page renders the block.
 * @param {Function} props.setAttributes - block attribute setter.
 *
 * @return {Element} component.
 */
export function VisibilityToolbar({ isHidden, setAttributes }) {
	return (
		<BlockControls group="other">
			<ToolbarGroup>
				<ToolbarButton
					icon={isHidden ? unseen : seen}
					isPressed={isHidden}
					label={
						isHidden
							? __('Show on the page', 'visual-portfolio')
							: __('Hide on the page', 'visual-portfolio')
					}
					onClick={() => setAttributes({ isHidden: !isHidden })}
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}

/**
 * The classes an editor block carries, hidden or not.
 *
 * @param {string}  root     - class the front end knows the block by.
 * @param {boolean} isHidden - whether the page renders the block.
 *
 * @return {string} class name.
 */
export function blockClassName(root, isHidden) {
	return isHidden ? `${root} ${HIDDEN_CLASS}` : root;
}
