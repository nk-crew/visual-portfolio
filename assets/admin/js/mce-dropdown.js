const { tinymce, VPTinyMCEData } = window;

if (typeof VPTinyMCEData !== 'undefined' && VPTinyMCEData.layouts.length) {
	const options = [
		{
			text: '',
			value: '',
		},
	];

	Object.keys(VPTinyMCEData.layouts).forEach((k) => {
		options.push({
			text: VPTinyMCEData.layouts[k].title,
			value: VPTinyMCEData.layouts[k].id,
		});
	});

	tinymce.create('tinymce.plugins.visual_portfolio', {
		init(editor) {
			editor.addButton('visual_portfolio', {
				type: 'listbox',
				title: VPTinyMCEData.plugin_name,
				icon: 'visual-portfolio',
				classes: 'visual-portfolio-btn',
				onclick() {
					if (this.menu) {
						this.menu.$el.find('.mce-first').hide();
					}
				},
				onselect() {
					if (this.value()) {
						editor.insertContent(
							`[visual_portfolio id="${this.value()}"]`
						);
					}
					this.value('');
				},
				values: options,
				value: '',
			});
		},
	});

	tinymce.PluginManager.add(
		'visual_portfolio',
		tinymce.plugins.visual_portfolio
	);
}
