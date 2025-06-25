import $ from 'jquery';

const $doc = $(document);

$doc.on('click', '.wp-block-visual-portfolio-filter-by-category a', (e) => {
	const $current = $(e.currentTarget);
	const $loop = $current.closest('.wp-block-visual-portfolio-loop');
	const vpf = $loop?.[0]?.vpf;

	if (!vpf) {
		return;
	}

	e.preventDefault();

	vpf.loadNewItems($current.attr('href'), true);
});
