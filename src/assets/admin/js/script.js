/*!
 * Name    : Visual Portfolio
 * Version : 1.0.0
 * Author  : _nK https://nkdev.info
 */
(function ($) {
    "use strict";

    var $body = $('body');
    var $editForm = $('form[name="post"]');
    var $postType = $('[name="post_type"]');

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
        $contentSourceInput.val(contentName);
    });
    $contentSource.children('[data-content="' + $contentSourceInput.val() + '"]').click();

    // select shortcode text in input
    $body.on('focus', '[name="vp_list_shortcode"]', function () {
       this.select();
    });
    $body.on('click', 'td.vp_lists_post_shortcode', function () {
        window.getSelection().selectAllChildren(this);
    });

    // enable conditionize
    if ('vp_lists' === $postType.val() && $editForm.length && $.fn.conditionize) {
        $editForm.conditionize();
    }

    // color picker
    if ($.fn.wpColorPicker) {
        $('.vp-color-picker').wpColorPicker();
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

    // reinit portfolio on options change
    var $preview = $('.vp_list_preview > .vp-portfolio');
    $('[name=vp_layout], [name=vp_tiles_type], [name=vp_masonry_columns], [name=vp_items_gap]').on('change input', function () {
        var name = $(this).attr('name');

        // remove vp_
        name = name.substring(3);

        // replace _ to -
        name = name.replace('_', '-');

        $preview.attr('data-vp-' + name, this.value);
        $preview.vp('init');
    });
    $('[name=vp_filter_align]').on('change', function () {
        $preview.find('.vp-filter').removeClass('vp-filter__align-center vp-filter__align-left vp-filter__align-right').addClass('vp-filter__align-' + this.value);
    });
    $('[name=vp_pagination_align]').on('change', function () {
        $preview.find('.vp-pagination').removeClass('vp-pagination__align-center vp-pagination__align-left vp-pagination__align-right').addClass('vp-pagination__align-' + this.value);
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

    // prevent page closing
    if ('vp_lists' === $postType.val() && $editForm.length) {
        var defaultForm = $editForm.serialize();

        $(window).on('beforeunload', function () {
            var isChanged = defaultForm !== $editForm.serialize();
            var isFormSent = $('[type=submit]').hasClass('disabled');
            if (isChanged && !isFormSent) {
                return true;
            }
        });
    }

})(jQuery);