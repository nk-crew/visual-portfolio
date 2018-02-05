/*!
 * Name    : Visual Portfolio
 * Version : 1.2.1
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
    $body.on('focus', '[name="vp_list_shortcode"], [name="vp_filter_shortcode"]', function () {
        this.select();
    });
    $body.on('click', '.vp-onclick-selection', function () {
        window.getSelection().selectAllChildren(this);
    });

    // Post format metabox show/hide
    var $videoMetabox = $('#vp_format_video');
    var $videoFormatCheckbox = $('#post-format-video');
    function toggleVideoMetabox () {
        $videoMetabox[$videoFormatCheckbox.is(':checked') ? 'show' : 'hide']();
    }
    if ($videoMetabox.length && $videoFormatCheckbox.length) {
        toggleVideoMetabox();
        $body.on('change', '[name=post_format]', function () {
            toggleVideoMetabox();
        });
    }
    var oembedAjax = null;
    var oembedAjaxTimeout;
    $body.on('change input', '.vp-input[name="video_url"]', function () {
        if (oembedAjax !== null) {
            oembedAjax.abort();
        }

        var $this = $(this);
        $this.next('.vp-oembed-preview').html('');

        clearTimeout(oembedAjaxTimeout);
        oembedAjaxTimeout = setTimeout(function () {
            oembedAjax = $.ajax({
                url: ajaxurl,
                method: 'GET',
                dataType: 'json',
                data: {
                    action: 'vp_find_oembed',
                    q: $this.val(),
                    nonce: vpAdminVariables.nonce
                },
                complete: function (data) {
                    var json = data.responseJSON;
                    if (json && typeof json.html !== 'undefined') {
                        $this.next('.vp-oembed-preview').html(json.html);
                    }
                }
            });
        }, 250);
    });


    // Popper.js
    if ( typeof Tooltip !== 'undefined' ) {
        $('[data-hint]:not([data-hint=""]):not([data-hint="false"])').each(function () {
            var $this = $(this);
            new Tooltip(this, {
                placement: $this.attr('data-hint-place') || 'top',
                title: $this.attr('data-hint')
            });
        });
    }


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

    // range slider
    $('.vp-control-range').each(function () {
        var $inputs = $(this).find('input');
        var $hidden = $inputs.filter('[type="hidden"]');

        $inputs.on('change input', function (e) {
            $inputs.val( $(this).val() );
            $hidden.trigger('vp-fake-' + e.type);
        });
    });

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
    $editForm.on('change input vp-fake-change vp-fake-input', '[name*="vp_"]', function (e) {
        var $this = $(this);
        var data = {
            name: $this.attr('name'),
            value: $this.is('[type=checkbox], [type=radio]') ? $this.is(':checked') : $this.val(),
            reload: 'change' === e.type || 'vp-fake-change' === e.type,
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
    $body.on('click', '.vp-control-image-dropdown', function (e) {
        if (!$(e.target).closest('.vp-control-image-dropdown__content').length) {
            $(this).toggleClass('active');
        }
    });
    $body.on('mousedown', function (e) {
        var $select = $(e.target).closest('.vp-control-image-dropdown');
        var $all = $('.vp-control-image-dropdown.active');

        $all.each(function () {
            if (this === $select[0]) {
                return;
            }

            $(this).removeClass('active');
        });
    });
    $body.on('change', '.vp-control-image-dropdown .vp-image-picker', function (e) {
        var $this = $(this);
        var pickerData = $this.data('picker');

        if (pickerData) {
            var $selected = pickerData.select.find('option[value="' + pickerData.select.val() + '"]');
            var $optgroup = $selected.parent('optgroup');
            var $dropdown = $this.closest('.vp-control-image-dropdown');
            var src = $selected.attr('data-img-src');

            if ($dropdown.length) {
                $dropdown.children('.vp-control-image-dropdown__preview').html('<img src="' + src + '" alt="">');

                if ($optgroup.length) {
                    $dropdown.children('.vp-control-image-dropdown__title').html($optgroup.attr('label'));
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
            if ($this.closest('.vp-select2-posts-ajax').length) {
                var $postType = $this.attr('data-post-type') ? $($this.attr('data-post-type')) : false;
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
                                post_type: $postType ? $postType.val() : false,
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

                        var title = '';
                        if (data.title) {
                            title = data.title;
                        }

                        var post_type = '';
                        if (data.post_type) {
                            post_type = data.post_type;
                        }

                        var img = '';
                        if (data.img) {
                            img = 'style="background-image: url(\'' + data.img + '\');"';
                        }

                        return '<div class="vp-select2-ajax__result">' +
                                   '<div class="vp-select2-ajax__result-img" ' + img + '></div>' +
                                   '<div class="vp-select2-ajax__result-data">' +
                                       '<div class="vp-select2-ajax__result-title">' + title + '</div>' +
                                       '<div class="vp-select2-ajax__result-post-type">' + post_type + '</div>' +
                                   '</div>' +
                               '</div>';
                    },
                    templateSelection: function (repo) {
                        return repo.title || repo.text;
                    }
                }, opts);
            }

            // ajax taxonomies
            if ($this.closest('.vp-select2-taxonomies-ajax').length) {
                var $postType = $this.attr('data-post-type') ? $($this.attr('data-post-type')) : false;

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
    var $customCss = $('[name="vp_custom_css"]');
    var saveEditorWithErrors = false;

    // update editor error message
    var firstTimeEditorUpdate = true;
    function updateEditorError (errorAnnotations, editorChange) {
        if ( firstTimeEditorUpdate ) {
            editorChange = false;
            firstTimeEditorUpdate = false;
        }
        if (vpAdminVariables && vpAdminVariables['css_editor_error_notice']) {
            var message = false;

            if ( 1 === errorAnnotations.length ) {
                message = vpAdminVariables['css_editor_error_notice'].singular.replace( '%d', '1' );
            } else if ( errorAnnotations.length > 1 ) {
                message = vpAdminVariables['css_editor_error_notice'].plural.replace( '%d', String( errorAnnotations.length ) );
            }

            if (message) {
                var $notice = $customCss.prev('#vp_custom_css_notice');
                if ( ! $notice.length && ! editorChange ) {
                    $notice = $('<div class="notice notice-error inline" id="vp_custom_css_notice"></div>');
                    $customCss.before($notice);
                }

                if ( ! $notice.length ) {
                    return;
                }

                // add error notice
                var noticeText =  '<p class="notification-message">' + message + '</p>' +
                    '<p>' +
                    '<input id="vp_custom_css_notice_prevent" type="checkbox">' +
                    '<label for="vp_custom_css_notice_prevent">' + vpAdminVariables['css_editor_error_checkbox'] + '</label>' +
                    '</p>';

                $notice.html(noticeText);
            } else {

                // remove notice block if no errors
                $customCss.prev('#vp_custom_css_notice').remove();
            }
        }
    }

    if (typeof CodeMirror !== 'undefined' && $customCss.length) {
        // Hint with all available visual composer clasnames
        if (vpAdminVariables && vpAdminVariables.classnames) {
            var defaultCSShint = CodeMirror.hint.css;
            CodeMirror.hint.css = function(cm) {
                var cur = cm.getCursor();
                var inner = defaultCSShint(cm) || {from: cur, to: cm.getCursor(), list: []};

                var token = cm.getTokenAt(cur);
                if (token.state.state === 'top' && token.string.indexOf('.') === 0) {
                    inner = {
                        from: CodeMirror.Pos(cur.line, token.start),
                        to: CodeMirror.Pos(cur.line, token.end),
                        list: []
                    };
                    vpAdminVariables.classnames.forEach(function (val) {
                        if (val.indexOf(token.string) !== -1) {
                            inner.list.push(val);
                        }
                    });
                }
                return inner;
            };
        }

        var editor = CodeMirror.fromTextArea($customCss[0], {
            mode: 'css',
            theme: 'eclipse',
            indentUnit: 4,
            autoCloseTags: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            foldGutter: true,
            lint: {
                options: {
                    errors: true,
                    'box-model': true,
                    'display-property-grouping': true,
                    'duplicate-properties': true,
                    'known-properties': true,
                    'outline-none': true
                },

                // save errors in vcLintErrors object to prevent page save
                onUpdateLinting: function (annotations, annotationsSorted, cm) {
                    var errors = [];
                    annotations.forEach(function (annotation) {
                        if ('error' === annotation.severity) {
                            errors.push(annotation);
                        }
                    });
                    cm.vcLintErrors = errors;

                    if ( ! saveEditorWithErrors ) {
                        updateEditorError(cm.vcLintErrors, true);
                    }
                }
            },
            lineNumbers: true,
            lineWrapping: true,
            scrollPastEnd: true,
            emmet_active: true,
            emmet: true,
            styleActiveLine: true,
            continueComments: true,
            scrollbarStyle: 'simple',
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-\/": "toggleComment",
                "Cmd-\/": "toggleComment",
                "Alt-F": "findPersistent"
            },
            gutters: ['CodeMirror-lint-markers', 'CodeMirror-linenumbers', 'CodeMirror-foldgutter']
        });
        emmetCodeMirror(editor);

        // save instance in data
        $customCss.data('CodeMirrorInstance', editor);

        editor.on('change', function () {
            editor.save();
            $customCss.change();
        });

        // Autocomplete
        editor.on('keyup', function (cm, event) {
            var shouldAutocomplete;
            var isAlphaKey = /^[a-zA-Z]$/.test( event.key );
            var lineBeforeCursor;
            var token;

            if ( cm.state.completionActive && isAlphaKey ) {
                return;
            }

            // Prevent autocompletion in string literals or comments.
            token = cm.getTokenAt( cm.getCursor() );
            if ( 'string' === token.type || 'comment' === token.type ) {
                return;
            }

            lineBeforeCursor = cm.doc.getLine( cm.doc.getCursor().line ).substr( 0, cm.doc.getCursor().ch );
            shouldAutocomplete =
                isAlphaKey ||
                ':' === event.key ||
                ' ' === event.key && /:\s+$/.test( lineBeforeCursor );

            if ( shouldAutocomplete ) {
                cm.showHint( { completeSingle: false } );
            }
        });
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

    // prevent page save if there is errors in CSS editor
    $body.on('click', '#publish:not(.disabled)', function (e) {
        if ( saveEditorWithErrors ) {
            return;
        }

        var $publishBtn = $(this);

        var editor = $customCss.length && $customCss.data('CodeMirrorInstance');
        if (editor && editor.vcLintErrors && editor.vcLintErrors.length) {
            e.preventDefault();

            // disable publish button for 1.5 seconds
            $publishBtn.addClass('disabled button-disabled button-primary-disabled');
            setTimeout(function () {
                $publishBtn.removeClass('disabled button-disabled button-primary-disabled');
            }, 1500);

            updateEditorError(editor.vcLintErrors, false);

            // scroll to editor
            $('html,body').animate({
                scrollTop: $('#vp_custom_css').offset().top - 100
            }, 300);

            // scroll to editor with error
            editor.focus();
            editor.setCursor( editor.vcLintErrors[0].from.line );
        }
    });

    // save also if CSS have errors
    $body.on('change', '#vp_custom_css_notice_prevent', function () {
        saveEditorWithErrors = true;
        $(this).closest('.notice').slideUp();
    });

})(jQuery);