/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { getPluginSlug } from '../utils/plugin-slug';

test.describe('Block icons', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	// The editor keeps hidden copies of a block icon, such as the drag chip.
	// When the copies share gradient ids, `url(#id)` in every copy resolves to
	// the first one, and a gradient inside a hidden copy paints nothing.
	test('each icon copy references its own gradient', async ({
		admin,
		page,
	}) => {
		await admin.createNewPost();

		const foreignReferences = await page.evaluate(async () => {
			const { createElement, createRoot } = window.wp.element;
			const iconBlocks = window.wp.blocks
				.getBlockTypes()
				.filter(({ name }) => name.startsWith('visual-portfolio/'));
			const host = document.createElement('div');
			document.body.append(host);

			createRoot(host).render(
				iconBlocks.map(({ name, icon }) =>
					createElement(
						'div',
						{ key: name, 'data-block': name },
						createElement('div', { hidden: true }, icon.src),
						createElement('div', null, icon.src)
					)
				)
			);
			await new Promise((resolve) => setTimeout(resolve, 100));

			const result = [];

			host.querySelectorAll('svg').forEach((svg) => {
				svg.querySelectorAll(
					'[fill^="url(#"], [mask^="url(#"]'
				).forEach((element) => {
					const reference =
						element.getAttribute('fill') ||
						element.getAttribute('mask');
					const target = document.getElementById(
						reference.slice(5, -1)
					);

					if (!svg.contains(target)) {
						result.push(
							`${svg.closest('[data-block]').dataset.block} ${reference}`
						);
					}
				});
			});

			return {
				checked: host.querySelectorAll('[fill^="url(#"]').length,
				result,
			};
		});

		expect(foreignReferences.checked).toBeGreaterThan(0);
		expect(foreignReferences.result).toEqual([]);
	});
});
