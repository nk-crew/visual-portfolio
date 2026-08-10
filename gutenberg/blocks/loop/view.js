import $ from 'jquery';

const $doc = $(document);

const LIVE_REGION_CLASS = 'vp-block-loop-live-region';

// Define the block selectors we need to replace after ajax loading.
const blockSelectors = [
	'.vp-block-filter-by-category',
	'.vp-block-sort',
	'.vp-block-pagination',
];

/**
 * Announce AJAX updates to screen readers.
 *
 * A live region is only announced when its content changes while it is already
 * in the document, so every loop gets one up front.
 */
function initLiveRegions() {
	$('.vp-block-loop').each(function () {
		const $loop = $(this);

		if ($loop.children(`.${LIVE_REGION_CLASS}`).length) {
			return;
		}

		$loop.append(
			$('<div />', {
				class: `${LIVE_REGION_CLASS} vp-screen-reader-text`,
				'aria-live': 'polite',
				'aria-atomic': 'true',
			})
		);
	});
}

$(initLiveRegions);
$doc.on('init.vpf', initLiveRegions);

$doc.on('loadedNewItems.vpf', (event, vpObject, $newVP) => {
	if ('vpf' !== event.namespace) {
		return;
	}

	const $currentLoop = vpObject.$item.closest('.vp-block-loop');

	if (!$currentLoop.length) {
		return;
	}

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

	const message = window.VPData?.__?.loop_items_updated;

	if (message) {
		$currentLoop.children(`.${LIVE_REGION_CLASS}`).text(message);
	}

	// The blocks above listen to this to re-attach to their new markup.
	$currentLoop.trigger('replacedLoopBlocks.vpf', [vpObject]);
});
