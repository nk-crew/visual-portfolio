/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	BlockContextProvider,
	store as blockEditorStore,
	InspectorControls,
	__experimentalUseBlockPreview as useBlockPreview,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	Placeholder,
	RangeControl,
	SelectControl,
	Spinner,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { memo, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const ITEM_CLASS_NAME = 'wp-block-visual-portfolio-item-template__item';

const TEMPLATE = [
	['visual-portfolio/item-image', { aspectRatio: '1', isLink: true }],
	['visual-portfolio/item-title', { textAlign: 'center' }],
];

/**
 * Turn a REST item into the block context of a single gallery item.
 *
 * The endpoint answers with the same map the render callback injects, minus the
 * `vp/` namespace. `imageSizes` is the one addition: the front end resolves the
 * size on the server, the editor has to pick a URL on its own.
 *
 * @param {Object} item - item from the REST response.
 * @return {Object} block context.
 */
function getItemContext(item) {
	const { imageSizes, ...values } = item;
	const context = { 'vp/itemImageSizes': imageSizes || {} };

	Object.keys(values).forEach((key) => {
		context[`vp/${key}`] = values[key];
	});

	return context;
}

/**
 * The one item whose inner blocks are editable.
 */
function ItemTemplateInnerBlocks() {
	const innerBlocksProps = useInnerBlocksProps(
		{ className: ITEM_CLASS_NAME },
		{ template: TEMPLATE, __unstableDisableLayoutClassNames: true }
	);

	return <li {...innerBlocksProps} />;
}

/**
 * A read-only copy of the inner blocks, rendered with the context of its item.
 *
 * @param {Object}   props                         - component props.
 * @param {Array}    props.blocks                  - inner blocks of the template.
 * @param {string}   props.blockContextId          - id of the item this copy shows.
 * @param {Function} props.setActiveBlockContextId - makes this item the editable one.
 * @param {boolean}  props.isHidden                - whether the editable item took its place.
 * @return {Element} component.
 */
function ItemTemplateBlockPreview({
	blocks,
	blockContextId,
	setActiveBlockContextId,
	isHidden,
}) {
	const blockPreviewProps = useBlockPreview({
		blocks,
		props: {
			className: 'wp-block-visual-portfolio-item-template__preview',
		},
	});

	const handleOnClick = () => {
		setActiveBlockContextId(blockContextId);
	};

	return (
		<li
			className={ITEM_CLASS_NAME}
			style={{ display: isHidden ? 'none' : undefined }}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: a button cannot hold the block markup it previews, and the preview is what has to be pressed. */}
			<div
				{...blockPreviewProps}
				tabIndex={0}
				role="button"
				onClick={handleOnClick}
				onKeyPress={handleOnClick}
			/>
		</li>
	);
}

const MemoizedItemTemplateBlockPreview = memo(ItemTemplateBlockPreview);

export default function BlockEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { layoutType, layoutColumns, layoutGap } = attributes;
	const {
		'vp/queryType': queryType,
		'vp/baseQuery': baseQuery,
		'vp/postsQuery': postsQuery,
		'vp/imagesQuery': imagesQuery,
	} = context;

	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [activeBlockContextId, setActiveBlockContextId] = useState();

	// Everything the endpoint needs, and the only thing that should trigger it.
	// Memoised on the attribute identities, so a gallery with hundreds of images
	// is not rebuilt on every render.
	const query = useMemo(
		() => ({
			queryType,
			baseQuery: { perPage: baseQuery?.perPage },
			postsQuery,
			imagesQuery,
		}),
		[queryType, baseQuery?.perPage, postsQuery, imagesQuery]
	);

	// Items are resolved on the server for every source alike - titles, category
	// links, ordering and the Pro sources are all query logic, and duplicating
	// any of it here is what broke the first take on this block.
	useEffect(() => {
		let cancelled = false;

		setIsLoading(true);

		// Settings are usually changed in bursts - only ask once they settle.
		const timeout = setTimeout(() => {
			apiFetch({
				path: '/visual-portfolio/v1/get_loop_items/',
				method: 'POST',
				data: query,
			})
				.then((response) => {
					if (cancelled) {
						return;
					}

					setItems(
						response?.success ? response.response?.items || [] : []
					);
					setIsLoading(false);
				})
				.catch((error) => {
					if (!cancelled) {
						setIsLoading(false);
					}

					// eslint-disable-next-line no-console
					console.error('Error fetching gallery items:', error);
				});
		}, 500);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [query]);

	const blocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId]
	);

	const blockContexts = useMemo(() => items.map(getItemContext), [items]);

	// The selected item can disappear when the query changes, and an id nothing
	// matches would leave the template without an editable item.
	const activeContextId = blockContexts.some(
		(blockContext) => blockContext['vp/itemId'] === activeBlockContextId
	)
		? activeBlockContextId
		: blockContexts[0]?.['vp/itemId'];

	const isEmpty = !isLoading && !blockContexts.length;

	// The layout describes a list of items; the empty state is a single notice
	// and would be laid out into the first column of a grid.
	const blockProps = useBlockProps(
		isEmpty
			? {}
			: {
					className: `vp-layout-${layoutType}`,
					style: {
						'--vp-layout-columns': layoutColumns,
						'--vp-layout-columns-md': Math.min(layoutColumns, 2),
						'--vp-layout-columns-sm': 1,
						'--vp-layout-gap': layoutGap,
					},
				}
	);

	const inspectorControls = (
		<InspectorControls>
			<PanelBody title={__('Layout', 'visual-portfolio')}>
				<SelectControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Type', 'visual-portfolio')}
					value={layoutType}
					options={[
						{
							label: __('Grid', 'visual-portfolio'),
							value: 'grid',
						},
						{
							label: __('Masonry', 'visual-portfolio'),
							value: 'masonry',
						},
					]}
					onChange={(value) => setAttributes({ layoutType: value })}
				/>
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Columns', 'visual-portfolio')}
					value={layoutColumns}
					onChange={(value) =>
						setAttributes({ layoutColumns: value })
					}
					min={1}
					max={6}
				/>
				<UnitControl
					__next40pxDefaultSize
					label={__('Gap', 'visual-portfolio')}
					value={layoutGap}
					onChange={(value) => setAttributes({ layoutGap: value })}
				/>
			</PanelBody>
		</InspectorControls>
	);

	// A gallery that resolves to nothing is a content source problem, and the
	// source lives on the parent block.
	if (isEmpty) {
		return (
			<>
				{inspectorControls}
				<div {...blockProps}>
					<Placeholder
						label={__('Gallery Item Template', 'visual-portfolio')}
						instructions={__(
							'No items found. Check the Content Source settings of the Gallery Loop block.',
							'visual-portfolio'
						)}
					/>
				</div>
			</>
		);
	}

	return (
		<>
			{inspectorControls}
			{isLoading && <Spinner />}
			<ul {...blockProps} aria-busy={isLoading || undefined}>
				{blockContexts.map((blockContext) => {
					const isActive =
						blockContext['vp/itemId'] === activeContextId;

					return (
						<BlockContextProvider
							key={blockContext['vp/itemId']}
							value={blockContext}
						>
							{isActive ? <ItemTemplateInnerBlocks /> : null}

							{/* Kept mounted under the active item as well: it is
							    what the next item reuses when the selection moves. */}
							<MemoizedItemTemplateBlockPreview
								blocks={blocks}
								blockContextId={blockContext['vp/itemId']}
								setActiveBlockContextId={
									setActiveBlockContextId
								}
								isHidden={isActive}
							/>
						</BlockContextProvider>
					);
				})}
			</ul>
		</>
	);
}
