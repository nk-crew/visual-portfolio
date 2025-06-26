import $ from 'jquery';

const $doc = $(document);

$doc.on('change', '.vp-block-sort select', (e) => {
	const $current = $(e.currentTarget);
	const $loop = $current.closest('.vp-block-loop');
	const $legacyBlock = $loop.find('.vp-portfolio');
	const vpf = $legacyBlock?.[0]?.vpf;

	if (!vpf) {
		return;
	}

	e.preventDefault();

	const value = $current.val();
	const $option = $current.find(`[value="${value}"]`);

	if ($option.length) {
		vpf.loadNewItems($option.attr('data-vp-url'), true);
	}
});
