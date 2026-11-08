import {
	BaseControl,
	Button,
	ColorPicker,
	Dropdown,
	SelectControl,
	TextareaControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import {
	createRoot,
	flushSync,
	RawHTML,
	useEffect,
	useState,
} from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import $ from 'jquery';

const { fields, isPro, storedFields } = window.VPSettingsControls;

function Field({ field, source, initialValue, preview, upgrade, refresh }) {
	const [value, setValue] = useState(initialValue);
	const [image, setImage] = useState(preview);
	const options = Object.entries(field.options || {}).map(
		([optionValue, label]) => ({
			value: optionValue,
			label: decodeEntities(label),
		})
	);
	const disabled = !!field.is_pro && !isPro;
	const label = (
		<>
			{decodeEntities(field.label)}
			{disabled && (
				<RawHTML className="vpf-settings-upgrade">{upgrade}</RawHTML>
			)}
		</>
	);
	const props = {
		label,
		help: field.desc ? <RawHTML>{field.desc}</RawHTML> : undefined,
		disabled,
		value,
		onChange: setValue,
		__nextHasNoMarginBottom: true,
		__next40pxDefaultSize: true,
	};
	useEffect(() => {
		if (field.type !== 'number') {
			if (field.type === 'toggle') {
				source.checked = value === 'on';
			} else {
				source.value = value;
			}
		}
		refresh();
	}, [value, field.type, source, refresh]);

	let control;
	if (field.type === 'toggle') {
		control = (
			<ToggleControl
				{...props}
				checked={value === 'on'}
				onChange={(checked) => {
					if (
						field.name === 'register_portfolio_post_type' &&
						!checked &&
						!window.confirm(
							"Are you sure you want to turn off the Portfolio custom post type and related taxonomies? Make sure you don't use this post type on your site, otherwise you might see errors on the frontend."
						)
					) {
						return;
					}
					setValue(checked ? 'on' : 'off');
				}}
			/>
		);
	} else if (field.type === 'select') {
		control = <SelectControl {...props} options={options} />;
	} else if (field.type === 'color') {
		control = (
			<div className="vpf-settings-color">
				<TextControl {...props} />
				<Dropdown
					renderToggle={({ isOpen, onToggle }) => (
						<Button
							variant="secondary"
							onClick={onToggle}
							aria-expanded={isOpen}
							aria-label={__(
								'Choose background color',
								'visual-portfolio'
							)}
						>
							<span
								className="vpf-settings-color-swatch"
								style={{ backgroundColor: value }}
							/>
						</Button>
					)}
					renderContent={() => (
						<ColorPicker
							color={value}
							onChange={setValue}
							enableAlpha={false}
						/>
					)}
				/>
			</div>
		);
	} else if (field.type === 'textarea') {
		control = (
			<TextareaControl {...props} placeholder={field.placeholder} />
		);
	} else if (field.type === 'image') {
		control = (
			<BaseControl
				label={label}
				help={props.help}
				__nextHasNoMarginBottom
			>
				{image && (
					<img className="vpf-settings-image" src={image} alt="" />
				)}
				<div className="vpf-settings-image-actions">
					<Button
						variant="secondary"
						onClick={() => {
							const frame = window.wp.media({
								multiple: false,
								library: { type: 'image' },
							});
							frame.on('select', () => {
								const attachment = frame
									.state()
									.get('selection')
									.first()
									.toJSON();
								setValue(String(attachment.id));
								setImage(
									attachment.sizes?.thumbnail?.url ||
										attachment.url
								);
							});
							frame.open();
						}}
					>
						{decodeEntities(field.options.button_label)}
					</Button>
					{value && (
						<Button
							variant="tertiary"
							onClick={() => {
								setValue('');
								setImage('');
							}}
						>
							{__('Remove Image', 'visual-portfolio')}
						</Button>
					)}
				</div>
			</BaseControl>
		);
	} else {
		control = (
			<TextControl
				{...props}
				{...(field.type === 'number'
					? {
							value: undefined,
							defaultValue: initialValue,
							name: source.name,
							id: source.id,
						}
					: {})}
				ref={
					field.type === 'number'
						? (node) => {
								if (node)
									node.classList.add(...source.classList);
							}
						: undefined
				}
				type={field.type}
				placeholder={field.placeholder}
				min={field.min}
				max={field.max}
				step={field.step}
			/>
		);
	}
	return control;
}

const groups = {
	vp_general: [
		[
			'',
			[
				'register_portfolio_post_type',
				'portfolio_archive_page',
				'archive_page_items_per_page',
				'no_image',
			],
		],
		[
			__('Custom taxonomies', 'visual-portfolio'),
			['filter_taxonomies'],
			true,
		],
		[__('Performance', 'visual-portfolio'), ['ajax_caching'], true],
		[
			__('Responsive Breakpoints', 'visual-portfolio'),
			[
				'breakpoint_xl',
				'breakpoint_lg',
				'breakpoint_md',
				'breakpoint_sm',
				'breakpoint_xs',
			],
			true,
			true,
		],
	],
	vp_images: [
		['', ['lazy_loading', 'lazy_loading_excludes']],
		[
			__('Image sizes', 'visual-portfolio'),
			[
				'images_layouts_title',
				'sm',
				'md',
				'lg',
				'xl',
				'images_popup_title',
				'sm_popup',
				'md_popup',
				'xl_popup',
				'images_sizes_note',
			],
			true,
			true,
		],
	],
	vp_popup_gallery: [
		[
			__('Behavior', 'visual-portfolio'),
			[
				'enable_on_wordpress_images',
				'loop',
				'load_next_pages',
				'click_to_zoom',
				'deep_linking',
				'deep_linking_url_to_share_images',
			],
		],
		[
			__('Controls', 'visual-portfolio'),
			[
				'show_arrows',
				'show_counter',
				'show_zoom_button',
				'show_fullscreen_button',
				'show_share_button',
				'show_download_button',
				'show_close_button',
			],
		],
		[__('Appearance', 'visual-portfolio'), ['background_color']],
		[
			__('Thumbnails and slideshow', 'visual-portfolio'),
			[
				'show_thumbs',
				'thumbs_auto_start',
				'thumbs_position',
				'show_slideshow',
			],
			true,
		],
		[
			__('Albums', 'visual-portfolio'),
			['album_isolated_popup', 'album_lazy_load_threshold'],
			true,
		],
		[
			__('Quick View', 'visual-portfolio'),
			[
				'popup_quick_view_show_url_button',
				'popup_quick_view_internal_links_target',
				'popup_quick_view_external_links_target',
				'pages_iframe_custom_css',
			],
			true,
		],
		[__('Advanced', 'visual-portfolio'), ['vendor', 'restore_focus'], true],
	],
};

function revealInvalidField(field, conditions) {
	const form = field.closest('form');
	for (
		let element = field;
		element && element !== form;
		element = element.parentElement
	) {
		element.hidden = false;
		if (element.matches('details')) element.open = true;
		if (element.hasAttribute('data-cond')) {
			if (!conditions.has(element))
				conditions.set(element, element.getAttribute('data-cond'));
			element.setAttribute('data-cond', 'true');
			element.style.display = '';
		}
	}
}

$(() => {
	Object.entries(groups).forEach(([section, sectionGroups]) => {
		const form = document.querySelector(`#${section} form`);
		const table = form?.querySelector('.form-table');
		if (!table) {
			return;
		}
		const invalidFields = new Set();
		const revealedConditions = new Map();
		const content = document.createElement('div');
		content.className = 'vpf-settings-modern';
		table.before(content);
		const controls = new Map();
		const refresh = () => {
			const read = (name) => {
				const checkbox = form.querySelector(
					`[type="checkbox"][name="${section}[${name}]"]`
				);
				return checkbox
					? checkbox.checked
						? 'on'
						: 'off'
					: form.querySelector(`[name="${section}[${name}]"]`)?.value;
			};
			const show = (name, visible) => {
				const row = controls.get(name);
				if (row) row.hidden = !visible;
			};
			show(
				'portfolio_archive_page',
				read('register_portfolio_post_type') === 'on'
			);
			show(
				'archive_page_items_per_page',
				read('register_portfolio_post_type') === 'on' &&
					Number(read('portfolio_archive_page')) > 0
			);
			show('lazy_loading_excludes', !!read('lazy_loading'));
			show(
				'deep_linking_url_to_share_images',
				read('deep_linking') === 'on'
			);
			const fancybox = read('vendor') === 'fancybox';
			const thumbs = read('show_thumbs') === 'on';
			show('thumbs_auto_start', fancybox && thumbs);
			show('thumbs_position', fancybox && thumbs);
			if (section === 'vp_popup_gallery') {
				const thumbnails = content.querySelector(
					'[data-group="show_thumbs"]'
				);
				if (thumbnails) thumbnails.hidden = !fancybox;
			}
			invalidFields.forEach((field) => {
				if (
					field.querySelector(':invalid') ||
					field.contains(document.activeElement)
				)
					revealInvalidField(field, revealedConditions);
				else invalidFields.delete(field);
			});
			revealedConditions.forEach((condition, row) => {
				if (
					!row.querySelector(':invalid') &&
					!row.contains(document.activeElement)
				) {
					row.setAttribute('data-cond', condition);
					revealedConditions.delete(row);
				}
			});
			const metabox = $(form).closest('.metabox-holder');
			metabox.conditionize('runCheck', metabox.find('[data-cond]'));
			window.VPAdminSettingsForms?.refresh($(form));
		};
		const add = (parent, field) => {
			const row = table.querySelector(`tr.${CSS.escape(field.name)}`);
			if (!row) return;
			const container = document.createElement('div');
			container.className = `vpf-settings-field ${row.className}`;
			if (row.hasAttribute('data-cond')) {
				container.setAttribute(
					'data-cond',
					row.getAttribute('data-cond')
				);
			}
			parent.append(container);
			controls.set(field.name, container);
			const input = row.querySelector(
				'input:not([type="button"]), select, textarea'
			);
			if (field.type === 'section_title' && !field.callback) {
				container.classList.add('vpf-settings-subheading');
				container.innerHTML = `<h3>${field.label || ''}</h3>`;
				container.append(...row.querySelector('td').childNodes);
			} else if (
				[
					'toggle',
					'select',
					'number',
					'text',
					'textarea',
					'image',
					'color',
				].includes(field.type) &&
				!field.callback &&
				!(
					field.name === 'portfolio_archive_page' &&
					field.type === 'select'
				)
			) {
				const initialValue =
					field.type === 'toggle'
						? row.querySelector('[type="checkbox"]').checked
							? 'on'
							: 'off'
						: input.value;
				const source =
					field.type === 'toggle'
						? row.querySelector('[type="checkbox"]')
						: input;
				const preview =
					row.querySelector('img')?.getAttribute('src') || '';
				const upgrade =
					row.querySelector('.vpf-settings-control-pro-label')
						?.outerHTML || '';
				const originals = document.createElement('div');
				originals.hidden = true;
				originals.append(
					...row.querySelectorAll(
						'input[name], select[name], textarea[name]'
					)
				);
				if (field.is_pro && !isPro) {
					originals.querySelectorAll('[name]').forEach((original) => {
						original.disabled = true;
					});
					if (storedFields[section].includes(field.name)) {
						const retained = document.createElement('input');
						retained.type = 'hidden';
						retained.name = `${section}[${field.name}]`;
						retained.value = initialValue;
						originals.append(retained);
					}
				}
				flushSync(() => {
					createRoot(container).render(
						<Field
							field={field}
							source={source}
							initialValue={initialValue}
							preview={preview}
							upgrade={upgrade}
							refresh={refresh}
						/>
					);
				});
				if (field.type === 'number') {
					source.remove();
				}
				container.append(originals);
			} else {
				const label = row.querySelector('th');
				if (label?.textContent.trim()) {
					container.append(...label.childNodes);
				}
				container.append(...row.querySelector('td').childNodes);
				if (
					field.name === 'portfolio_archive_page' &&
					field.type === 'select' &&
					!field.callback
				) {
					const picker = $(input);
					picker.select2({
						...picker.data('select2').options.options,
						selectionAdapter: undefined,
						allowClear: true,
						placeholder: input.options[0].text,
					});
				}
			}
			row.remove();
		};
		const used = new Set();
		sectionGroups.forEach(([title, names, folded, grid]) => {
			const group = document.createElement(
				folded ? 'details' : 'section'
			);
			group.className = 'vpf-settings-section';
			group.dataset.group = names[0];
			if (title) {
				const heading = document.createElement(
					folded ? 'summary' : 'h2'
				);
				heading.textContent = title;
				const sectionTitle = {
					breakpoint_xl: 'breakpoints_title',
					album_isolated_popup: 'album_section_title',
					popup_quick_view_show_url_button: 'popup_quick_view_title',
				}[names[0]];
				const upgrade =
					sectionTitle &&
					table.querySelector(
						`.${sectionTitle} .vpf-settings-control-pro-label`
					);
				if (upgrade && !isPro) {
					heading.classList.add('vpf-settings-control-pro');
					heading.append(upgrade);
				}
				group.append(heading);
			}
			const body = document.createElement('div');
			body.className = grid
				? 'vpf-settings-fields vpf-settings-size-grid'
				: 'vpf-settings-fields';
			group.append(body);
			content.append(group);
			names.forEach((name) => {
				const field = fields[section].find(
					(item) => item.name === name
				);
				if (field) add(body, field);
				used.add(name);
			});
		});
		const replacedHeadings = new Set([
			'breakpoints_title',
			'popup_general_divider_title',
			'popup_ui_elements_title',
			'album_section_title',
			'popup_quick_view_title',
			'popup_misc_title',
		]);
		fields[section]
			.filter(
				(field) =>
					!used.has(field.name) && !replacedHeadings.has(field.name)
			)
			.forEach((field) => {
				add(content, field);
			});
		replacedHeadings.forEach((name) => {
			table.querySelector(`tr.${name}`)?.remove();
		});
		if (!table.querySelector('tr')) table.remove();
		$(form).on('change', 'select', refresh);
		form.addEventListener(
			'invalid',
			(event) => {
				const field = event.target.closest('.vpf-settings-field');
				if (!field) return;
				invalidFields.add(field);
				revealInvalidField(field, revealedConditions);
			},
			true
		);
		form.addEventListener('focusout', () => {
			if (invalidFields.size) requestAnimationFrame(refresh);
		});
		requestAnimationFrame(() => {
			refresh();
			window.VPAdminSettingsForms?.persist($(form));
		});
	});
	window.addEventListener('hashchange', () => {
		if (Object.hasOwn(groups, window.location.hash.slice(1))) {
			$(`${window.location.hash}-tab`).trigger('click');
		}
	});
});
