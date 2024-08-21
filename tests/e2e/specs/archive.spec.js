/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import expectedArchiveCategoryDefault from '../../fixtures/archive/expected-category-default.json';
import expectedArchiveCategoryPostName from '../../fixtures/archive/expected-category-post-name.json';
import expectedArchiveDefault from '../../fixtures/archive/expected-default.json';
import expectedArchivePostName from '../../fixtures/archive/expected-post-name-permalinks.json';
import portfolioPosts from '../../fixtures/archive/portfolio-posts.json';
import imageFixtures from '../../fixtures/images.json';
import { deleteAllPortfolio } from '../utils/delete-all-portfolio';
import { findAsyncSequential } from '../utils/find-async-sequential';
import { getWordpressImages } from '../utils/get-wordpress-images';

test.describe('archive pages', () => {
	test.beforeEach(async ({ requestUtils }) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin(pluginName);
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
		await requestUtils.deleteAllPosts();
		await deleteAllPortfolio({ requestUtils });
	});
	test.afterEach(async ({ requestUtils }) => {
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
		await requestUtils.deleteAllPosts();
		await deleteAllPortfolio({ requestUtils });
	});

	/**
	 * Deleting all categories of portfolio posts.
	 *
	 * @param {Admin} admin End to end test utilities for WordPress admin’s user interface.
	 * @param {Page}  page  Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 */
	async function deletePortfolioCategories(admin, page) {
		await admin.visitAdminPage(
			'edit-tags.php?taxonomy=portfolio_category&post_type=portfolio'
		);

		if ((await page.locator('#the-list > tr').count()) > 1) {
			await page.locator('#cb-select-all-1').check();
			await page
				.locator('#bulk-action-selector-top')
				.selectOption('delete');
			await page.locator('#doaction').click();
		}
	}

	/**
	 * Deleting all tags of portfolio posts.
	 *
	 * @param {Admin} admin End to end test utilities for WordPress admin’s user interface.
	 * @param {Page}  page  Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 */
	async function deletePortfolioTags(admin, page) {
		await admin.visitAdminPage(
			'edit-tags.php?taxonomy=portfolio_tag&post_type=portfolio'
		);

		if ((await page.locator('#the-list > tr').count()) > 1) {
			await page.locator('#cb-select-all-1').check();
			await page
				.locator('#bulk-action-selector-top')
				.selectOption('delete');
			await page.locator('#doaction').click();
		}
	}

	/**
	 * We get all archive items from the archive page on the front end within the current pagination or selected category.
	 *
	 * @param {Page} page Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 */
	async function getArchiveItems(page) {
		const archiveItems = [];
		const items = page.locator(
			'.vp-portfolio__items article.vp-portfolio__item-wrap'
		);

		for (const item of await items.all()) {
			await page.waitForTimeout(700);
			const url = await item
				.locator('.vp-portfolio__item-img > a')
				.getAttribute('href');
			const categoriesWrapper = item.locator(
				'.vp-portfolio__item-meta .vp-portfolio__item-meta-categories > .vp-portfolio__item-meta-category'
			);

			if (await categoriesWrapper.count()) {
				const categories = [];
				for (const categoryWrap of await categoriesWrapper.all()) {
					const category = await categoryWrap
						.locator('a')
						.innerText();
					const categoryUrl = await categoryWrap
						.locator('a')
						.getAttribute('href');
					categories.push({
						category,
						categoryUrl,
					});
				}
			}

			const title = await item
				.locator('.vp-portfolio__item-meta-title > a')
				.innerText();

			const description = await item
				.locator('.vp-portfolio__item-meta-excerpt > div')
				.innerText();

			archiveItems.push({
				url,
				categories:
					typeof categories !== 'undefined'
						? // eslint-disable-next-line no-undef
							categories
						: false,
				title,
				description,
			});
		}

		return archiveItems;
	}

	/**
	 * We create portfolio posts for the archives page.
	 * We fill these posts with pictures, titles, descriptions and other necessary meta data.
	 * We also set tags and categories.
	 *
	 * @param {RequestUtils} requestUtils Playwright utilities for interacting with the WordPress REST API.
	 * @param {Page}         page         Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {Admin}        admin        End to end test utilities for WordPress admin’s user interface.
	 * @param {Editor}       editor       End to end test utilities for the WordPress Block Editor.
	 */
	async function createPortfolioPosts(requestUtils, page, admin, editor) {
		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
		});

		let key = 0;
		for (const post of portfolioPosts) {
			await admin.createNewPost(post);

			const foundFixtureImage = await findAsyncSequential(
				imageFixtures,
				async (x) => x.postTitle === post.title
			);

			const foundImage = await findAsyncSequential(
				images,
				async (x) => x.description === foundFixtureImage.description
			);

			const featuredExpandedPanel = page.getByRole('button', {
				name: 'Featured image',
				exact: true,
				expanded: false,
			});

			const isFeaturedPanelExpanded = await featuredExpandedPanel.count();

			if (isFeaturedPanelExpanded) {
				await featuredExpandedPanel.click();
			}

			await page
				.getByRole('button', { name: 'Set featured image' })
				.click();

			await page.getByRole('tab', { name: 'Media Library' }).click();

			const imageContainer = page.locator(
				'ul.attachments.ui-sortable.ui-sortable-disabled li.attachment[data-id="' +
					foundImage.id +
					'"]'
			);

			await imageContainer.click();

			await page
				.getByRole('button', { name: 'Set featured image' })
				.click();

			const categoriesExpandedPanel = page.getByRole('button', {
				name: 'Categories',
				exact: true,
				expanded: false,
			});

			const isCategoriesPanelExpanded =
				await categoriesExpandedPanel.count();

			if (isCategoriesPanelExpanded) {
				await categoriesExpandedPanel.click();
			}

			if (typeof post.categories !== 'undefined') {
				for (const category of post.categories) {
					const isVisibleCategoryField =
						page.getByLabel('New Category Name');

					if (!(await isVisibleCategoryField.isVisible())) {
						await page
							.getByRole('button', { name: 'Add New Category' })
							.first()
							.click();
					}

					if (await isVisibleCategoryField.isVisible()) {
						await isVisibleCategoryField.fill(category);
						await page
							.getByLabel('Project')
							.locator('form')
							.getByRole('button', { name: 'Add New Category' })
							.click();
					}

					await page.waitForTimeout(500);
				}
			}

			const tagsExpandedPanel = page.getByRole('button', {
				name: 'Tags',
				exact: true,
				expanded: false,
			});

			const isTagsExpandedPanel = await tagsExpandedPanel.count();

			if (isTagsExpandedPanel) {
				await tagsExpandedPanel.click();
			}

			if (typeof post.tags !== 'undefined') {
				for (const tag of post.tags) {
					await page.getByLabel('Add New Tag').fill(tag);
					await page.getByLabel('Add New Tag').press('Enter');
				}
			}

			//await page.waitForTimeout(500);

			// Publish Post.
			await editor.publishPost();

			// Go to published post.
			await page
				.locator('.components-button', {
					hasText: 'View Project',
				})
				.first()
				.click();

			const postLink = page.url();

			portfolioPosts[key].postLink = postLink;
			key = key + 1;
		}
	}

	/**
	 * We create an archives page and place a block with archive settings on it.
	 * We select the number of elements displayed on the page, skin and pagination display.
	 * Setting the display of the category filter.
	 *
	 * @param {Page}   page   Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {Admin}  admin  End to end test utilities for WordPress admin’s user interface.
	 * @param {Editor} editor End to end test utilities for the WordPress Block Editor.
	 * @return {{archiveID: number, archiveUrl: string}} Return object with archive page ID and archive URL.
	 */
	async function createArchivePage(page, admin, editor) {
		await admin.createNewPost({
			title: 'Portfolio',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'visual-portfolio/block',
		});

		await page.getByRole('button', { name: 'Posts' }).click();
		await page.getByRole('button', { name: 'Continue' }).click();
		await page
			.getByRole('button', { name: 'Classic Preview Classic' })
			.click();
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.getByLabel('Filter').check();
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.getByRole('button', { name: 'More' }).click();
		await page.getByRole('button', { name: 'Current Query' }).click();
		await page.getByRole('button', { name: 'Layout' }).click();
		await page.getByRole('button', { name: 'Pagination' }).click();
		await page.getByRole('button', { name: 'Paged' }).click();
		await page.getByLabel('Close', { exact: true }).click();
		await page.getByRole('button', { name: 'Skin' }).click();
		await page.getByRole('button', { name: 'Caption' }).click();
		await page.getByRole('button', { name: 'Elements' }).click();

		await page
			.locator('.components-base-control__field', {
				hasText: 'Categories Count',
			})
			.locator('input.components-input-control__input')
			.first()
			.fill('3');

		await page.getByLabel('Display Excerpt').check();
		await page.getByLabel('Excerpt Words Count').fill('20');

		// Publish Post.
		await editor.publishPost();

		const archiveUrl = await page
			.getByLabel('Page address')
			.getAttribute('value');

		let archiveID = await page
			.locator('input[name="post_ID"]')
			.inputValue();
		archiveID =
			typeof archiveID === 'string' ? parseInt(archiveID, 10) : null;

		return {
			archiveID,
			archiveUrl,
		};
	}

	/**
	 * Install the previously created archives page in the plugin settings.
	 *
	 * @param {Admin} admin End to end test utilities for WordPress admin’s user interface.
	 * @param {Page}  page  Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 */
	async function setArchiveSettings(admin, page) {
		await admin.visitAdminPage('edit.php?post_type=portfolio');

		await page
			.locator('#menu-posts-portfolio')
			.getByRole('link', { name: 'Settings' })
			.click();
		await page.locator('.select2-container').click();
		await page.getByRole('option', { name: 'Portfolio' }).click();
		await page.getByLabel('Archive Page Items Per Page').fill('2');
		await page.getByRole('button', { name: 'Save Changes' }).click();
	}

	/**
	 * We receive an array of objects with archive elements in the process of querying the layout on the front-end side.
	 * This array will be used as a comparison array against the expected result.
	 * During the survey process, we also collect information about the current state of pagination,
	 * Understanding what page we are on and what elements surround us.
	 *
	 * @param {Page} page Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @return {
	 * {
	 * 	items:
	 * 		{
	 * 			url: any, categories: any, title: any, description: any
	 * 		}[],
	 * 		pagination: (
	 * 			{
	 * 				text: any,
	 * 				active: boolean
	 * 			} |
	 * 			{
	 * 				url: any,
	 * 				text: any,
	 * 				standard: boolean
	 * 			} |
	 * 			{
	 * 				text: any,
	 * 				dots: boolean
	 * 			} |
	 * 			{
	 * 				url: any,
	 * 				nextPage: boolean
	 * 			}
	 * 		)[]
	 * }
	 * []}
	 */
	async function getReceivedArchive(page) {
		const pageCounts = 5;
		const receivedArchive = [];
		let currentCount = 0;

		while (currentCount < pageCounts) {
			const archivePagination = [];

			await page.waitForTimeout(700);

			const archiveItems = await getArchiveItems(page);

			const pagination = page.locator(
				'.vp-portfolio__layout-elements .vp-pagination'
			);

			const paginationItems = pagination.locator('.vp-pagination__item');

			for (const paginationItem of await paginationItems.all()) {
				const classes = await paginationItem.getAttribute('class');

				if (
					classes === 'vp-pagination__item vp-pagination__item-active'
				) {
					const activeElement = await paginationItem.innerText();
					archivePagination.push({
						text: activeElement,
						active: true,
					});
				}

				if (classes === 'vp-pagination__item') {
					const paginationLink = await paginationItem
						.locator('a')
						.getAttribute('href');
					const paginationText = await paginationItem
						.locator('a')
						.innerText();
					archivePagination.push({
						url: paginationLink,
						text: paginationText,
						standard: true,
					});
				}

				if (
					classes === 'vp-pagination__item vp-pagination__item-dots'
				) {
					const dotsText = await paginationItem.innerText();
					archivePagination.push({
						text: dotsText,
						dots: true,
					});
				}

				if (
					classes === 'vp-pagination__item vp-pagination__item-next'
				) {
					const nextPaginationLink = await paginationItem
						.locator('a')
						.getAttribute('href');
					archivePagination.push({
						url: nextPaginationLink,
						nextPage: true,
					});
				}
			}

			receivedArchive.push({
				items: archiveItems,
				pagination: archivePagination,
			});

			currentCount++;

			if (
				await pagination
					.locator('.vp-pagination__item.vp-pagination__item-next')
					.count()
			) {
				await pagination
					.locator(
						'.vp-pagination__item.vp-pagination__item-next > a'
					)
					.click();

				await page.waitForTimeout(700);
			}
		}

		return receivedArchive;
	}

	/**
	 * We receive an array of objects with category elements in the process of querying the layout on the front-end side.
	 * This array will be used as a comparison array against the expected result.
	 * During the survey process, we also collect information about the current state of pagination,
	 * Understanding what page we are on and what elements surround us.
	 *
	 * @param {Page} page Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @return {{title: any, url: any, items: never[]}[]}
	 */
	async function getReceivedCategories(page) {
		const filterItems = page
			.locator('.vp-filter .vp-filter__item')
			.filter({ hasNotText: 'All' });
		const receivedCategories = [];

		for (const filterItem of await filterItems.all()) {
			receivedCategories.push({
				title: await filterItem
					.locator('a')
					.getAttribute('data-vp-filter'),
				url: await filterItem.locator('a').getAttribute('href'),
				items: [],
			});
		}

		let categoryKey = 0;

		for (const category of receivedCategories) {
			await page
				.locator('.vp-filter .vp-filter__item')
				.filter({ hasText: category.title })
				.click();

			await page.waitForTimeout(700);

			let archiveItems = await getArchiveItems(page);

			const pagination = page.locator(
				'.vp-portfolio__layout-elements .vp-pagination'
			);

			if (archiveItems.length === 2 && (await pagination.count())) {
				await pagination
					.locator(
						'.vp-pagination__item.vp-pagination__item-next > a'
					)
					.click();

				await page.waitForTimeout(500);

				archiveItems = archiveItems.concat(await getArchiveItems(page));
			}

			receivedCategories[categoryKey].items = archiveItems;

			categoryKey++;
		}

		return receivedCategories;
	}

	test('check archive page with default pagination and category filter (plain permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await deletePortfolioCategories(admin, page);
		await deletePortfolioTags(admin, page);

		await createPortfolioPosts(requestUtils, page, admin, editor);

		// Set Permalink Settings.
		await admin.visitAdminPage('options-permalink.php');
		await page.getByLabel('Plain').check();
		await page.getByRole('button', { name: 'Save Changes' }).click();

		const { archiveID, archiveUrl } = await createArchivePage(
			page,
			admin,
			editor
		);

		await setArchiveSettings(admin, page);

		// prepare Fixtures.
		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		let fixtureKey = 0;
		for (const expectedArchiveItem of expectedArchiveDefault) {
			let paginationKey = 0;
			for (const expectedPaginationItem of expectedArchiveItem.pagination) {
				if (typeof expectedPaginationItem.url !== 'undefined') {
					const fixtureUrl = testBaseUrl + expectedPaginationItem.url;

					expectedArchiveDefault[fixtureKey].pagination[
						paginationKey
					].url = fixtureUrl.replace(
						'/?page_id=0000',
						'/?page_id=' + archiveID
					);
				}
				paginationKey++;
			}

			let itemKey = 0;
			for (const expectedItem of expectedArchiveItem.items) {
				expectedArchiveDefault[fixtureKey].items[itemKey].url =
					testBaseUrl + expectedItem.url;
				itemKey++;
			}

			fixtureKey++;
		}

		fixtureKey = 0;
		for (const expectedArchiveCategoryItem of expectedArchiveCategoryDefault) {
			let itemKey = 0;
			for (const expectedItem of expectedArchiveCategoryItem.items) {
				expectedArchiveCategoryDefault[fixtureKey].items[itemKey].url =
					testBaseUrl + expectedItem.url;
				itemKey++;
			}
			const fixtureUrl = testBaseUrl + expectedArchiveCategoryItem.url;
			expectedArchiveCategoryDefault[fixtureKey].url = fixtureUrl.replace(
				'/?page_id=000',
				'/?page_id=' + archiveID
			);

			fixtureKey++;
		}

		await page.goto(archiveUrl);

		const receivedArchive = await getReceivedArchive(page);

		// check Archive page
		expect(receivedArchive).toEqual(expectedArchiveDefault);

		const receivedCategories = await getReceivedCategories(page);

		await page.waitForTimeout(500);

		// check Archive Category filter
		expect(receivedCategories).toEqual(expectedArchiveCategoryDefault);

		/**
		 * Set Post Name Permalink Settings.
		 * Without this stupid change, hooks for deleting posts and images stop working.
		 * This happens due to the fact that the removal methods use a link to access the API.
		 * For example this type: wp-json/wp/v2/media
		 * This link will not be available. It stops working if the permalink settings are set to Plain.
		 * In this case, when calling the method, the request contains a 404 error.
		 */
		await admin.visitAdminPage('options-permalink.php');
		await page.getByLabel('Post name').check();
		await page.getByRole('button', { name: 'Save Changes' }).click();
	});

	test('check archive page with default pagination and category filter (post name permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await deletePortfolioCategories(admin, page);
		await deletePortfolioTags(admin, page);

		await createPortfolioPosts(requestUtils, page, admin, editor);

		// Set Permalink Settings.
		await admin.visitAdminPage('options-permalink.php');
		await page.getByLabel('Post name').check();
		await page.getByRole('button', { name: 'Save Changes' }).click();

		const { archiveUrl } = await createArchivePage(page, admin, editor);

		await setArchiveSettings(admin, page);

		// prepare Fixtures.
		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		let fixtureKey = 0;
		for (const expectedArchiveItem of expectedArchivePostName) {
			let paginationKey = 0;
			for (const expectedPaginationItem of expectedArchiveItem.pagination) {
				if (typeof expectedPaginationItem.url !== 'undefined') {
					const fixtureUrl = testBaseUrl + expectedPaginationItem.url;

					expectedArchivePostName[fixtureKey].pagination[
						paginationKey
					].url = fixtureUrl;
				}
				paginationKey++;
			}

			let itemKey = 0;
			for (const expectedItem of expectedArchiveItem.items) {
				expectedArchivePostName[fixtureKey].items[itemKey].url =
					testBaseUrl + expectedItem.url;
				itemKey++;
			}

			fixtureKey++;
		}

		fixtureKey = 0;
		for (const expectedArchiveCategoryItem of expectedArchiveCategoryPostName) {
			let itemKey = 0;
			for (const expectedItem of expectedArchiveCategoryItem.items) {
				expectedArchiveCategoryPostName[fixtureKey].items[itemKey].url =
					testBaseUrl + expectedItem.url;
				itemKey++;
			}
			expectedArchiveCategoryPostName[fixtureKey].url =
				testBaseUrl + expectedArchiveCategoryItem.url;

			fixtureKey++;
		}

		await page.goto(archiveUrl);

		const receivedArchive = await getReceivedArchive(page);

		// check Archive page
		expect(receivedArchive).toEqual(expectedArchivePostName);

		const receivedCategories = await getReceivedCategories(page);

		await page.waitForTimeout(500);

		// check Archive Category filter
		expect(receivedCategories).toEqual(expectedArchiveCategoryPostName);
	});
});
