import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

// Width of the page a layout is rendered on, so a gallery takes its desktop
// columns however small its preview is drawn. Core previews patterns at the
// same width.
const VIEWPORT_WIDTH = 1200;

// Below this width a preview is a thumbnail of a table or list row, where the
// schematic reads better than a gallery a few pixels wide.
const MIN_LIVE_WIDTH = 120;

// Relative heights of masonry tiles and widths of justified ones, so a
// preview shows the shape of its layout without any images.
const MASONRY = [1.35, 0.8, 1.1, 0.75, 1.25, 0.95, 1.15, 0.7, 1.05];
const JUSTIFIED = [1.6, 1, 1.3, 0.9, 1.5, 1.1, 0.8, 1.4];

/**
 * Tiles of a layout preview.
 *
 * @param {number}   count  - number of tiles.
 * @param {Function} styles - style of a tile, by index.
 * @return {Element[]} tiles.
 */
function tiles(count, styles = () => undefined) {
	return Array.from({ length: count }, (_, index) => (
		<span
			key={index}
			className="vpf-library-preview__tile"
			style={styles(index)}
		/>
	));
}

/**
 * Schematic of a layout drawn from its settings: the arrangement of the
 * gallery, not its pictures.
 *
 * @param {Object} props         - component props.
 * @param {Object} props.preview - `{ type, columns }` of the layout.
 * @return {Element} component.
 */
function LayoutSchematic({ preview }) {
	const type = preview?.type || 'grid';
	const columns = Math.min(
		Math.max(parseInt(preview?.columns, 10) || 3, 1),
		6
	);

	let content;

	switch (type) {
		case 'masonry':
			content = (
				<div
					className="vpf-library-preview__masonry"
					style={{ columnCount: columns }}
				>
					{tiles(columns * 3, (index) => ({
						aspectRatio: `1 / ${MASONRY[index % MASONRY.length]}`,
					}))}
				</div>
			);
			break;
		case 'justified':
			content = (
				<div className="vpf-library-preview__justified">
					{tiles(8, (index) => ({
						flex: `${JUSTIFIED[index]} 1 ${JUSTIFIED[index] * 22}%`,
					}))}
				</div>
			);
			break;
		case 'tiles':
			content = (
				<div className="vpf-library-preview__tiles">{tiles(6)}</div>
			);
			break;
		case 'carousel':
		case 'slider':
			content = (
				<div className="vpf-library-preview__carousel">{tiles(3)}</div>
			);
			break;
		default:
			content = (
				<div
					className="vpf-library-preview__grid"
					style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
				>
					{tiles(columns * 2)}
				</div>
			);
	}

	return <div className="vpf-library-preview__schematic">{content}</div>;
}

/**
 * Width of an element, followed as it resizes.
 *
 * @return {Array} `[ ref, width ]`.
 */
function useWidth() {
	const ref = useRef(null);
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const element = ref.current;

		if (!element) {
			return;
		}

		const observer = new window.ResizeObserver(([entry]) =>
			setWidth(entry.contentRect.width)
		);

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	return [ref, width];
}

/**
 * Preview of a layout: the gallery as a page renders it, scaled to the
 * preview, over its schematic until it loads. A layout that shows no items
 * keeps the schematic.
 *
 * @param {Object} props      - component props.
 * @param {Object} props.item - layout record.
 * @return {Element} component.
 */
export default function LayoutPreview({ item }) {
	const layout = item.vpf_layout;
	const [ref, width] = useWidth();
	const frame = useRef(null);
	const [state, setState] = useState('loading');
	const [height, setHeight] = useState(VIEWPORT_WIDTH);
	const url = layout?.previewUrl;
	const isLive = !!url && width >= MIN_LIVE_WIDTH;
	const scale = width / VIEWPORT_WIDTH;

	// A gallery shorter than the preview sits in its middle, as core
	// centres a short pattern.
	const offset = Math.max(0, (width - height * scale) / 2);

	useEffect(() => {
		setState('loading');
	}, [url]);

	useEffect(() => {
		if (!isLive) {
			return;
		}

		const onMessage = (event) => {
			if (
				event.source === frame.current?.contentWindow &&
				'vpf-layout-preview' === event.data?.type
			) {
				setState(event.data.empty ? 'empty' : 'ready');
				setHeight(event.data.height || VIEWPORT_WIDTH);
			}
		};

		window.addEventListener('message', onMessage);

		return () => window.removeEventListener('message', onMessage);
	}, [isLive]);

	return (
		<div
			ref={ref}
			className={`vpf-library-preview is-${isLive ? state : 'schematic'}`}
			aria-hidden="true"
		>
			<LayoutSchematic preview={layout?.preview} />
			{isLive && 'empty' !== state && (
				<iframe
					ref={frame}
					className="vpf-library-preview__frame"
					src={url}
					title={sprintf(
						// translators: %s - layout name.
						__('Preview of %s', 'visual-portfolio'),
						item.title?.raw || item.title?.rendered || ''
					)}
					loading="lazy"
					tabIndex={-1}
					style={{
						width: VIEWPORT_WIDTH,
						height: VIEWPORT_WIDTH,
						transform: `translateY(${offset}px) scale(${scale})`,
					}}
				/>
			)}
		</div>
	);
}
