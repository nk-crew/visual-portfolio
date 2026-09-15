/**
 * WordPress dependencies
 */
import { isBlobURL } from '@wordpress/blob';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useRegistry, useSelect } from '@wordpress/data';
import { useCallback, useMemo, useRef } from '@wordpress/element';
/**
 * Internal dependencies
 */
import { prepareImage } from '../../loop-sources/gallery-manager/prepare-images';

/**
 * Whether two ids name the same attachment.
 *
 * A gallery written by hand, or shipped inside a pattern, may hold its ids as
 * strings; the endpoint always answers with numbers.
 *
 * @param {number|string} a - attachment id.
 * @param {number|string} b - attachment id.
 * @return {boolean} whether they are the same.
 */
function isSameImage(a, b) {
	return Number(a) === Number(b);
}

/**
 * The attachment an item image can be edited as, if any.
 *
 * The toolbar can crop and replace the image of an item of the Media source
 * and of no other: those images are a list the loop block carries, and the
 * item is one entry of it. A post's featured image belongs to the post, and
 * the remote images of the Pro social sources to nobody here.
 *
 * @param {string}        queryType - `vp/queryType` of the loop.
 * @param {number|string} imgId     - `vp/itemImgId` of the item.
 * @return {number|undefined} attachment id, or nothing to edit.
 */
export function getGalleryImageId(queryType, imgId) {
	const id = Number(imgId);

	return 'images' === queryType && Number.isInteger(id) && id > 0
		? id
		: undefined;
}

/**
 * The tools the toolbar has for the gallery entry an item stands for.
 *
 * The images of the Media source live in `imagesQuery.images` of the loop
 * block, so every change is written there, and reaches the item the way any
 * change of the loop does: the template asks the endpoint for its items again.
 *
 * @param {string} clientId - client id of the item block.
 * @param {number} imgId    - attachment the item shows, see `getGalleryImageId()`.
 * @return {Object} `replaceImage( media )`, `cropImage( { id } )` and
 *                  `isPending` - whether the item still shows what the last
 *                  change moved it away from.
 */
export function useGalleryImage(clientId, imgId) {
	const registry = useRegistry();

	// Whether the gallery still holds the attachment the item shows. After a
	// change it does not, until the endpoint answers and the item catches up
	// - and a second change made meanwhile would look for an entry that is
	// no longer there. Read off the loop rather than remembered here: the
	// item is mounted anew once it answers to a new id, and the snackbar's
	// Undo of a crop runs in the block instance that applied it.
	const isPending = useSelect(
		(select) => {
			if (!imgId) {
				return false;
			}

			const { getBlockParentsByBlockName, getBlockAttributes } =
				select(blockEditorStore);
			const [loopClientId] = getBlockParentsByBlockName(
				clientId,
				'visual-portfolio/loop',
				true
			);
			const images = loopClientId
				? getBlockAttributes(loopClientId)?.imagesQuery?.images || []
				: [];

			return !images.some((image) => isSameImage(image.id, imgId));
		},
		[clientId, imgId]
	);

	// The last crop: the entry as it was, and the attachment it moved to. The
	// snackbar the cropper shows offers to undo it, by handing the original
	// attachment back - by which time the entry answers to the new id.
	const lastCrop = useRef();

	// Rewrites the entry of attachment `fromId` with what `edit( entry )`
	// returns, and answers with the entry as it was.
	const editImage = useCallback(
		(fromId, edit) => {
			const { getBlockParentsByBlockName, getBlockAttributes } =
				registry.select(blockEditorStore);
			const [loopClientId] = getBlockParentsByBlockName(
				clientId,
				'visual-portfolio/loop',
				true
			);

			if (!loopClientId) {
				return undefined;
			}

			const { imagesQuery } = getBlockAttributes(loopClientId);
			const images = imagesQuery?.images || [];
			const index = images.findIndex((image) =>
				isSameImage(image.id, fromId)
			);

			if (-1 === index) {
				return undefined;
			}

			const entry = images[index];
			const next = edit(entry);

			registry
				.dispatch(blockEditorStore)
				.updateBlockAttributes(loopClientId, {
					imagesQuery: {
						...imagesQuery,
						images: images.map((image, current) =>
							current === index ? next : image
						),
					},
				});

			return entry;
		},
		[registry, clientId]
	);

	// The same replacement the gallery manager makes from its drawer: the
	// media file and what the library knows of it, over an entry that keeps
	// everything else typed into it.
	const replaceImage = useCallback(
		(media) => {
			// An upload answers twice: with a preview of the file before it
			// is sent, and with the attachment once it is. Only the second
			// is anything the gallery can hold.
			if (!media?.id || isBlobURL(media.url)) {
				return;
			}

			editImage(imgId, (entry) => ({ ...entry, ...prepareImage(media) }));
		},
		[editImage, imgId]
	);

	// A crop is saved as a new attachment, the way the core Image block saves
	// one, and the entry moves over to it. The URLs the entry carried are of
	// the file it left; without them the gallery manager resolves the
	// thumbnail from the id, as it does for a gallery a pattern shipped.
	const cropImage = useCallback(
		({ id }) => {
			const undone = lastCrop.current;

			if (undone && isSameImage(id, undone.entry.id)) {
				editImage(undone.to, () => undone.entry);
				lastCrop.current = undefined;
				return;
			}

			const entry = editImage(imgId, (current) => {
				const { imgUrl, imgThumbnailUrl, ...rest } = current;

				return { ...rest, id };
			});

			lastCrop.current = entry ? { entry, to: id } : undefined;
		},
		[editImage, imgId]
	);

	return useMemo(
		() => ({ replaceImage, cropImage, isPending }),
		[replaceImage, cropImage, isPending]
	);
}
