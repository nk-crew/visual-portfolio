import { createSlotFill } from '@wordpress/components';

/**
 * Name of the per-image settings slot of the gallery manager.
 *
 * The name is the whole contract. `createSlotFill` pairs by name, so an
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
 * Fill props:
 *
 * - `image` — the image being edited. It is an item of the loop's
 *   `imagesQuery.images`, so whatever a fill writes on it is saved with the
 *   block and reaches PHP untouched (`vpf_image_item_args` reads the same
 *   object). Keys the free plugin owns: `id`, `imgUrl`, `imgThumbnailUrl`,
 *   `title`, `description`, `categories`, `format`, `video_url`, `url`,
 *   `author`, `author_url`, `focalPoint`.
 * - `index` — position of the image in the gallery.
 * - `updateImage( values )` — shallow-merges `values` into that image.
 * - `clientId` — client id of the loop block.
 *
 * @type {string}
 */
export const LOOP_IMAGE_SETTINGS_SLOT = 'VP.LoopImageSettings';

const { Fill, Slot } = createSlotFill(LOOP_IMAGE_SETTINGS_SLOT);

export const LoopImageSettingsFill = Fill;

/**
 * Where the fills land: the bottom of the per-image drawer.
 *
 * @param {Object} fillProps - props handed to every fill, see above.
 * @return {Element} component.
 */
export default function LoopImageSettingsSlot(fillProps) {
	return <Slot fillProps={fillProps} />;
}
