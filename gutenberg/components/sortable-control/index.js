import './style.scss';

import {
	closestCenter,
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classnames from 'classnames/dedupe';

import { Button } from '@wordpress/components';
import { Component } from '@wordpress/element';

const SortableItem = function ({ id, element, sourceOptions, items, props }) {
	const { allowDisablingOptions, onChange } = props;

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
		isSorting,
	} = useSortable({
		id,
	});

	const style = {
		transform: CSS.Translate.toString(transform),
		transition: isSorting ? transition : '',
	};

	const label = sourceOptions[element];
	return (
		<li
			className={classnames(
				'vpf-component-sortable-item',
				isDragging ? 'vpf-component-sortable-item-dragging' : ''
			)}
			ref={setNodeRef}
			style={style}
		>
			<span {...attributes} {...listeners}>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M10 4.99976H8V6.99976H10V4.99976Z"
						fill="currentColor"
					/>
					<path
						d="M10 10.9998H8V12.9998H10V10.9998Z"
						fill="currentColor"
					/>
					<path
						d="M10 16.9998H8V18.9998H10V16.9998Z"
						fill="currentColor"
					/>
					<path
						d="M16 4.99976H14V6.99976H16V4.99976Z"
						fill="currentColor"
					/>
					<path
						d="M16 10.9998H14V12.9998H16V10.9998Z"
						fill="currentColor"
					/>
					<path
						d="M16 16.9998H14V18.9998H16V16.9998Z"
						fill="currentColor"
					/>
				</svg>
			</span>
			{label}
			{allowDisablingOptions ? (
				<Button
					className="vpf-component-sortable-delete"
					onClick={() => {
						const updateValue = [...items];
						const findIndex = items.indexOf(element);
						updateValue.splice(findIndex, 1);

						onChange(updateValue);
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M20 12H4"
						/>
					</svg>
				</Button>
			) : null}
		</li>
	);
};

const SortableList = function ({
	items,
	sourceOptions,
	classes,
	onSortEnd,
	props,
}) {
	const sensors = useSensors(useSensor(PointerSensor));

	return (
		<ul className={classes}>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={(event) => {
					const { active, over } = event;

					if (active.id !== over.id) {
						onSortEnd(
							items.indexOf(active.id),
							items.indexOf(over.id)
						);
					}
				}}
			>
				<SortableContext
					items={items}
					strategy={verticalListSortingStrategy}
				>
					{items.map((value) => (
						<SortableItem
							key={`item-${value}`}
							id={value}
							element={value}
							sourceOptions={sourceOptions}
							props={props}
							items={items}
						/>
					))}
				</SortableContext>
			</DndContext>
		</ul>
	);
};

/**
 * Component Class
 */
export default class SortableControl extends Component {
	render() {
		const { options, defaultOptions, allowDisablingOptions, onChange } =
			this.props;

		let { value } = this.props;

		if (typeof value === 'undefined') {
			value = typeof defaultOptions !== 'undefined' ? defaultOptions : [];
		}

		const disabledOptions = Object.keys(options).filter(
			(findValue) => !value.includes(findValue)
		);
		const classes = classnames(
			'vpf-component-sortable',
			disabledOptions.length > 0
				? 'vpf-dragging-has-disabled-options'
				: ''
		);

		return (
			<div>
				<SortableList
					items={value}
					sourceOptions={options}
					classes={classes}
					props={this.props}
					onSortEnd={(oldIndex, newIndex) => {
						const updateValue = arrayMove(
							value,
							oldIndex,
							newIndex
						);
						onChange(updateValue);
					}}
				/>
				{disabledOptions.length > 0 ? (
					<ul className="vpf-component-sortable-disabled">
						{disabledOptions.map((el) => (
							<li key={`disabled-item-${el}`}>
								{allowDisablingOptions ? (
									<Button
										className="vpf-component-sortable-add"
										onClick={() => {
											const updateValue = [...value];

											updateValue.push(el);

											onChange(updateValue);
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M12 4v16m8-8H4"
											/>
										</svg>
									</Button>
								) : null}
								{options[el]}
							</li>
						))}
					</ul>
				) : null}
			</div>
		);
	}
}
