import './page.scss';

/**
 * A plugin admin page: a header with the title, what the page is for, its
 * actions and its sections, above the content, on white.
 *
 * @param {Object}  props             - component props.
 * @param {string}  props.title       - page title.
 * @param {string}  props.description - one line on what the page is for.
 * @param {Element} props.actions     - buttons of the page.
 * @param {Element} props.sections    - `PageSections` of the page.
 * @param {string}  props.className   - extra class.
 * @param {Element} props.children    - content.
 * @return {Element} component.
 */
export function Page({
	title,
	description,
	actions,
	sections,
	className = '',
	children,
}) {
	return (
		<div className={`vpf-admin-page ${className}`}>
			<header className="vpf-admin-page__header">
				<div className="vpf-admin-page__heading">
					<div className="vpf-admin-page__titles">
						<h1>{title}</h1>
						{description && <p>{description}</p>}
					</div>
					{actions && (
						<div className="vpf-admin-page__actions">{actions}</div>
					)}
				</div>
				{sections}
			</header>
			<div className="vpf-admin-page__content">{children}</div>
		</div>
	);
}

/**
 * Sections of a page, each a link to its own URL, so a section can be
 * bookmarked and the browser's back button returns to the previous one.
 *
 * @param {Object}   props          - component props.
 * @param {string}   props.label    - accessible name of the navigation.
 * @param {Array}    props.items    - `{ id, label, href, count, badge }`.
 * @param {string}   props.current  - id of the current section.
 * @param {Function} props.onSelect - called with the id instead of following the link.
 * @return {Element} component.
 */
export function PageSections({ label, items, current, onSelect }) {
	return (
		<nav className="vpf-admin-page__sections" aria-label={label}>
			{items.map((item) => (
				<a
					key={item.id}
					href={item.href}
					aria-current={item.id === current ? 'page' : undefined}
					onClick={(event) => {
						if (
							!onSelect ||
							event.metaKey ||
							event.ctrlKey ||
							event.shiftKey
						) {
							return;
						}

						event.preventDefault();
						onSelect(item.id);
					}}
				>
					{item.label}
					{undefined !== item.count && (
						<span className="vpf-admin-page__count">
							{item.count}
						</span>
					)}
					{item.badge}
				</a>
			))}
		</nav>
	);
}
