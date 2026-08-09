import $ from 'jquery';

const $doc = $(document);

$doc.on('click', '.vp-block-filter-by-category a', (e) => {
	const $current = $(e.currentTarget);
	const $loop = $current.closest('.vp-block-loop');
	const $legacyBlock = $loop.find('.vp-portfolio');
	const vpf = $legacyBlock?.[0]?.vpf;

	if (!vpf) {
		return;
	}

	e.preventDefault();

	vpf.loadNewItems($current.attr('href'), true);
});
