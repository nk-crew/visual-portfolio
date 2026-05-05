import './style.scss';

import {
	closestCenter,
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import selectStyles from 'gutenberg-react-select-styles';
import $ from 'jquery';
import rafSchd from 'raf-schd';
import { createPortal } from 'react-dom';
import Select, { components } from 'react-select';
import AsyncSelect from 'react-select/async';
import CreatableSelect from 'react-select/creatable';
import { debounce } from 'throttle-debounce';

import {
	Component,
	createContext,
	createRef,
	useContext,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const { Option } = components;

const { ajaxurl, VPGutenbergVariables } = window;

const cachedOptions = {};
const SortableMultiValueContext = createContext( {} );

function noSortTransforms() {
	return null;
}

function getSortableValueId( value ) {
	return `sortable-value-${ String( value ) }`;
}

function DragOverlayChip( { label } ) {
	return (
		<div
			style={ {
				display: 'inline-flex',
				alignItems: 'center',
				padding: '3px 12px',
				borderRadius: 2,
				backgroundColor: 'var(--wp-admin-theme-color, #3858e9)',
				color: '#fff',
				fontSize: '100%',
				lineHeight: 1.5,
				boxShadow: '0 3px 10px rgba(0, 0, 0, 0.18)',
				pointerEvents: 'none',
				whiteSpace: 'nowrap',
			} }
		>
			{ label }
		</div>
	);
}

const SortableMultiValueLabel = function ( props ) {
	const sortableValueContext = useContext( SortableMultiValueContext );

	// Prevent opening the menu when a drag starts from the tag label.
	const onMouseDown = ( e ) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const innerProps = {
		...props.innerProps,
		...sortableValueContext.attributes,
		...sortableValueContext.listeners,
		onMouseDown,
		style: {
			...( props.innerProps?.style || {} ),
			cursor: 'grab',
			touchAction: 'none',
		},
	};

	return (
		<components.MultiValueLabel { ...props } innerProps={ innerProps } />
	);
};

const SortableMultiValue = function ( props ) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable( {
		id: getSortableValueId( props.data.value ),
	} );
	const sortableValueContext = useContext( SortableMultiValueContext );
	const isActive =
		sortableValueContext.activeId ===
		getSortableValueId( props.data.value );
	const isIndicatorBefore =
		sortableValueContext.indicatorId ===
			getSortableValueId( props.data.value ) &&
		sortableValueContext.indicatorPosition === 'before';
	const isIndicatorAfter =
		sortableValueContext.indicatorId ===
			getSortableValueId( props.data.value ) &&
		sortableValueContext.indicatorPosition === 'after';
	const style = {
		...( props.innerProps?.style || {} ),
		transform: CSS.Translate.toString( transform ),
		transition,
		position: 'relative',
		opacity: isActive ? 0.2 : 1,
		zIndex: isDragging ? 2 : 'auto',
	};
	const innerProps = {
		...props.innerProps,
		ref: setNodeRef,
		style,
	};

	return (
		<SortableMultiValueContext.Provider
			value={ {
				attributes,
				listeners,
				activeId: sortableValueContext.activeId,
				indicatorId: sortableValueContext.indicatorId,
				indicatorPosition: sortableValueContext.indicatorPosition,
			} }
		>
			<components.MultiValue { ...props } innerProps={ innerProps }>
				{ isIndicatorBefore ? (
					<span
						aria-hidden="true"
						style={ {
							position: 'absolute',
							left: -3,
							top: 2,
							bottom: 2,
							width: 2,
							backgroundColor:
								'var(--wp-admin-theme-color, #3858e9)',
							borderRadius: 999,
							pointerEvents: 'none',
						} }
					/>
				) : null }
				{ props.children }
				{ isIndicatorAfter ? (
					<span
						aria-hidden="true"
						style={ {
							position: 'absolute',
							right: -3,
							top: 2,
							bottom: 2,
							width: 2,
							backgroundColor:
								'var(--wp-admin-theme-color, #3858e9)',
							borderRadius: 999,
							pointerEvents: 'none',
						} }
					/>
				) : null }
			</components.MultiValue>
		</SortableMultiValueContext.Provider>
	);
};

const SortableSelectWrapper = function ( {
	ComponentTag,
	overlayContainer,
	selectProps,
	onSortEnd,
} ) {
	const sensors = useSensors(
		useSensor( PointerSensor, {
			activationConstraint: {
				distance: 4,
			},
		} )
	);
	const items = ( selectProps.value || [] ).map( ( item ) =>
		getSortableValueId( item.value )
	);
	const [ activeId, setActiveId ] = useState( null );
	const [ indicator, setIndicator ] = useState( null );
	const activeItem = ( selectProps.value || [] ).find(
		( item ) => getSortableValueId( item.value ) === activeId
	);
	const selectComponents = {
		...( selectProps.components || {} ),
	};

	selectComponents.MultiValue = function MultiValueWithContext( props ) {
		return (
			<SortableMultiValueContext.Provider
				value={ {
					activeId,
					indicatorId: indicator?.id || null,
					indicatorPosition: indicator?.position || null,
				} }
			>
				<SortableMultiValue { ...props } />
			</SortableMultiValueContext.Provider>
		);
	};
	const dragOverlay = (
		<DragOverlay style={ { zIndex: 999999 } }>
			{ activeItem ? (
				<DragOverlayChip label={ activeItem.label } />
			) : null }
		</DragOverlay>
	);

	return (
		<DndContext
			sensors={ sensors }
			collisionDetection={ closestCenter }
			onDragStart={ ( event ) => {
				setActiveId( event.active.id );
			} }
			onDragOver={ ( event ) => {
				const { active, over } = event;

				if ( ! over || active.id === over.id ) {
					setIndicator( null );
					return;
				}

				const translatedRect = event.active.rect.current.translated;
				const pointerX = translatedRect
					? translatedRect.left + translatedRect.width / 2
					: over.rect.left + over.rect.width / 2;
				const position =
					pointerX < over.rect.left + over.rect.width / 2
						? 'before'
						: 'after';

				setIndicator( {
					id: over.id,
					position,
				} );
			} }
			onDragEnd={ ( event ) => {
				const { active, over } = event;
				setActiveId( null );

				if ( ! over || active.id === over.id ) {
					setIndicator( null );
					return;
				}

				const oldIndex = items.indexOf( active.id );
				const overIndex = items.indexOf( over.id );
				let newIndex = overIndex;

				if ( indicator?.position === 'after' && oldIndex < overIndex ) {
					newIndex = overIndex;
				} else if ( indicator?.position === 'after' ) {
					newIndex = overIndex + 1;
				} else if ( oldIndex < overIndex ) {
					newIndex = overIndex - 1;
				}

				setIndicator( null );
				onSortEnd( {
					oldIndex,
					newIndex,
				} );
			} }
			onDragCancel={ () => {
				setActiveId( null );
				setIndicator( null );
			} }
		>
			<SortableContext items={ items } strategy={ noSortTransforms }>
				<ComponentTag
					{ ...selectProps }
					components={ selectComponents }
				/>
			</SortableContext>
			{ overlayContainer
				? createPortal( dragOverlay, overlayContainer )
				: dragOverlay }
		</DndContext>
	);
};

/**
 * Component Class
 */
export default class SelectControl extends Component {
	constructor( ...args ) {
		super( ...args );

		const { callback } = this.props;

		this.state = {
			options: {},
			ajaxStatus: !! callback,
			emotionReady: false,
		};

		this.probeRef = createRef();
		this.emotionCache = null;
		this.ownerDocument = null;

		this.getOptions = this.getOptions.bind( this );
		this.getDefaultValue = this.getDefaultValue.bind( this );
		this.findValueData = this.findValueData.bind( this );
		this.requestAjax = this.requestAjax.bind( this );
		this.requestAjaxDebounce = debounce( 300, rafSchd( this.requestAjax ) );
	}

	componentDidMount() {
		const { callback } = this.props;

		// Detect whether we're rendered inside an iframe (WP 6.9+ editor
		// canvas).  If so, create an @emotion cache that injects styles
		// into the iframe's <head> instead of the parent document.
		// This MUST happen before react-select renders for the first time,
		// so we use a two-pass approach: the first render mounts a tiny
		// probe element, and the real select appears on the second render
		// triggered by the setState below.
		if ( this.probeRef.current ) {
			const ownerDoc = this.probeRef.current.ownerDocument;

			if ( ownerDoc && ownerDoc !== document ) {
				this.ownerDocument = ownerDoc;
				this.emotionCache = createCache( {
					key: 'vpf-sel',
					container: ownerDoc.head,
				} );
			}
		}

		// eslint-disable-next-line react/no-did-mount-set-state
		this.setState( { emotionReady: true } );

		if ( callback ) {
			this.requestAjax( {}, ( result ) => {
				if ( result.options ) {
					this.setState( {
						options: result.options,
					} );
				}
			} );
		}
	}

	/**
	 * Get options list.
	 *
	 * @return {Object} - options list for React Select.
	 */
	getOptions() {
		const { controlName } = this.props;

		if ( cachedOptions[ controlName ] ) {
			return cachedOptions[ controlName ];
		}

		return Object.keys( this.state.options ).length
			? this.state.options
			: this.props.options;
	}

	/**
	 * Get default value in to support React Select attribute.
	 *
	 * @return {Object} - value object for React Select.
	 */
	getDefaultValue() {
		const { value, isMultiple } = this.props;

		let result = null;

		if ( isMultiple ) {
			if ( ( ! value && typeof value !== 'string' ) || ! value.length ) {
				return result;
			}

			result = [];

			value.forEach( ( innerVal ) => {
				result.push( this.findValueData( innerVal ) );
			} );
		} else {
			// Handle boolean false properly - it's a valid value.
			if ( value === null || value === undefined || value === '' ) {
				return result;
			}

			// Convert boolean to string if needed for the dropdown.
			const valueToFind =
				typeof value === 'boolean' ? String( value ) : value;
			result = this.findValueData( valueToFind );
		}

		return result;
	}

	/**
	 * Find option data by value.
	 *
	 * @param {string} findVal - value.
	 *
	 * @return {Object | boolean} - value object.
	 */
	findValueData( findVal ) {
		let result = {
			value: findVal,
			label: findVal,
		};

		const options = this.getOptions();

		// Find value in options.
		if ( options ) {
			Object.keys( options ).forEach( ( val ) => {
				const data = options[ val ];

				if ( val === findVal ) {
					if ( typeof data === 'string' ) {
						result.label = data;
					} else {
						result = data;
					}
				}
			} );
		}

		return result;
	}

	/**
	 * Request AJAX dynamic data.
	 *
	 * @param {Object}   additionalData  - additional data for AJAX call.
	 * @param {Function} callback        - callback.
	 * @param {boolean}  useStateLoading - use state change when loading.
	 */
	requestAjax(
		additionalData = {},
		callback = () => {},
		useStateLoading = true
	) {
		const { controlName, attributes } = this.props;

		if ( this.isAJAXinProgress ) {
			return;
		}

		this.isAJAXinProgress = true;

		if ( useStateLoading ) {
			this.setState( {
				ajaxStatus: 'progress',
			} );
		}

		const ajaxData = {
			action: 'vp_dynamic_control_callback',
			nonce: VPGutenbergVariables.nonce,
			vp_control_name: controlName,
			vp_attributes: attributes,
			...additionalData,
		};

		$.ajax( {
			url: ajaxurl,
			method: 'POST',
			dataType: 'json',
			data: ajaxData,
			complete: ( data ) => {
				const json = data.responseJSON;

				if ( callback && json.response ) {
					if ( json.response.options ) {
						cachedOptions[ controlName ] = {
							...cachedOptions[ controlName ],
							...json.response.options,
						};
					}

					callback( json.response );
				}

				if ( useStateLoading ) {
					this.setState( {
						ajaxStatus: true,
					} );
				}

				this.isAJAXinProgress = false;
			},
		} );
	}

	/**
	 * Prepare options for React Select structure.
	 *
	 * @param {Object} options - options object.
	 *
	 * @return {Object} - prepared options.
	 */
	prepareOptions( options ) {
		return Object.keys( options || {} ).map( ( val ) => {
			const option = options[ val ];
			let result = {
				value: val,
				label: options[ val ],
			};

			if ( typeof option === 'object' ) {
				result = { ...option };
			}

			return result;
		} );
	}

	/**
	 * Wrap a react-select element with an @emotion CacheProvider when
	 * rendering inside an iframe (WP 6.9+).
	 *
	 * @param {JSX.Element} selectElement - The react-select component.
	 *
	 * @return {JSX.Element} - Wrapped element.
	 */
	wrapSelect( selectElement ) {
		if ( this.emotionCache ) {
			return (
				<CacheProvider value={ this.emotionCache }>
					{ selectElement }
				</CacheProvider>
			);
		}

		return selectElement;
	}

	render() {
		const { onChange, isMultiple, isSearchable, isCreatable, callback } =
			this.props;

		const { ajaxStatus, emotionReady } = this.state;

		// First render: mount a probe element so componentDidMount can
		// detect whether we're inside an iframe and create the correct
		// @emotion cache before react-select renders.
		if ( ! emotionReady ) {
			return <span ref={ this.probeRef } style={ { display: 'none' } } />;
		}

		const isAsync = !! callback && isSearchable;
		const isLoading = ajaxStatus && ajaxStatus === 'progress';

		// Use the document where this component is rendered, which may
		// differ from the top-level document when inside the iframed
		// block editor (WordPress 6.9+).
		const ownerDoc = this.ownerDocument || document;
		const isInIframe = ownerDoc !== document;
		const overlayContainer = ownerDoc?.body || document.body;

		const selectProps = {
			// Test opened menu items:
			// menuIsOpen: true,
			className: 'vpf-component-select',
			styles: {
				...selectStyles,
				menuPortal: ( styles ) => {
					return {
						...styles,
						zIndex: 1000000,
					};
				},
			},
			// When inside an iframe (WP 6.9+), do NOT portal the menu
			// to body — the coordinate systems differ and the dropdown
			// appears in the wrong position.  Rendering inline works
			// correctly in both contexts.
			menuPortalTarget: isInIframe ? null : ownerDoc.body,
			components: {
				Option( optionProps ) {
					const { data } = optionProps;

					return (
						<Option { ...optionProps }>
							{ typeof data.img !== 'undefined' ? (
								<div className="vpf-component-select-option-img">
									{ data.img ? (
										<img
											src={ data.img }
											alt={ data.label }
										/>
									) : (
										''
									) }
								</div>
							) : (
								''
							) }
							<span className="vpf-component-select-option-label">
								{ data.label }
							</span>
							{ data.category ? (
								<div className="vpf-component-select-option-category">
									{ data.category }
								</div>
							) : (
								''
							) }
						</Option>
					);
				},
			},
			value: this.getDefaultValue(),
			options: this.prepareOptions( this.getOptions() ),
			onChange( val ) {
				if ( isMultiple ) {
					if ( Array.isArray( val ) ) {
						const result = [];

						val.forEach( ( innerVal ) => {
							result.push( innerVal ? innerVal.value : '' );
						} );

						onChange( result );
					} else {
						onChange( [] );
					}
				} else {
					onChange( val ? val.value : '' );
				}
			},
			isMulti: isMultiple,
			isSearchable,
			isLoading,
			isClearable: false,
			placeholder: isSearchable
				? __( 'Type to search…', 'visual-portfolio' )
				: __( 'Select…', 'visual-portfolio' ),
		};

		// Multiple select.
		if ( isMultiple ) {
			selectProps.onSortEnd = ( { oldIndex, newIndex } ) => {
				const newValue = arrayMove(
					this.getDefaultValue(),
					oldIndex,
					newIndex
				);
				selectProps.onChange( newValue );
			};
			selectProps.components.MultiValue = SortableMultiValue;
			selectProps.components.MultiValueLabel = SortableMultiValueLabel;

			// prevent closing options dropdown after select.
			selectProps.closeMenuOnSelect = false;
		}

		// Creatable select.
		if ( isCreatable ) {
			selectProps.placeholder = __(
				'Type and press Enter…',
				'visual-portfolio'
			);
			selectProps.isSearchable = true;

			if ( isMultiple ) {
				return this.wrapSelect(
					<SortableSelectWrapper
						ComponentTag={ CreatableSelect }
						overlayContainer={ overlayContainer }
						selectProps={ selectProps }
						onSortEnd={ selectProps.onSortEnd }
					/>
				);
			}

			return this.wrapSelect( <CreatableSelect { ...selectProps } /> );
		}

		// Async select.
		if ( isAsync ) {
			selectProps.loadOptions = ( inputValue, cb ) => {
				this.requestAjaxDebounce(
					{ q: inputValue },
					( result ) => {
						const newOptions = [];

						if ( result && result.options ) {
							Object.keys( result.options ).forEach( ( k ) => {
								newOptions.push( result.options[ k ] );
							} );
						}

						cb( newOptions.length ? newOptions : null );
					},
					false
				);
			};
			selectProps.cacheOptions = true;
			selectProps.defaultOptions = selectProps.options;

			delete selectProps.options;
			delete selectProps.isLoading;

			if ( isMultiple ) {
				return this.wrapSelect(
					<SortableSelectWrapper
						ComponentTag={ AsyncSelect }
						overlayContainer={ overlayContainer }
						selectProps={ selectProps }
						onSortEnd={ selectProps.onSortEnd }
					/>
				);
			}

			return this.wrapSelect( <AsyncSelect { ...selectProps } /> );
		}

		// Default select.
		if ( isMultiple ) {
			return this.wrapSelect(
				<SortableSelectWrapper
					ComponentTag={ Select }
					overlayContainer={ overlayContainer }
					selectProps={ selectProps }
					onSortEnd={ selectProps.onSortEnd }
				/>
			);
		}

		return this.wrapSelect( <Select { ...selectProps } /> );
	}
}
