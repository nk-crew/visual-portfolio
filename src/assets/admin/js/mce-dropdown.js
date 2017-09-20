
(function($) {
    if (typeof Visual_Portfolio_TinyMCE_Options === 'undefined' || ! Visual_Portfolio_TinyMCE_Options.length) {
        return;
    }
    var options = [{
        text: '',
        value: ''
    }];

    for (var k in Visual_Portfolio_TinyMCE_Options) {
        options.push({
            text: Visual_Portfolio_TinyMCE_Options[k].title,
            value: Visual_Portfolio_TinyMCE_Options[k].id
        });
    }

    tinymce.create('tinymce.plugins.visual_portfolio', {
        init : function(editor, url) {
            editor.addButton('visual_portfolio', {
                type: 'listbox',
                title : 'Visual Portfolio',
                icon: 'visual-portfolio',
                classes: 'visual-portfolio-btn',
                onclick: function () {
                    if (this.menu) {
                        this.menu.$el.find('.mce-first').hide()
                    }
                },
                onselect: function() {
                    if ( this.value() ) {
                        editor.insertContent('[visual_portfolio id="' + this.value() + '"]');
                    }
                    this.value('');
                },
                values: options,
                value: ''
            });
        }
    });

    tinymce.PluginManager.add('visual_portfolio', tinymce.plugins.visual_portfolio);
})(jQuery);