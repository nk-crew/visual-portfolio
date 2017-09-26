/*!
 * Name    : Visual Portfolio
 * Version : 1.1.2
 * Author  : nK https://nkdev.info
 */
(function ($) {
    "use strict";

    var $body = $('body');
    var $window = $(window);
    var $editForm = $('form[name="post"]');
    var $postType = $('[name="post_type"]');
    var post_ID = $('#post_ID').val();

    // select shortcode text in input
    $body.on('focus', '[name="vp_list_shortcode"]', function () {
        this.select();
    });
    $body.on('click', '.vp-onclick-selection', function () {
        window.getSelection().selectAllChildren(this);
    });

    // Activate code only in vp_lists page
    if ( 'vp_lists' !== $postType.val() || ! $editForm.length ) {
        return;
    }

    /**
     * Portfolio list creation
     */
    // content source
    var $contentSource = $('.vp-content-source');
    var $contentSourceInput = $contentSource.find('[name="vp_content_source"]');

    // activate content source
    $contentSource.on('click', '.vp-content-source__item', function () {
        var contentName = $(this).attr('data-content');
        $contentSource.find('[data-content="' + contentName + '"]').addClass('active').siblings().removeClass('active');
        $contentSourceInput.val(contentName).change();
    });
    $contentSource.children('[data-content="' + $contentSourceInput.val() + '"]').click();

    // enable conditionize
    if ($.fn.conditionize) {
        $editForm.conditionize();
    }

    // color picker
    if ($.fn.wpColorPicker) {
        $('.vp-color-picker').each(function () {
            var color_picker_timeout;
            var initialCall = true;
            function onChange (e, ui) {
                if (initialCall) {
                    initialCall = false;
                    return;
                }
                clearTimeout(color_picker_timeout);
                color_picker_timeout = setTimeout(function () {
                    $(e.target).change();
                }, 300);
            }
            $(this).data('change', onChange)
                .wpColorPicker()
        });
    }

    // image picker
    if ($.fn.imagepicker) {
        $('.vp-image-picker').imagepicker();
    }

    // rangeslider
    if ($.fn.rangeslider) {
        $('.vp-rangeslider').rangeslider({
            polyfill: false,
            onInit: function() {
                this.$handle.append('<span class="vp-rangeslider-handle-value">' + this.value + '</span>');
            },
            onSlide: function() {
                this.$handle.children('.vp-rangeslider-handle-value').text(this.value);
            }
        });
    }

    // frame load
    var $frame = $('.vp_list_preview iframe');
    var $framePortfolio = false;
    var frameJQuery = false;
    var $preview_form = $('<form target="vp_list_preview_iframe" method="post" style="display: none">')
            .attr('action', $frame.attr('src'))
            .insertAfter($editForm);

    // resize iframe
    if ( $.fn.iFrameResize ) {
        $frame.iFrameResize({
            interval: 10
        });
    }

    // portfolio options changed
    var reloadTimeout;
    $editForm.on('change input', '[name*="vp_"]', function (e) {
        var $this = $(this);
        var data = {
            name: $this.attr('name'),
            value: $this.is('[type=checkbox], [type=radio]') ? $this.is(':checked') : $this.val(),
            reload: 'change' === e.type,
            jQuery: frameJQuery,
            $portfolio: $framePortfolio
        };

        // create form input to store current changed data.
        var $input = $preview_form.find('[name="' + data.name + '"]');
        if ( ! $input.length ) {
            $input = $('<input type="hidden" name="' + data.name + '" />')
                .appendTo($preview_form)
        }
        $input.attr('value', data.value);

        $window.trigger('vp-preview-change', data);

        // reload frame
        if ( data.reload || ! $framePortfolio ) {
            clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(function () {
                frameJQuery = false;
                $framePortfolio = false;
                $preview_form.submit();
            }, 400);
        }
    });

    $frame.on('load', function () {
        frameJQuery = this.contentWindow.jQuery;
        $framePortfolio = frameJQuery('.vp-portfolio');
    });

    // live reload
    $window.on('vp-preview-change', function (e, data) {
        if ( ! data.$portfolio ) {
            return;
        }
        switch ( data.name ) {
            case 'vp_layout':
            case 'vp_tiles_type':
            case 'vp_masonry_columns':
            case 'vp_items_gap':
                var name = data.name;

                // remove vp_
                name = name.substring(3);

                // replace _ to -
                name = name.replace('_', '-');

                data.$portfolio.attr('data-vp-' + name, data.value);
                data.$portfolio.vp('init');
                data.reload = false;

                break;
            case 'vp_filter_align':
                data.$portfolio.find('.vp-filter').removeClass('vp-filter__align-center vp-filter__align-left vp-filter__align-right').addClass('vp-filter__align-' + data.value);
                data.reload = false;

                break;
            case 'vp_pagination_align':
                data.$portfolio.find('.vp-pagination').removeClass('vp-pagination__align-center vp-pagination__align-left vp-pagination__align-right').addClass('vp-pagination__align-' + data.value);
                data.reload = false;

                break;
            case 'vp_custom_css':
                var $html = data.$portfolio.closest('html');
                var custom_css_id = 'vp-custom-css-' + post_ID + '-inline-css';
                var $style = $html.find('#' + custom_css_id);
                if ( ! $style.length ) {
                    $style = data.jQuery('<style id="' + custom_css_id + '">');
                    $html.find('body').prepend($style);
                }
                $style.html(data.value);
                data.reload = false;

                break;

            // prevent some options reload
            case 'vp_list_name':
            case 'vp_stretch':
                data.reload = false;
                break;
        }
    });

    // vp_layout -> data-vp-layout
    // vp_tiles_type -> data-vp-tiles-type
    // vp_items_gap -> data-vp-items-gap

    // image dropdown
    $body.on('click', '.vp-image-dropdown', function (e) {
        if (!$(e.target).closest('.vp-image-dropdown__content').length) {
            $(this).toggleClass('active');
        }
    });
    $body.on('mousedown', function (e) {
        var $select = $(e.target).closest('.vp-image-dropdown');
        var $all = $('.vp-image-dropdown.active');

        $all.each(function () {
            if (this === $select[0]) {
                return;
            }

            $(this).removeClass('active');
        });
    });
    $body.on('change', '.vp-image-dropdown .vp-image-picker', function (e) {
        var $this = $(this);
        var pickerData = $this.data('picker');

        if (pickerData) {
            var $selected = pickerData.select.find('option[value="' + pickerData.select.val() + '"]');
            var $optgroup = $selected.parent('optgroup');
            var $dropdown = $this.closest('.vp-image-dropdown');
            var src = $selected.attr('data-img-src');

            if ($dropdown.length) {
                $dropdown.children('.vp-image-dropdown__preview').html('<img src="' + src + '" alt="">');

                if ($optgroup.length) {
                    $dropdown.children('.vp-image-dropdown__title').html($optgroup.attr('label'));
                }
            }
        }
    });

    // change shortcode name.
    var $listName = $('[name="vp_list_name"]');
    var $postTitle = $('[name="post_title"]');

    if ($listName.length && $postTitle.length) {
        $listName.on('input', function () {
            if ($postTitle.val() !== $listName.val()) {
                $postTitle.val($listName.val()).change();
            }
        });
        $postTitle.on('input', function () {
            $listName.val($postTitle.val());
        });
    }

    // enable select2
    if ($.fn.select2) {
        $('.vp-select2').each(function () {
            var $this = $(this);
            var opts = {
                width: '100%',
                minimumResultsForSearch: $this.hasClass('vp-select2-nosearch') ? -1 : 1
            };

            // ajax posts
            if ($this.hasClass('vp-select2-posts-ajax')) {
                opts = $.extend({
                    minimumInputLength: 1,
                    ajax: {
                        url: ajaxurl,
                        dataType: 'json',
                        delay: 250,
                        data: function (params) {
                            return {
                                action: 'vp_find_posts',
                                q: params.term,
                                post_type: $($this.attr('data-post-type')).val(),
                                nonce: vpAdminVariables.nonce
                            };
                        },
                        processResults: function (data) {
                            return {
                                results: data && data.length ? data : false
                            };
                        },
                        cache: true
                    },
                    escapeMarkup: function (markup) { return markup; },
                    templateResult: function (data) {
                        if (data.loading) return data.text;

                        return "<div class='vp-select2-ajax__result'>" +
                            "<div class='vp-select2-ajax__result-img'><img src='" + data.img + "' /></div>" +
                            "<div class='vp-select2-ajax__result-data'>" +
                            "<div class='vp-select2-ajax__result-title'>" + data.title + "</div>" +
                            "<div class='vp-select2-ajax__result-post-type'>" + data.post_type + "</div>" +
                            "</div>" +
                            "</div>";
                    },
                    templateSelection: function (repo) {
                        return repo.title || repo.text;
                    }
                }, opts);
            }

            // ajax taxonomies
            if ($this.hasClass('vp-select2-taxonomies-ajax')) {
                var $postType = $this.attr('data-post-type-from') ? $($this.attr('data-post-type-from')) : false;

                opts = $.extend({
                    minimumInputLength: 1,
                    ajax: {
                        url: ajaxurl,
                        dataType: 'json',
                        delay: 250,
                        data: function (params) {
                            return {
                                action: 'vp_find_taxonomies',
                                q: params.term,
                                post_type: $postType ? $postType.val() : false,
                                nonce: vpAdminVariables.nonce
                            };
                        },
                        processResults: function (data) {
                            var result = [];

                            if (data) {
                                for (var k in data) {
                                    result.push({
                                        'text': k,
                                        'children': data[k]
                                    })
                                }
                            }

                            return {
                                results: result
                            };
                        },
                        cache: true
                    }
                }, opts);
            }

            // init
            $this.select2(opts).data('select2').$dropdown.addClass('select2-vp-container');
        });
    }

    // codemirror
    if (typeof CodeMirror !== 'undefined') {
        var $customCss = $('[name="vp_custom_css"]');
        if ($customCss.length) {
            var editor = CodeMirror.fromTextArea($customCss[0], {
                lineNumbers: true,
                mode: 'css',
                theme: 'eclipse',
                indentUnit: 4,
                autoCloseTags: true,
                matchBrackets: true,
                foldGutter: true,
                lint: true,
                showCursorWhenSelecting: true,
                cursorScrollMargin: 30,
                autocomplete: true,
                autoCloseBrackets: true,
                lineWrapping: true,
                scrollPastEnd: true,
                emmet_active: true,
                emmet: true,
                scrollbarStyle: 'simple',
                gutters: ['CodeMirror-lint-markers', 'CodeMirror-linenumbers', 'CodeMirror-foldgutter']
            });
            emmetCodeMirror(editor);
            editor.on('change', function (cm) {
                editor.save();
                $customCss.change();
            });
        }
    }

    // prevent page closing
    var defaultForm = $editForm.serialize();
    $(window).on('beforeunload', function () {
        var isChanged = defaultForm !== $editForm.serialize();
        var isFormSent = $('[type=submit]').hasClass('disabled');
        if (isChanged && !isFormSent) {
            return true;
        }
    });

})(jQuery);