/**
 * WordPress dependencies
 */
import {
	BlockControls,
	BlockSettingsMenuControls,
} from '@wordpress/block-editor';
import { MenuItem, ToolbarButton } from '@wordpress/components';
import { __, isRTL } from '@wordpress/i18n';
import { chevronLeft, chevronRight } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { getItemKey } from '../item-template/arrange-items';
import { useGalleryOrder } from './gallery-image';

/**
 * Move and remove controls for the gallery entry an item stands for.
 *
 * @param {Object} props          - component props.
 * @param {string} props.clientId - client id of the item block.
 * @param {Object} props.context  - block context of the item.
 * @return {Element|null} component.
 */
export default function GalleryOrderControls({ clientId, context }) {
	const itemKey =
		'images' === context['vp/queryType']
			? getItemKey(context, true)
			: undefined;
	const order = useGalleryOrder(clientId, itemKey);

	if (!order) {
		return null;
	}

	const { canMove, isFirst, isLast, moveBy, remove } = order;

	const earlier = isRTL()
		? { icon: chevronRight, label: __('Move right', 'visual-portfolio') }
		: { icon: chevronLeft, label: __('Move left', 'visual-portfolio') };
	const later = isRTL()
		? { icon: chevronLeft, label: __('Move left', 'visual-portfolio') }
		: { icon: chevronRight, label: __('Move right', 'visual-portfolio') };

	return (
		<>
			{canMove && (
				<BlockControls group="parent">
					<ToolbarButton
						{...earlier}
						onClick={() => moveBy(-1)}
						disabled={isFirst}
						accessibleWhenDisabled
					/>
					<ToolbarButton
						{...later}
						onClick={() => moveBy(1)}
						disabled={isLast}
						accessibleWhenDisabled
					/>
				</BlockControls>
			)}
			<BlockSettingsMenuControls>
				{({ selectedClientIds, onClose }) =>
					1 === selectedClientIds?.length &&
					clientId === selectedClientIds[0] && (
						<MenuItem
							onClick={() => {
								remove();
								onClose();
							}}
						>
							{__('Remove from gallery', 'visual-portfolio')}
						</MenuItem>
					)
				}
			</BlockSettingsMenuControls>
		</>
	);
}
