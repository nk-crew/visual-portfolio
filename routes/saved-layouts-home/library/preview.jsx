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
export default function LayoutPreview({ preview }) {
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

	return (
		<div className="vpf-library-preview" aria-hidden="true">
			{content}
		</div>
	);
}
