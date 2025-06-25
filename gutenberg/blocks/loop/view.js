import $ from 'jquery';

const $doc = $(document);

// Define the block selectors we need to replace after ajax loading.
const blockSelectors = [
	'.wp-block-visual-portfolio-filter-by-category',
	'.wp-block-visual-portfolio-sort',
	'.wp-block-visual-portfolio-pagination',
];

$doc.on('loadedNewItems.vpf', function (event, vpObject, $newVP) {
	if ('vpf' !== event.namespace) {
		return;
	}

	if (!vpObject.$item.hasClass('wp-block-visual-portfolio-loop')) {
		return;
	}

	// For each block type, find and replace them maintaining order
	blockSelectors.forEach((selector) => {
		const $currentBlocks = vpObject.$item.find(selector);
		const $newBlocks = $newVP.find(selector);

		// Replace each block in order
		$currentBlocks.each(function (index) {
			const $currentBlock = $(this);
			const $newBlock = $newBlocks.eq(index);

			// Only replace if we have a corresponding new block
			if ($newBlock.length) {
				$currentBlock.replaceWith($newBlock);
			}
		});
	});
});
