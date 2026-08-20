/**
 * Per-image settings slots of the gallery manager.
 *
 * The slot names are the whole contract. `createSlotFill` pairs by name, so an
 * extension never imports this module:
 *
 * ```js
 * const { Fill } = wp.components.createSlotFill( 'VP.LoopImageSettings' );
 *
 * registerPlugin( 'acme-gallery-image-settings', {
 *     render: () => (
 *         <Fill>
 *             { ( { image, updateImage } ) => (
 *                 <TextControl
 *                     label={ __( 'Picture ID' ) }
 *                     value={ image.pictureId || '' }
 *                     onChange={ ( pictureId ) => updateImage( { pictureId } ) }
 *                 />
 *             ) }
 *         </Fill>
 *     ),
 * } );
 * ```
 *
 * This replaces `vpf_extend_image_controls`: per-image fields no longer have to
 * be declared in the PHP control registry before the editor can draw them.
 *
 * The modal edits one media state at a time, and a fill declares the state it
 * belongs to by the slot it fills - core's `Fill` forwards nothing but its
 * children, so a prop could not carry that declaration:
 *
 * - `VP.LoopImageSettings` - fields of the image itself. They render in the
 *   field grid on the right of the modal, whichever state is selected. A field
 *   that needs both columns of that grid carries the
 *   `vpf-gallery-manager-modal__field-full` class.
 * - `VP.LoopImageSettings.Hover` - fields of the hover state. They render in
 *   the media column on the left, under the Hover tab. A fill here is what
 *   makes the Default/Hover tabs appear at all: with none registered the modal
 *   shows a single state and no tabs.
 *
 * Props of a fill of either slot:
 *
 * - `image` - the image being edited. It is an item of the loop's
 *   `imagesQuery.images`, so whatever a fill writes on it is saved with the
 *   block and reaches PHP untouched (`vpf_image_item_args` reads the same
 *   object). Keys the free plugin owns: `id`, `imgUrl`, `imgThumbnailUrl`,
 *   `title`, `description`, `categories`, `format`, `video_url`, `url`,
 *   `author`, `author_url`, `focalPoint`.
 * - `index` - position of the image in the gallery.
 * - `updateImage( values )` - shallow-merges `values` into that image.
 * - `clientId` - client id of the loop block.
 * - `state` - the state the modal is showing, `default` or `hover`. Hover fills
 *   only ever render under `hover`; a fill of the image slot gets it to follow
 *   the tabs when it wants to.
 */

import {
	__experimentalUseSlotFills,
	useSlotFills as __stableUseSlotFills,
	createSlotFill,
} from '@wordpress/components';

const useSlotFills = __stableUseSlotFills || __experimentalUseSlotFills;

/**
 * @type {string}
 */
export const LOOP_IMAGE_SETTINGS_SLOT = 'VP.LoopImageSettings';

/**
 * @type {string}
 */
export const LOOP_IMAGE_SETTINGS_HOVER_SLOT = 'VP.LoopImageSettings.Hover';

const { Fill, Slot } = createSlotFill(LOOP_IMAGE_SETTINGS_SLOT);
const { Fill: HoverFill, Slot: HoverSlot } = createSlotFill(
	LOOP_IMAGE_SETTINGS_HOVER_SLOT
);

export const LoopImageSettingsFill = Fill;
export const LoopImageSettingsHoverFill = HoverFill;

/**
 * Whether anything at all edits the hover state.
 *
 * Fills register themselves whether or not their slot is mounted, so this is
 * true before the Hover tab it draws has ever been opened.
 *
 * @return {boolean} true when a hover fill is registered.
 */
export function useHasHoverStateFills() {
	return !!useSlotFills(LOOP_IMAGE_SETTINGS_HOVER_SLOT)?.length;
}

/**
 * Where the hover fills land: the media column, under the Hover tab.
 *
 * @param {Object} fillProps - props handed to every fill, see above.
 * @return {Element} component.
 */
export function LoopImageSettingsHoverSlot(fillProps) {
	return <HoverSlot fillProps={fillProps} />;
}

/**
 * Where the image fills land: the end of the field grid.
 *
 * @param {Object} fillProps - props handed to every fill, see above.
 * @return {Element} component.
 */
export default function LoopImageSettingsSlot(fillProps) {
	return <Slot fillProps={fillProps} />;
}
