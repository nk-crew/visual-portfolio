/* eslint-disable no-console */
/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import expectedArchiveCategoryDefault from '../../fixtures/archive/expected-category-default.json';
import expectedArchiveCategoryInfinityDefault from '../../fixtures/archive/expected-category-infinity-default.json';
import expectedArchiveCategoryInfinityPostName from '../../fixtures/archive/expected-category-infinity-post-name.json';
import expectedArchiveCategoryLoadMoreDefault from '../../fixtures/archive/expected-category-load-more-default.json';
import expectedArchiveCategoryLoadMorePostName from '../../fixtures/archive/expected-category-load-more-post-name.json';
import expectedArchiveCategoryPostName from '../../fixtures/archive/expected-category-post-name.json';
import expectedArchiveDefault from '../../fixtures/archive/expected-default.json';
import expectedArchiveInfinityDefault from '../../fixtures/archive/expected-infinity-default.json';
import expectedArchiveLoadMoreDefault from '../../fixtures/archive/expected-load-more-default.json';
import expectedArchivePostName from '../../fixtures/archive/expected-post-name-permalinks.json';
import expectedArchivePostNameLoadMore from '../../fixtures/archive/expected-post-name-permalinks-load-more.json';
import expectedArchivePostNameInfinity from '../../fixtures/archive/expected-post-name-premalinks-infinity.json';
import portfolioPosts from '../../fixtures/archive/portfolio-posts.json';
import imageFixtures from '../../fixtures/images.json';
import { deleteAllPortfolio } from '../utils/delete-all-portfolio';
import { findAsyncSequential } from '../utils/find-async-sequential';
import { getWordpressImages } from '../utils/get-wordpress-images';

