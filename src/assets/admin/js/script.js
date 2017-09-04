(function ($) {
   "use strict";

   var $body = $('body');

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

    // enable conditionize
    $contentSource.conditionize();

    // image picker
    $('.vp-image-picker').imagepicker();

    // rangeslider
    $('.vp-rangeslider').rangeslider({
        polyfill: false,
        onInit: function() {
            this.$handle.append('<span class="vp-rangeslider-handle-value">' + this.value + '</span>');
        },
        onSlide: function() {
            this.$handle.children('.vp-rangeslider-handle-value').text(this.value);
        }
    });

    // reinit portfolio on options change
    var $preview = $('.vp_list_preview > .vp-portfolio');
    $('[name=vp_list_layout]').on('change', function () {
        $preview.attr('data-vp-layout', this.value);
        $preview.vp('init');
    });
    $('[name=vp_list_gap]').on('change input', function () {
        $preview.attr('data-vp-items-gap', this.value);
        $preview.vp('init');
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

    // prevent page closing
    var $editForm = $('form[name="post"]');
    var $postType = $('[name="post_type"]');
    if ('visual-portfolios' === $postType.val() && $editForm.length) {
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