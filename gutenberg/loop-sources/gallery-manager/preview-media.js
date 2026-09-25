import { getPath } from '@wordpress/url';

// The extensions `wp_get_video_extensions()` lists, `mov` included.
const VIDEO_EXTENSION = /\.(mp4|m4v|webm|ogv|flv|mov)$/i;

/**
 * The picture of a gallery entry in the manager.
 *
 * A video entry stores the address of the video where an image entry stores
 * its picture, and an `img` shows nothing of it, so a video is drawn as one.
 *
 * @param {Object} props         - component props.
 * @param {string} props.url     - preview URL of the entry.
 * @param {string} props.loading - `loading` of an image.
 * @return {Element} component.
 */
export default function PreviewMedia({ url, loading }) {
	if (VIDEO_EXTENSION.test(getPath(url) || '')) {
		return <video src={url} preload="metadata" muted playsInline />;
	}

	return <img src={url} alt="" loading={loading} />;
}
