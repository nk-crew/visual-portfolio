import './items-count-all.scss';

import classnames from 'classnames/dedupe';
import { debounce } from 'throttle-debounce';

import apiFetch from '@wordpress/api-fetch';
import { BaseControl, Button, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { RawHTML, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';

import Notice from '../components/notice';
import { ToggleGroupButtonsControl } from '../components/toggle-group-control';
import controlGetValue from '../utils/control-get-value';

const { VPGutenbergVariables } = window;

const NOTICE_LIMIT = parseInt(
	VPGutenbergVariables.items_count_notice_limit,
	10
);
const DISPLAY_NOTICE_AFTER = NOTICE_LIMIT + 5;

const ITEMS_COUNT_MODE_CUSTOM = 'custom';
const ITEMS_COUNT_MODE_ALL = 'all';

function getNoticeState() {
	return VPGutenbergVariables.items_count_notice;
}

const maybeUpdateNoticeStateMeta = debounce( 3000, ( postId ) => {
	apiFetch( {
		path: '/visual-portfolio/v1/update_gallery_items_count_notice_state',
		method: 'POST',
		data: {
			notice_state: getNoticeState(),
			post_id: postId,
		},
	} );
} );

function updateNoticeState( postId ) {
	const newState = getNoticeState() === 'hide' ? 'show' : 'hide';

	VPGutenbergVariables.items_count_notice = newState;

	maybeUpdateNoticeStateMeta( postId );
}

function CountNotice( props ) {
	const { onToggle, postId } = props;

	return (
		<Notice status="warning" isDismissible={ false }>
			<p
				dangerouslySetInnerHTML={ {
					__html: __(
						'Using large galleries may <u>decrease page loading speed</u>. We recommend you add these improvements:',
						'visual-portfolio'
					),
				} }
			/>
			<ol className="ol-decimal">
				<li
					dangerouslySetInnerHTML={ {
						__html: sprintf(
							__(
								'Set the items per page to <u>less than %d</u>',
								'visual-portfolio'
							),
							NOTICE_LIMIT
						),
					} }
				/>
				<li
					dangerouslySetInnerHTML={ {
						__html: __(
							'Add <em>`Load More`</em> or <em>`Infinite Scroll`</em> pagination for best results.',
							'visual-portfolio'
						),
					} }
				/>
			</ol>
			<p>
				<Button
					isLink
					onClick={ () => {
						updateNoticeState( postId );
						onToggle();
					} }
				>
					{ __( 'Ok, I understand', 'visual-portfolio' ) }
				</Button>
			</p>
		</Notice>
	);
}

function shouldDisplayNotice( count, attributes ) {
	let display = false;

	// When selected images number is lower, then needed, don't display notice, even is count is large.
	if ( attributes.content_source === 'images' ) {
		display =
			attributes?.images?.length > DISPLAY_NOTICE_AFTER &&
			( count > DISPLAY_NOTICE_AFTER || count === -1 );
	} else {
		display = count > DISPLAY_NOTICE_AFTER || count === -1;
	}

	return display;
}

function ItemsCountControl( { data } ) {
	const { description, attributes, onChange } = data;

	const [ maybeReRender, setMaybeReRender ] = useState( 1 );
	const [ toggleGroupMountKey, setToggleGroupMountKey ] = useState( 0 );

	const { postId } = useSelect(
		( select ) => ( {
			postId: select( 'core/editor' )?.getCurrentPostId() || false,
		} ),
		[]
	);

	const renderControlHelp = description ? (
		<RawHTML>{ description }</RawHTML>
	) : (
		false
	);
	const renderControlClassName = classnames(
		'vpf-control-wrap',
		`vpf-control-wrap-${ data.type }`
	);
	const controlVal = parseInt( controlGetValue( data.name, attributes ), 10 );
	const itemsCountMode =
		controlVal === -1 ? ITEMS_COUNT_MODE_ALL : ITEMS_COUNT_MODE_CUSTOM;

	return (
		<BaseControl
			id="vpf-control-items-count-all"
			label={
				<span className="vpf-items-count-all-label">
					<span className="vpf-items-count-all-label__text">
						{ data.label }
					</span>
					{ getNoticeState() === 'hide' &&
					shouldDisplayNotice( controlVal, attributes ) ? (
						<Button
							className="vpf-items-count-all-label__notice"
							onClick={ () => {
								updateNoticeState( postId );
								setMaybeReRender( maybeReRender + 1 );
							} }
							aria-label={ __(
								'Show gallery size notice',
								'visual-portfolio'
							) }
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="12" cy="12" r="10" fill="none" />
								<path d="M12 16v-4" />
								<path d="M12 8h.01" />
							</svg>
						</Button>
					) : null }
				</span>
			}
			help={ renderControlHelp }
			className={ renderControlClassName }
			__nextHasNoMarginBottom
		>
			<div>
				<ToggleGroupButtonsControl
					key={ `items-count-toggle-${ toggleGroupMountKey }` }
					label={ __( 'Items count mode', 'visual-portfolio' ) }
					hideLabelFromVision
					value={ itemsCountMode }
					options={ {
						[ ITEMS_COUNT_MODE_CUSTOM ]: __(
							'Custom Count',
							'visual-portfolio'
						),
						[ ITEMS_COUNT_MODE_ALL ]: __(
							'All Items',
							'visual-portfolio'
						),
					} }
					onChange={ ( next ) => {
						if ( next === ITEMS_COUNT_MODE_ALL ) {
							if (
								controlVal !== -1 &&
								// eslint-disable-next-line no-alert
								! window.confirm(
									__(
										'Be careful, the output of all your items can adversely affect the performance of your site, this option may be helpful for image galleries.',
										'visual-portfolio'
									)
								)
							) {
								setToggleGroupMountKey( ( key ) => key + 1 );
								return;
							}
							onChange( -1 );
						} else if ( next === ITEMS_COUNT_MODE_CUSTOM ) {
							if ( controlVal === -1 ) {
								onChange( parseFloat( data.default || 6 ) );
							}
						}
					} }
				/>
			</div>
			{ controlVal !== -1 ? (
				<>
					<br />
					<TextControl
						type="number"
						min={ data.min }
						max={ data.max }
						step={ data.step }
						value={ controlVal }
						onChange={ ( val ) => onChange( parseFloat( val ) ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</>
			) : null }
			{ getNoticeState() === 'show' &&
			shouldDisplayNotice( controlVal, attributes ) ? (
				<div>
					<CountNotice
						postId={ postId }
						onToggle={ () => {
							setMaybeReRender( maybeReRender + 1 );
						} }
					/>
				</div>
			) : null }
		</BaseControl>
	);
}

// Items count with "All Items" button.
addFilter(
	'vpf.editor.controls-render',
	'vpf/editor/controls-render/customize-controls',
	( render, data ) => {
		if ( data.name !== 'items_count' ) {
			return render;
		}

		return (
			<ItemsCountControl
				// we should use key prop, since `vpf.editor.controls-render` will use the result in array.
				key={ `control-${ data.name }-${ data.label }` }
				data={ data }
			/>
		);
	}
);
