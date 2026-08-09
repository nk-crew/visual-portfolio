import $ from 'jquery';

const { ajaxurl, VPAdminVariables } = window;

// multiple select with AJAX search
$('select[name="vp_general[portfolio_archive_page]"]').select2({
	ajax: {
		url: ajaxurl, // AJAX URL is predefined in WordPress admin
		dataType: 'json',
		delay: 250, // delay in ms while typing when to perform a AJAX search
		data(params) {
			return {
				q: params.term, // search query
				selected: this[0].value,
				nonce: VPAdminVariables.nonce,
				action: 'vp_get_pages_list', // AJAX action for admin-ajax.php
			};
		},
		processResults(ajaxData) {
			const options = [];
			const data = this.$element.select2('data');
			let alreadyAddedID = false;

			// add selected value.
			if (data && data[0] && data[0].selected) {
				alreadyAddedID = Number(data[0].id);
				options.push({
					id: alreadyAddedID,
					text: data[0].text,
				});
			}

			// parse new options.
			if (ajaxData) {
				// ajaxData is the array of arrays, and each of them contains ID and the Label of the option
				$.each(ajaxData, (index, itemData) => {
					if (!alreadyAddedID || alreadyAddedID !== itemData[0]) {
						options.push({
							id: itemData[0],
							text: itemData[1],
						});
					}
				});
			}

			return {
				results: options,
			};
		},
		cache: true,
	},
});
