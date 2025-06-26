import $ from 'jquery';

const $doc = $(document);

// Define the block selectors we need to replace after ajax loading.
const blockSelectors = [
	'.vp-block-filter-by-category',
	'.vp-block-sort',
	'.vp-block-pagination',
];

$doc.on('loadedNewItems.vpf', function (event, vpObject, $newVP) {
	if ('vpf' !== event.namespace) {
		return;
	}

	if (!vpObject.$item.closest('.vp-block-loop').length) {
		return;
	}

	const $currentLoop = vpObject.$item.closest('.vp-block-loop');
	const $newLoop = $newVP.closest('.vp-block-loop');

	// For each block type, find and replace them maintaining order
	blockSelectors.forEach((selector) => {
		const $currentBlocks = $currentLoop.find(selector);
		const $newBlocks = $newLoop.find(selector);

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