test.describe('archive pages', () => {
	test.beforeEach(async ({ admin, page, requestUtils }) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await page.waitForTimeout(1500);
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin(pluginName);
	});

	test.afterEach(async ({ requestUtils }) => {
		await requestUtils.deleteAllPages();
		await requestUtils.deleteAllPosts();
	});

	test.afterAll(async ({ requestUtils }) => {
		await deleteAllPortfolioTaxonomies(requestUtils);
		await deleteAllPortfolio({ requestUtils });
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
		await requestUtils.deleteAllPosts();
	});

	/**
	 * Asynchronously deletes all terms associated with a specified taxonomy in a WordPress site.
	 * Utilizes the requestUtils.rest method to interact with the WordPress REST API.
	 *
	 * @param {Object} requestUtils - An object that provides utility methods for making REST API requests.
	 * @param {string} taxonomy     - A string representing the taxonomy from which terms should be deleted (e.g., 'portfolio_category', 'portfolio_tag').
	 */
	async function deletePortfolioTaxonomyTerms(requestUtils, taxonomy) {
		try {
			// Get all terms for the specified taxonomy
			const terms = await requestUtils.rest({
				path: `/wp/v2/${taxonomy}?context=view`,
				params: { per_page: 100 }, // Adjust as necessary for your needs
			});

			// Check if the response is an error
			if (!Array.isArray(terms)) {
				throw new Error(
					`Failed to retrieve terms for taxonomy "${taxonomy}". Response: ${JSON.stringify(terms)}`
				);
			}

			// Iterate over each term and delete it
			for (const term of await terms) {
				try {
					await requestUtils.rest({
						path: `/wp/v2/${taxonomy}/${term.id}`,
						method: 'DELETE',
						params: { force: true }, // Force delete to bypass trash
					});
				} catch (deleteError) {
					console.log(
						`Error deleting term with ID ${term.id}:`,
						deleteError
					);
				}
			}
		} catch (error) {
			console.log(`Error deleting ${taxonomy} terms:`, error);
		}
	}

	/**
	 * Asynchronously deletes all terms from 'portfolio_category' and 'portfolio_tag' taxonomies.
	 * Serves as a usage example for deletePortfolioTaxonomyTerms.
	 *
	 * @param {Object} requestUtils - An object that provides utility methods for making REST API requests.
	 */
	async function deleteAllPortfolioTaxonomies(requestUtils) {
		await deletePortfolioTaxonomyTerms(requestUtils, 'portfolio_category');
		await deletePortfolioTaxonomyTerms(requestUtils, 'portfolio_tag');
	}

	/**
	 * We get all archive items from the archive page on the front end within the current pagination or selected category.
	 *
	 * @param {Page} page Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 */
	async function getArchiveItems(page) {
		const archiveItems = [];
		const items = await page.locator(
			'.vp-portfolio__items article.vp-portfolio__item-wrap'
		);

		for (const item of await items.all()) {
			const url = await item
				.locator('.vp-portfolio__item-img > a[href]')
				.getAttribute('href');
			const categoriesWrapper = await item.locator(
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
	 * We create an archives page and place a block with archive settings on it.
	 * We select the number of elements displayed on the page, skin and pagination display.
	 * Setting the display of the category filter.
	 *
	 * @param {Page}   page           Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {Admin}  admin          End to end test utilities for WordPress admin’s user interface.
	 * @param {Editor} editor         End to end test utilities for the WordPress Block Editor.
	 * @param {string} typePagination Type of Pagination.
	 * @return {{archiveID: number, archiveUrl: string}} Return object with archive page ID and archive URL.
	 */
	async function createArchivePage(
		page,
		admin,
		editor,
		typePagination = 'paged'
	) {
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

		switch (typePagination) {
			case 'paged':
				await page.getByRole('button', { name: 'Paged' }).click();
				break;
			case 'loadMore':
				await page.getByRole('button', { name: 'Load More' }).click();
				break;
			case 'inf':
				await page.getByRole('button', { name: 'Infinite' }).click();
				break;
		}

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
		await page
			.locator('.portfolio_archive_page .select2-container')
			.click();
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
	 * @param {Page}   page           Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {string} typePagination Type of Pagination.
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
	async function getReceivedArchive(page, typePagination = 'paged') {
		const pageCounts = 5;
		const receivedArchive = [];
		let currentCount = 0;

		while (currentCount < pageCounts) {
			const archivePagination = [];

			await page.waitForTimeout(2000);

			const archiveItems = await getArchiveItems(page);

			await page.waitForTimeout(1000);

			const pagination = await page.locator(
				'.vp-portfolio__layout-elements .vp-pagination'
			);

			const paginationItems = await pagination.locator(
				'.vp-pagination__item'
			);

			for (const paginationItem of await paginationItems.all()) {
				const classes = await paginationItem.getAttribute('class');

				switch (typePagination) {
					case 'paged':
						if (
							classes ===
							'vp-pagination__item vp-pagination__item-active'
						) {
							const activeElement =
								await paginationItem.innerText();
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
							classes ===
							'vp-pagination__item vp-pagination__item-dots'
						) {
							const dotsText = await paginationItem.innerText();
							archivePagination.push({
								text: dotsText,
								dots: true,
							});
						}

						if (
							classes ===
							'vp-pagination__item vp-pagination__item-next'
						) {
							const nextPaginationLink = await paginationItem
								.locator('a')
								.getAttribute('href');
							archivePagination.push({
								url: nextPaginationLink,
								nextPage: true,
							});
						}
						break;
					case 'loadMore':
						if (
							classes === 'vp-pagination__item' &&
							(await pagination
								.locator('.vp-pagination__no-more')
								.count()) === 0
						) {
							const paginationLink = await paginationItem
								.locator('a')
								.getAttribute('href');
							const paginationText = await paginationItem
								.locator('a')
								.innerText();
							archivePagination.push({
								url: paginationLink,
								text: paginationText,
							});
						}
						break;
				}
			}

			if (typePagination === 'paged' || typePagination === 'loadMore') {
				receivedArchive.push({
					items: archiveItems,
					pagination: archivePagination,
				});
			}

			currentCount++;

			if (
				(await pagination
					.locator('.vp-pagination__item.vp-pagination__item-next')
					.count()) &&
				typePagination === 'paged'
			) {
				await pagination
					.locator(
						'.vp-pagination__item.vp-pagination__item-next > a'
					)
					.click();
			}

			if (
				(await pagination
					.locator('a.vp-pagination__load-more')
					.count()) &&
				(typePagination === 'loadMore' || typePagination === 'inf')
			) {
				// Ensure the element is visible and stable before interacting
				await page.waitForSelector('a.vp-pagination__load-more', {
					state: 'visible',
				});

				// Optional: Scroll into view to ensure visibility
				await page
					.locator('a.vp-pagination__load-more')
					.scrollIntoViewIfNeeded();

				// Add a delay to allow any animations or transitions to complete
				await page.waitForTimeout(500);

				const nextPageAttribute = await pagination
					.locator('a.vp-pagination__load-more')
					.getAttribute('href');
				if (nextPageAttribute !== '') {
					try {
						await pagination
							.locator('a.vp-pagination__load-more')
							.click();
					} catch (error) {
						console.error('Error clicking "Load More":', error);
						// Retry logic or further error handling can be implemented here
					}
				}

				if (
					typePagination === 'inf' &&
					nextPageAttribute === '' &&
					currentCount === 5
				) {
					receivedArchive.push({
						items: archiveItems,
					});
				}
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
	 * @param {Page}   page           Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {string} typePagination Type of Pagination.
	 * @return {{title: any, url: any, items: never[]}[]}
	 */
	async function getReceivedCategories(page, typePagination = 'paged') {
		const filterItems = await page
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

			const pagination = page.locator(
				'.vp-portfolio__layout-elements .vp-pagination'
			);

			let archiveItems;

			switch (typePagination) {
				case 'paged':
					archiveItems = await getArchiveItems(page);

					if (
						archiveItems.length === 2 &&
						(await pagination.count())
					) {
						await pagination
							.locator(
								'.vp-pagination__item.vp-pagination__item-next > a'
							)
							.click();

						await page.waitForTimeout(500);

						archiveItems = archiveItems.concat(
							await getArchiveItems(page)
						);
					}
					break;
				case 'loadMore':
				case 'inf':
					await page.waitForTimeout(500);
					if (
						await pagination
							.locator('a.vp-pagination__load-more')
							.count()
					) {
						const nextPageAttribute = await pagination
							.locator('a.vp-pagination__load-more')
							.getAttribute('href');
						if (nextPageAttribute !== '') {
							await pagination
								.locator('a.vp-pagination__load-more')
								.click();
							await page.waitForTimeout(500);
						}
					}

					archiveItems = await getArchiveItems(page);
					break;
			}

			receivedCategories[categoryKey].items = archiveItems;

			categoryKey++;
		}

		return receivedCategories;
	}

	/**
	 * We create portfolio posts for the archives page.
	 * We fill these posts with pictures, titles, descriptions and other necessary meta data.
	 * We also set tags and categories.
	 *
	 * @param {Page}         page         Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {Admin}        admin        End to end test utilities for WordPress admin’s user interface.
	 * @param {Editor}       editor       End to end test utilities for the WordPress Block Editor.
	 * @param {RequestUtils} requestUtils Playwright utilities for interacting with the WordPress REST API.
	 */
	async function maybeCreatePortfolioPosts(
		page,
		admin,
		editor,
		requestUtils
	) {
		// Retrieve existing posts, categories, and tags
		const existingPosts = await requestUtils.rest({
			path: '/wp/v2/portfolio',
			params: {
				per_page: 100,
				status: 'publish,future,draft,pending,private,trash',
			},
		});

		// eslint-disable-next-line no-shadow
		async function getOrCreateTerm(name, type) {
			const endpoint =
				type === 'portfolio_category'
					? '/wp/v2/portfolio_category'
					: '/wp/v2/portfolio_tag';

			try {
				// Fetch existing terms
				const existingTerms = await requestUtils.rest({
					path: `${endpoint}?context=view`,
					params: { per_page: 100 },
				});

				// Ensure existingTerms is an array before proceeding
				if (!Array.isArray(existingTerms)) {
					throw new Error(
						`Failed to retrieve terms for taxonomy "${type}". Response: ${JSON.stringify(existingTerms)}`
					);
				}

				// Check if the term already exists
				let term = existingTerms.find(
					(t) => t.name.toLowerCase() === name.toLowerCase()
				);
				if (term) {
					console.log(
						`Term "${name}" already exists with ID: ${term.id}`
					);
					return term.id; // Return the existing term ID
				}

				// If the term doesn't exist, create it
				try {
					term = await requestUtils.rest({
						path: endpoint,
						method: 'POST',
						data: { name },
					});

					// Check if the term creation was successful
					if (term && term.id) {
						console.log(
							`Term "${name}" created successfully with ID: ${term.id}`
						);
						return term.id;
					}

					throw new Error(
						`Unexpected response while creating term "${name}": ${JSON.stringify(term)}`
					);
				} catch (error) {
					console.error(`Failed to create ${type} "${name}":`, error);
					return null;
				}
			} catch (error) {
				console.error(
					`Error retrieving or creating term "${name}":`,
					error
				);
				return null;
			}
		}

		// Function to check if a post exists
		const postExists = (title) => {
			return existingPosts.some((post) => post.title.rendered === title);
		};

		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
		});

		// Get the current date and time
		const currentDate = new Date();
		currentDate.setMinutes(currentDate.getMinutes() - 10);

		// Iterate over each post in the fixture
		for (const post of await portfolioPosts) {
			if (!postExists(post.title)) {
				// Get or create portfolio category and tag IDs
				const categoryIds = post.categories
					? await Promise.all(
							post.categories.map((name) =>
								getOrCreateTerm(name, 'portfolio_category')
							)
						)
					: [];
				const tagIds = post.tags
					? await Promise.all(
							post.tags.map((name) =>
								getOrCreateTerm(name, 'portfolio_tag')
							)
						)
					: [];

				const foundFixtureImage = await findAsyncSequential(
					imageFixtures,
					async (x) => x.postTitle === post.title
				);

				const foundImage = await findAsyncSequential(
					images,
					async (x) => x.description === foundFixtureImage.description
				);

				// Prepare data for new post
				const newPostData = {
					title: post.title,
					content: post.content,
					status: 'publish', // or 'draft' based on your needs
					portfolio_category: categoryIds.filter((id) => id), // Filter out nulls
					portfolio_tag: tagIds.filter((id) => id), // Filter out nulls
					featured_media: foundImage.id,
					date: currentDate.toISOString(),
				};

				// Create the post in WordPress
				try {
					await requestUtils.rest({
						path: '/wp/v2/portfolio',
						method: 'POST',
						data: newPostData,
					});
					console.log(`Post "${post.title}" created successfully.`);
				} catch (error) {
					console.error(
						`Failed to create post "${post.title}":`,
						error
					);
				}

				// Increment the date for the next post
				currentDate.setMinutes(currentDate.getMinutes() + 1);
			} else {
				console.log(`Post "${post.title}" already exists.`);
			}
		}
	}

	/**
	 * Configures permalink settings in a WordPress admin interface.
	 * Navigates to the permalink settings page, selects a specific permalink structure, and saves the changes.
	 *
	 * @param {Object} admin - The admin interface object for navigation.
	 * @param {Object} page  - The page interaction object, typically from a browser automation tool.
	 * @param {string} type  - The type of permalink structure to select.
	 */
	async function setPermalinkSettings(admin, page, type) {
		await admin.visitAdminPage('options-permalink.php');
		await page.getByLabel(type).check();
		await page.getByRole('button', { name: 'Save Changes' }).click();
		await page.waitForTimeout(2000);
	}

	/**
	 * Prepares fixture data by updating URLs to include a specific archive ID.
	 * Modifies pagination, item, and category URLs for testing purposes.
	 *
	 * @param {Array}  fixtureData - The fixture data to be prepared, containing pagination and item URLs.
	 * @param {string} archiveID   - The unique identifier for the archive to replace placeholder IDs.
	 * @param {string} testBaseUrl - The base URL for the test environment.
	 */
	async function prepareFixtures(fixtureData, archiveID, testBaseUrl) {
		let fixtureKey = 0;
		for (const expectedArchiveItem of fixtureData) {
			// Update pagination URLs if they exist
			if (Array.isArray(expectedArchiveItem.pagination)) {
				let paginationKey = 0;
				for (const expectedPaginationItem of expectedArchiveItem.pagination) {
					if (
						typeof expectedPaginationItem.url !== 'undefined' &&
						expectedPaginationItem.url !== ''
					) {
						const fixtureUrl =
							testBaseUrl + expectedPaginationItem.url;
						fixtureData[fixtureKey].pagination[paginationKey].url =
							fixtureUrl.replace(
								'/?page_id=0000',
								'/?page_id=' + archiveID
							);
					}
					paginationKey++;
				}
			}

			// Update item URLs
			let itemKey = 0;
			for (const expectedItem of expectedArchiveItem.items) {
				const fixtureUrl = testBaseUrl + expectedItem.url;
				fixtureData[fixtureKey].items[itemKey].url = fixtureUrl.replace(
					'/?page_id=000',
					'/?page_id=' + archiveID
				);
				itemKey++;
			}

			// Update category URLs if they exist
			if (expectedArchiveItem.url) {
				const fixtureUrl = testBaseUrl + expectedArchiveItem.url;
				fixtureData[fixtureKey].url = fixtureUrl.replace(
					'/?page_id=000',
					'/?page_id=' + archiveID
				);
			}

			fixtureKey++;
		}
	}

	test('check archive page with default pagination and category filter (plain permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await page.waitForTimeout(1500);
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
		await setPermalinkSettings(admin, page, 'Plain');
		await page.waitForTimeout(1500);

		const { archiveID, archiveUrl } = await createArchivePage(
			page,
			admin,
			editor
		);
		await setArchiveSettings(admin, page);

		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		await prepareFixtures(expectedArchiveDefault, archiveID, testBaseUrl);
		await prepareFixtures(
			expectedArchiveCategoryDefault,
			archiveID,
			testBaseUrl
		);

		await page.goto(archiveUrl);
		const receivedArchive = await getReceivedArchive(page);

		expect(receivedArchive).toEqual(expectedArchiveDefault);

		const receivedCategories = await getReceivedCategories(page);
		await page.waitForTimeout(500);

		expect(receivedCategories).toEqual(expectedArchiveCategoryDefault);

		await setPermalinkSettings(admin, page, 'Post name');
	});

	test('check archive page with default pagination and category filter (post name permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await page.waitForTimeout(1500);
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
		await page.waitForTimeout(1500);

		const { archiveUrl } = await createArchivePage(page, admin, editor);
		await setArchiveSettings(admin, page);

		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		await prepareFixtures(expectedArchivePostName, null, testBaseUrl);
		await prepareFixtures(
			expectedArchiveCategoryPostName,
			null,
			testBaseUrl
		);

		await page.goto(archiveUrl);
		const receivedArchive = await getReceivedArchive(page);

		expect(receivedArchive).toEqual(expectedArchivePostName);

		const receivedCategories = await getReceivedCategories(page);
		await page.waitForTimeout(500);

		expect(receivedCategories).toEqual(expectedArchiveCategoryPostName);
	});

	test('check archive page with load more pagination and category filter (plain permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await page.waitForTimeout(1500);
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
		await page.waitForTimeout(1500);
		await setPermalinkSettings(admin, page, 'Plain');

		const { archiveID, archiveUrl } = await createArchivePage(
			page,
			admin,
			editor,
			'loadMore'
		);
		await setArchiveSettings(admin, page);

		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		await prepareFixtures(
			expectedArchiveLoadMoreDefault,
			archiveID,
			testBaseUrl
		);
		await prepareFixtures(
			expectedArchiveCategoryLoadMoreDefault,
			archiveID,
			testBaseUrl
		);

		await page.goto(archiveUrl);
		const receivedArchive = await getReceivedArchive(page, 'loadMore');

		expect(receivedArchive).toEqual(expectedArchiveLoadMoreDefault);

		const receivedCategories = await getReceivedCategories(
			page,
			'loadMore'
		);
		await page.waitForTimeout(500);

		expect(receivedCategories).toEqual(
			expectedArchiveCategoryLoadMoreDefault
		);

		await setPermalinkSettings(admin, page, 'Post name');
	});

	test('check archive page with load more pagination and category filter (post name permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await page.waitForTimeout(1500);
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
		await page.waitForTimeout(1500);

		const { archiveUrl } = await createArchivePage(
			page,
			admin,
			editor,
			'loadMore'
		);
		await setArchiveSettings(admin, page);

		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		await prepareFixtures(
			expectedArchivePostNameLoadMore,
			null,
			testBaseUrl
		);
		await prepareFixtures(
			expectedArchiveCategoryLoadMorePostName,
			null,
			testBaseUrl
		);

		await page.goto(archiveUrl);
		const receivedArchive = await getReceivedArchive(page, 'loadMore');

		expect(receivedArchive).toEqual(expectedArchivePostNameLoadMore);

		const receivedCategories = await getReceivedCategories(
			page,
			'loadMore'
		);
		await page.waitForTimeout(500);

		expect(receivedCategories).toEqual(
			expectedArchiveCategoryLoadMorePostName
		);
	});

	test('check archive page with infinity pagination and category filter (plain permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await page.waitForTimeout(1500);
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
		await page.waitForTimeout(1500);
		await setPermalinkSettings(admin, page, 'Plain');

		const { archiveID, archiveUrl } = await createArchivePage(
			page,
			admin,
			editor,
			'inf'
		);
		await setArchiveSettings(admin, page);

		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		await prepareFixtures(
			expectedArchiveInfinityDefault,
			archiveID,
			testBaseUrl
		);
		await prepareFixtures(
			expectedArchiveCategoryInfinityDefault,
			archiveID,
			testBaseUrl
		);

		await page.goto(archiveUrl);
		const receivedArchive = await getReceivedArchive(page, 'inf');

		expect(receivedArchive).toEqual(expectedArchiveInfinityDefault);

		const receivedCategories = await getReceivedCategories(page, 'inf');
		await page.waitForTimeout(500);

		expect(receivedCategories).toEqual(
			expectedArchiveCategoryInfinityDefault
		);

		await setPermalinkSettings(admin, page, 'Post name');
	});

	test('check archive page with infinity pagination and category filter (post name permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await page.waitForTimeout(1500);
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
		await page.waitForTimeout(1500);

		const { archiveUrl } = await createArchivePage(
			page,
			admin,
			editor,
			'inf'
		);
		await setArchiveSettings(admin, page);

		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
		await prepareFixtures(
			expectedArchivePostNameInfinity,
			null,
			testBaseUrl
		);
		await prepareFixtures(
			expectedArchiveCategoryInfinityPostName,
			null,
			testBaseUrl
		);

		await page.goto(archiveUrl);
		const receivedArchive = await getReceivedArchive(page, 'inf');

		expect(receivedArchive).toEqual(expectedArchivePostNameInfinity);

		const receivedCategories = await getReceivedCategories(page, 'inf');
		await page.waitForTimeout(500);

		expect(receivedCategories).toEqual(
			expectedArchiveCategoryInfinityPostName
		);
	});
});
