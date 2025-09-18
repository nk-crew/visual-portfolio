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

const logsEnabled = process.env.LOGS || false;

test.describe('archive pages', () => {
	test.beforeEach(async ({ admin, page, requestUtils }) => {
		await setPermalinkSettings(admin, page, 'Post name');
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin(pluginName);
	});

	test.afterEach(async ({ requestUtils }) => {
		await Promise.all([
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		]);
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all([
			deleteAllPortfolioTaxonomies(requestUtils),
			deleteAllPortfolio({ requestUtils }),
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		]);
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
				path: `/wp/v2/${taxonomy}`,
				method: 'GET',
				params: {
					// Adjust as necessary for your needs
					per_page: 100,
					context: 'view',
					hide_empty: false,
				},
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
			'.vp-portfolio__ready .vp-portfolio__items article.vp-portfolio__item-wrap'
		);

		// Log the count of items found
		const itemCount = await items.count();

		if (logsEnabled) {
			console.log(`Found ${itemCount} items on the page`);
		}

		for (let i = 0; i < itemCount; i++) {
			try {
				const item = await items.nth(i);

				// Check if the element exists before waiting for visibility
				const imgExists = await item
					.locator('.vp-portfolio__item-img')
					.count();
				if (imgExists === 0) {
					if (logsEnabled) {
						console.log(`Image not found for item ${i + 1}`);
					}
					continue;
				}

				// Wait for the image to be visible with increased timeout
				try {
					await item.locator('.vp-portfolio__item-img').waitFor({
						state: 'visible',
						timeout: 1000, // Increased timeout
					});
				} catch (error) {
					console.log(
						`Image not visible for item ${i + 1}, skipping.`
					);
					continue;
				}

				const url = await item
					.locator('.vp-portfolio__item-img > a[href]')
					.getAttribute('href');

				const categoriesWrapper = item.locator(
					'.vp-portfolio__item-meta .vp-portfolio__item-meta-categories > .vp-portfolio__item-meta-category'
				);

				const categories = [];
				if (await categoriesWrapper.count()) {
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

				// Check if the title element exists before trying to get text
				const titleLocator = item.locator(
					'.vp-portfolio__item-meta-title > a'
				);
				const titleExists = await titleLocator.count();
				let title = '';
				if (titleExists > 0) {
					try {
						title = await titleLocator.innerText({
							timeout: 20000,
						}); // Increased timeout
					} catch (error) {
						console.log(
							`Title not visible for item ${i + 1}, skipping.`
						);
						continue;
					}
				} else {
					console.log(`Title not found for item ${i + 1}`);
					continue;
				}

				// Check if the description element exists and is visible
				const descriptionLocator = item.locator(
					'.vp-portfolio__item-meta-excerpt > div'
				);
				const descriptionExists = await descriptionLocator.count();
				let description = '';
				if (descriptionExists > 0) {
					try {
						// Attempt to get the description text
						description = await descriptionLocator.innerText({
							timeout: 1000,
						});
					} catch (error) {
						console.log(
							`Description not visible for item ${i + 1}, skipping description extraction.`
						);
					}
				} else if (logsEnabled) {
					console.log(`Description not found for item ${i + 1}`);
				}

				archiveItems.push({
					url,
					categories: categories.length > 0 ? categories : false,
					title,
					description,
				});

				if (logsEnabled) {
					console.log(`Extracted item: ${title}, URL: ${url}`);
				}
			} catch (error) {
				console.error('Error extracting item:', error);
			}
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
		await page.getByRole('option', { name: 'Portfolio' }).first().click();
		await page.getByLabel('Archive Page Items Per Page').fill('2');
		await page.getByRole('button', { name: 'Save Changes' }).click();
	}

	// This function ensures that the page is fully loaded before any data collection begins.
	async function awaitPageLoading(page) {
		// Ensure the page is fully loaded before collecting data
		await page.waitForSelector('.vp-portfolio__ready', {
			state: 'attached',
			timeout: 15000,
		});
		await page.waitForLoadState('networkidle');
		await page.waitForLoadState('domcontentloaded');
	}

	// This function handles pagination by clicking the appropriate button to content.
	async function clickToPagination(
		page,
		pagination,
		typePagination = 'paged'
	) {
		const button =
			typePagination === 'paged'
				? '.vp-pagination__item.vp-pagination__item-next > a'
				: 'a.vp-pagination__load-more';
		await Promise.all([
			page
				.waitForSelector('.vp-portfolio__ready', {
					state: 'detached',
					timeout: 500,
				})
				.catch(() => {
					/* ignore if it doesn’t detach */
				}),
			page.waitForSelector('.vp-portfolio__ready', {
				state: 'attached',
				timeout: 15000,
			}),
			pagination
				.locator(button)
				.click()
				.catch(() => {
					/* ignore if it doesn’t detach */
				}),
		]);
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
			// Ensure the page is fully loaded before collecting data
			await awaitPageLoading(page);

			const archiveItems = await getArchiveItems(page);

			if (logsEnabled) {
				console.log(
					`Page ${currentCount + 1}: Retrieved ${archiveItems.length} items`
				);
			}

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

			if (archiveItems.length > 0 && typePagination !== 'inf') {
				// Check for duplicates before adding
				for (const item of archiveItems) {
					if (
						!receivedArchive.some((existingItem) =>
							existingItem.items.some(
								(existing) => existing.url === item.url
							)
						)
					) {
						receivedArchive.push({
							items: archiveItems,
							pagination: archivePagination,
						});
					} else if (logsEnabled) {
						console.log(
							`Duplicate item detected: ${item.title}, URL: ${item.url}`
						);
					}
				}
			}

			currentCount++;

			const nextPageExists = await pagination
				.locator('.vp-pagination__item.vp-pagination__item-next > a')
				.isVisible();
			if (nextPageExists && typePagination === 'paged') {
				if (logsEnabled) {
					console.log('Navigating to the next page...');
				}

				try {
					// Click the next page button and immediately wait for the class to be detached and attached again
					await clickToPagination(page, pagination);

					if (logsEnabled) {
						console.log(`Navigated to page ${currentCount + 1}`);
					}
				} catch (error) {
					console.error('Error navigating to the next page:', error);
				}
			} else if (
				!nextPageExists &&
				typePagination !== 'paged' &&
				logsEnabled
			) {
				console.log('No more pages to navigate.');
			}

			if (
				(await pagination
					.locator('a.vp-pagination__load-more')
					.count()) &&
				(typePagination === 'loadMore' || typePagination === 'inf')
			) {
				await page.waitForSelector('a.vp-pagination__load-more', {
					state: 'visible',
				});

				await page
					.locator('a.vp-pagination__load-more')
					.scrollIntoViewIfNeeded();

				const nextPageAttribute = await pagination
					.locator('a.vp-pagination__load-more')
					.getAttribute('href');
				if (nextPageAttribute !== '') {
					try {
						if (logsEnabled) {
							console.log('Loading more items...');
						}

						await clickToPagination(
							page,
							pagination,
							typePagination
						);
					} catch (error) {
						console.error('Error clicking "Load More":', error);
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
			await Promise.all([
				awaitPageLoading(page),
				page
					.waitForSelector('.vp-portfolio__ready', {
						state: 'detached',
						timeout: 500,
					})
					.catch(() => {
						/* ignore if it doesn’t detach */
					}),
				page.waitForSelector('.vp-portfolio__ready', {
					state: 'attached',
					timeout: 15000,
				}),
				page
					.locator('.vp-filter .vp-filter__item')
					.filter({ hasText: category.title })
					.click(),
			]);

			const pagination = page.locator(
				'.vp-portfolio__layout-elements .vp-pagination'
			);

			let archiveItems = [];

			switch (typePagination) {
				case 'paged':
					archiveItems = await getArchiveItems(page);

					if (
						archiveItems.length === 2 &&
						(await pagination.count())
					) {
						await clickToPagination(page, pagination);

						await awaitPageLoading(page);

						archiveItems = archiveItems.concat(
							await getArchiveItems(page)
						);
					}
					break;
				case 'loadMore':
				case 'inf':
					if (
						await pagination
							.locator('a.vp-pagination__load-more')
							.count()
					) {
						const nextPageAttribute = await pagination
							.locator('a.vp-pagination__load-more')
							.getAttribute('href');
						if (nextPageAttribute !== '') {
							await clickToPagination(
								page,
								pagination,
								typePagination
							);

							await awaitPageLoading(page);
						}
					}

					// Wait for archiveItems to be filled
					while (archiveItems.length === 0) {
						await page.waitForTimeout(100); // Wait for 100ms before checking again
						archiveItems = (await getArchiveItems(page)) || [];
					}
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
		// Retry mechanism for REST API calls in case of an error.
		async function retryRequest(fn, retries = 3, delay = 1000) {
			for (let attempt = 1; attempt <= retries; attempt++) {
				try {
					return await fn();
				} catch (error) {
					if (attempt === retries) {
						throw error; // If it's the last attempt, rethrow the error
					}
					console.warn(
						`Attempt ${attempt} failed. Retrying in ${delay}ms...`,
						error
					);
					await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
				}
			}
		}

		// Retrieve existing posts, categories, and tags
		const existingPosts = await retryRequest(() =>
			requestUtils.rest({
				path: '/wp/v2/portfolio',
				params: {
					per_page: 100,
					status: 'publish,future,draft,pending,private,trash',
				},
			})
		);

		// eslint-disable-next-line no-shadow
		async function getOrCreateTerm(name, type) {
			const endpoint =
				type === 'portfolio_category'
					? '/wp/v2/portfolio_category'
					: '/wp/v2/portfolio_tag';

			try {
				const existingTerms = await retryRequest(() =>
					requestUtils.rest({
						path: endpoint,
						method: 'GET',
						params: {
							per_page: 100,
							context: 'view',
							hide_empty: false,
						},
					})
				);

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
					if (logsEnabled) {
						console.log(
							`Term "${name}" already exists with ID: ${term.id}`
						);
					}
					return term.id; // Return the existing term ID
				}

				// If the term doesn't exist, create it
				try {
					// Fetch existing terms with retry
					term = await retryRequest(() =>
						requestUtils.rest({
							path: endpoint,
							method: 'POST',
							data: { name },
						})
					);

					// Check if the term creation was successful
					if (term && term.id) {
						if (logsEnabled) {
							console.log(
								`Term "${name}" created successfully with ID: ${term.id}`
							);
						}
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
							post.categories.map(
								async (name) =>
									await getOrCreateTerm(
										name,
										'portfolio_category'
									)
							)
						)
					: [];
				const tagIds = post.tags
					? await Promise.all(
							post.tags.map(
								async (name) =>
									await getOrCreateTerm(name, 'portfolio_tag')
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
					await retryRequest(() =>
						requestUtils.rest({
							path: '/wp/v2/portfolio',
							method: 'POST',
							data: newPostData,
						})
					);

					console.log(`Post "${post.title}" created successfully.`);
				} catch (error) {
					console.error(
						`Failed to create post "${post.title}":`,
						error
					);
				}

				// Increment the date for the next post
				currentDate.setMinutes(currentDate.getMinutes() + 1);
			} else if (logsEnabled) {
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

				// Update category URLs if they exist
				if (Array.isArray(expectedItem.categories)) {
					let categoryKey = 0;
					for (const category of expectedItem.categories) {
						if (
							typeof category.categoryUrl !== 'undefined' &&
							category.categoryUrl !== ''
						) {
							const categoryUrl =
								testBaseUrl + category.categoryUrl;
							fixtureData[fixtureKey].items[itemKey].categories[
								categoryKey
							].categoryUrl = categoryUrl.replace(
								'/?page_id=0000',
								'/?page_id=' + archiveID
							);
						}
						categoryKey++;
					}
				}
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
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
		await setPermalinkSettings(admin, page, 'Plain');

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
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);

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

		expect(receivedCategories).toEqual(expectedArchiveCategoryPostName);
	});

	test('check archive page with load more pagination and category filter (plain permalinks)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await setPermalinkSettings(admin, page, 'Post name');
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
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
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);

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
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);
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
		await maybeCreatePortfolioPosts(page, admin, editor, requestUtils);

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

		expect(receivedCategories).toEqual(
			expectedArchiveCategoryInfinityPostName
		);
	});

	/**
	 * Validates RSS feed content against fixture content with flexible matching options.
	 *
	 * @param {string}  actualContent          - The actual RSS XML content.
	 * @param {string}  fixtureContent         - The expected RSS XML content from fixture.
	 * @param {Object}  options                - Validation options.
	 * @param {boolean} options.checkItemCount - Whether to check exact item count.
	 * @param {boolean} options.checkTitles    - Whether to check that expected titles are present.
	 */
	function validateRSSAgainstFixture(
		actualContent,
		fixtureContent,
		options = {}
	) {
		const actual = parseRSSFeed(actualContent);
		const expected = parseRSSFeed(fixtureContent);

		// Validate basic RSS structure
		expect(actual.title).toBeTruthy();
		expect(actual.link).toBeTruthy();

		// Check item count if requested
		if (options.checkItemCount) {
			expect(actual.items.length).toBe(expected.items.length);
		} else if (expected.items.length > 0) {
			// At least check that we have items if expected
			expect(actual.items.length).toBeGreaterThan(0);
		}

		// Check that expected titles are present (subset check)
		if (options.checkTitles && expected.items.length > 0) {
			const actualTitles = actual.items.map((item) => item.title);
			const expectedTitles = expected.items.map((item) => item.title);

			for (const title of expectedTitles) {
				expect(actualTitles).toContain(title);
			}
		}

		// Validate RSS structure for all items
		for (const item of actual.items) {
			expect(item.title).toBeTruthy();
			expect(item.description).toBeTruthy();
			expect(item.link).toBeTruthy();
			expect(item.pubDate).toBeTruthy();
			expect(item.guid).toBeTruthy();
		}
	}

	/**
	 * Parse RSS XML and extract feed data using simple regex-based parsing.
	 *
	 * @param {string} xmlContent - The RSS XML content to parse.
	 * @return {Object} Parsed RSS feed data.
	 */
	function parseRSSFeed(xmlContent) {
		// Simple RSS parser for testing using regex
		const items = [];

		// Extract channel info
		const titleMatch = xmlContent.match(/<title[^>]*>(.*?)<\/title>/);
		const descriptionMatch = xmlContent.match(
			/<description[^>]*>(.*?)<\/description>/
		);
		const linkMatch = xmlContent.match(/<link[^>]*>(.*?)<\/link>/);

		const title = titleMatch ? titleMatch[1].replace(/&[^;]+;/g, '') : '';
		const description = descriptionMatch
			? descriptionMatch[1].replace(/&[^;]+;/g, '')
			: '';
		const link = linkMatch ? linkMatch[1].replace(/&[^;]+;/g, '') : '';

		// Extract items
		const itemMatches = xmlContent.match(/<item>(.*?)<\/item>/gs);
		if (itemMatches) {
			for (const itemContent of itemMatches) {
				const itemTitleMatch = itemContent.match(
					/<title[^>]*>(.*?)<\/title>/
				);
				const itemDescriptionMatch = itemContent.match(
					/<description[^>]*>(.*?)<\/description>/
				);
				const itemLinkMatch = itemContent.match(
					/<link[^>]*>(.*?)<\/link>/
				);
				const itemPubDateMatch = itemContent.match(
					/<pubDate[^>]*>(.*?)<\/pubDate>/
				);
				const itemGuidMatch = itemContent.match(
					/<guid[^>]*>(.*?)<\/guid>/
				);

				items.push({
					title: itemTitleMatch
						? itemTitleMatch[1]
								.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
								.replace(/&[^;]+;/g, '')
						: '',
					description: itemDescriptionMatch
						? itemDescriptionMatch[1]
								.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
								.replace(/&[^;]+;/g, '')
						: '',
					link: itemLinkMatch
						? itemLinkMatch[1].replace(/&[^;]+;/g, '')
						: '',
					pubDate: itemPubDateMatch ? itemPubDateMatch[1] : '',
					guid: itemGuidMatch
						? itemGuidMatch[1].replace(/&[^;]+;/g, '')
						: '',
				});
			}
		}

		return {
			title,
			description,
			link,
			items,
		};
	}

	/**
	 * Creates a limited set of portfolio posts specifically for RSS feed testing.
	 *
	 * @param {Page}         page         Provides methods to interact with a single tab in a Browser.
	 * @param {Admin}        admin        End to end test utilities for WordPress admin's user interface.
	 * @param {Editor}       editor       End to end test utilities for the WordPress Block Editor.
	 * @param {RequestUtils} requestUtils Playwright utilities for interacting with the WordPress REST API.
	 */
	async function createPortfolioPostsForFeed(
		page,
		admin,
		editor,
		requestUtils
	) {
		// Retry mechanism for REST API calls
		async function retryRequest(fn, retries = 3, delay = 1000) {
			for (let attempt = 1; attempt <= retries; attempt++) {
				try {
					return await fn();
				} catch (error) {
					if (attempt === retries) {
						throw error;
					}
					if (logsEnabled) {
						console.warn(
							`Attempt ${attempt} failed. Retrying in ${delay}ms...`,
							error
						);
					}
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		// Get or create taxonomy terms
		async function getOrCreateTerm(name, type) {
			const endpoint =
				type === 'portfolio_category'
					? '/wp/v2/portfolio_category'
					: '/wp/v2/portfolio_tag';

			try {
				const existingTerms = await retryRequest(() =>
					requestUtils.rest({
						path: endpoint,
						method: 'GET',
						params: {
							per_page: 100,
							context: 'view',
							hide_empty: false,
						},
					})
				);

				if (!Array.isArray(existingTerms)) {
					throw new Error(
						`Failed to retrieve terms for taxonomy "${type}". Response: ${JSON.stringify(existingTerms)}`
					);
				}

				let term = existingTerms.find(
					(t) => t.name.toLowerCase() === name.toLowerCase()
				);
				if (term) {
					if (logsEnabled) {
						console.log(
							`Term "${name}" already exists with ID: ${term.id}`
						);
					}
					return term.id;
				}

				term = await retryRequest(() =>
					requestUtils.rest({
						path: endpoint,
						method: 'POST',
						data: { name },
					})
				);

				if (term && term.id) {
					if (logsEnabled) {
						console.log(
							`Term "${name}" created successfully with ID: ${term.id}`
						);
					}
					return term.id;
				}

				throw new Error(
					`Unexpected response while creating term "${name}": ${JSON.stringify(term)}`
				);
			} catch (error) {
				console.error(
					`Error retrieving or creating term "${name}":`,
					error
				);
				return null;
			}
		}

		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
		});

		const currentDate = new Date();
		currentDate.setMinutes(currentDate.getMinutes() - 10);

		// Create only first 3 posts for RSS feed test
		for (let i = 0; i < 3; i++) {
			const post = portfolioPosts[i];

			const categoryIds = post.categories
				? await Promise.all(
						post.categories.map(
							async (name) =>
								await getOrCreateTerm(
									name,
									'portfolio_category'
								)
						)
					)
				: [];
			const tagIds = post.tags
				? await Promise.all(
						post.tags.map(
							async (name) =>
								await getOrCreateTerm(name, 'portfolio_tag')
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

			const newPostData = {
				title: post.title,
				content: post.content,
				status: 'publish',
				portfolio_category: categoryIds.filter((id) => id),
				portfolio_tag: tagIds.filter((id) => id),
				featured_media: foundImage.id,
				date: currentDate.toISOString(),
			};

			try {
				await retryRequest(() =>
					requestUtils.rest({
						path: '/wp/v2/portfolio',
						method: 'POST',
						data: newPostData,
					})
				);

				if (logsEnabled) {
					console.log(`Post "${post.title}" created successfully.`);
				}
			} catch (error) {
				console.error(`Failed to create post "${post.title}":`, error);
			}

			currentDate.setMinutes(currentDate.getMinutes() + 1);
		}
	}

	test('should generate RSS feed for portfolio archive', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		// Create and configure archive page first
		const { archiveUrl } = await createArchivePage(page, admin, editor);
		await setArchiveSettings(admin, page);

		// Create portfolio posts
		await createPortfolioPostsForFeed(page, admin, editor, requestUtils);

		// Test the main portfolio RSS feed using archiveUrl
		const feedUrl = archiveUrl.replace(/\/$/, '') + '/feed/';

		const response = await page.goto(feedUrl);

		// Check if we get XML content
		const content = await response.text();

		// Basic XML validation
		expect(content).toContain('<?xml');
		expect(content).toContain('<rss');
		expect(content).toContain('<channel>');
		expect(content).toContain('</channel>');
		expect(content).toContain('</rss>');

		// Load expected RSS feed fixture
		const fs = require('fs');
		const path = require('path');
		const fixturePath = path.join(
			__dirname,
			'../../fixtures/archive/expected-rss-feed.xml'
		);
		const expectedContent = fs.readFileSync(fixturePath, 'utf8');

		if (logsEnabled) {
			console.log(
				'RSS feed content (first 1000 chars):',
				content.substring(0, 1000)
			);
			const feedData = parseRSSFeed(content);
			console.log(
				'RSS feed titles found:',
				feedData.items.map((item) => item.title)
			);
		}

		// Validate RSS feed against fixture
		validateRSSAgainstFixture(content, expectedContent, {
			checkTitles: true, // Check that expected titles are present
		});

		if (logsEnabled) {
			const feedData = parseRSSFeed(content);
			console.log('RSS Feed parsed successfully:', {
				title: feedData.title,
				itemCount: feedData.items.length,
				items: feedData.items.map((item) => item.title),
			});
		}
	});

	test('should generate RSS feed for portfolio category', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		// Create and configure archive page first
		const { archiveUrl } = await createArchivePage(page, admin, editor);
		await setArchiveSettings(admin, page);

		// Flush rewrite rules by visiting Permalinks page
		await admin.visitAdminPage('options-permalink.php');
		await page.getByRole('button', { name: 'Save Changes' }).click();

		// Create portfolio posts
		await createPortfolioPostsForFeed(page, admin, editor, requestUtils);

		// Test category RSS feed - extract base URL from archiveUrl
		const urlParts = new URL(archiveUrl);
		const baseUrl = `${urlParts.protocol}//${urlParts.host}`;
		const categoryFeedUrl = `${baseUrl}/portfolio-category/ocean/feed/`;

		// Use a direct fetch request instead of page.goto to avoid browser session issues
		// Try multiple times as category feeds may take longer to be ready
		let response;
		let content;
		let attempt = 0;
		const maxAttempts = 3;

		while (attempt < maxAttempts) {
			attempt++;
			response = await page.request.get(categoryFeedUrl);
			content = await response.text();

			if (logsEnabled) {
				console.log(
					`Category feed attempt ${attempt} - response status:`,
					response.status()
				);
				console.log(
					`Category feed attempt ${attempt} - content (first 200 chars):`,
					content.substring(0, 200)
				);
			}

			// If we get XML, break out of the retry loop
			if (
				content.includes('<?xml') &&
				!content.includes('<!DOCTYPE html>')
			) {
				break;
			}

			// Wait between attempts
			if (attempt < maxAttempts) {
				await page.waitForTimeout(2000);
			}
		}

		// Basic XML validation - if we still get HTML after retries, fail with clear message
		if (content.includes('<!DOCTYPE html>')) {
			throw new Error(
				`Expected RSS XML feed but got HTML page after ${maxAttempts} attempts. URL: ${categoryFeedUrl}`
			);
		}

		// Basic XML validation
		expect(content).toContain('<?xml');
		expect(content).toContain('<rss');
		expect(content).toContain('<channel>');

		// Load expected ocean category RSS feed fixture
		const fs = require('fs');
		const path = require('path');
		const fixturePath = path.join(
			__dirname,
			'../../fixtures/archive/expected-rss-feed-ocean-category.xml'
		);
		const expectedContent = fs.readFileSync(fixturePath, 'utf8');

		// Validate RSS feed against fixture
		validateRSSAgainstFixture(content, expectedContent, {
			checkTitles: true, // Check that expected ocean category titles are present
		});

		if (logsEnabled) {
			const feedData = parseRSSFeed(content);
			console.log('Category RSS Feed parsed successfully:', {
				title: feedData.title,
				itemCount: feedData.items.length,
				items: feedData.items.map((item) => item.title),
			});
		}
	});

	test('should handle RSS feed when no posts exist', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		// Delete any existing portfolio posts from previous tests
		await deleteAllPortfolio({ requestUtils });

		// Create and configure archive page first (but no posts)
		const { archiveUrl } = await createArchivePage(page, admin, editor);
		await setArchiveSettings(admin, page);
		// Test RSS feed with no portfolio posts using archiveUrl
		const feedUrl = archiveUrl.replace(/\/$/, '') + '/feed/';

		const response = await page.goto(feedUrl);

		// Check if we get valid XML even with no posts
		const content = await response.text();

		// Basic XML validation
		expect(content).toContain('<?xml');
		expect(content).toContain('<rss');
		expect(content).toContain('<channel>');
		expect(content).toContain('</channel>');
		expect(content).toContain('</rss>');

		// Load expected empty RSS feed fixture
		const fs = require('fs');
		const path = require('path');
		const fixturePath = path.join(
			__dirname,
			'../../fixtures/archive/expected-rss-feed-empty.xml'
		);
		const expectedContent = fs.readFileSync(fixturePath, 'utf8');

		// Validate RSS feed against fixture
		validateRSSAgainstFixture(content, expectedContent, {
			checkItemCount: true, // Should be exactly 0 items
		});

		if (logsEnabled) {
			const feedData = parseRSSFeed(content);
			console.log('Empty RSS Feed handled correctly:', {
				title: feedData.title,
				itemCount: feedData.items.length,
			});
		}
	});
});
