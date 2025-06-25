import $ from 'jquery';

const $doc = $(document);

$doc.on('change', '.wp-block-visual-portfolio-sort select', (e) => {
	const $current = $(e.currentTarget);
	const $loop = $current.closest('.wp-block-visual-portfolio-loop');
	const vpf = $loop?.[0]?.vpf;

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
