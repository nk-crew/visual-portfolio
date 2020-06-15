/*
 * External dependencies.
 */
import isNumber from 'is-number';

/*
 * Visual Portfolio plugin Swiper extension.
 */
const $ = window.jQuery;

const {
    screenSizes,
} = window.VPData;

// Extend VP class.
$( document ).on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Init Swiper plugin
     *
     * @param {mixed} options - slider options.
     */
    VP.prototype.initSwiper = function( options = false ) {
        const self = this;

        if ( 'slider' === self.options.layout && 'undefined' !== typeof window.Swiper ) {
            const $parent = self.$items_wrap.parent();

            $parent.addClass( 'swiper-container' );
            self.$items_wrap.addClass( 'swiper-wrapper' );
            self.$items_wrap.children().addClass( 'swiper-slide' );

            // calculate responsive.
            let slidesPerView = self.options.sliderSlidesPerView || 3;
            const breakPoints = {};

            if ( 'fade' === self.options.sliderEffect ) {
                slidesPerView = 1;
            }

            if ( isNumber( slidesPerView ) ) {
                let count = slidesPerView;
                let currentPoint = Math.min( screenSizes.length - 1, count - 1 );

                for ( ; 0 <= currentPoint; currentPoint -= 1 ) {
                    if ( 0 < count && 'undefined' !== typeof screenSizes[ currentPoint ] ) {
                        breakPoints[ screenSizes[ currentPoint ] + 1 ] = {
                            slidesPerView: count,
                        };
                    }
                    count -= 1;
                }

                slidesPerView = count || 1;
            }

            options = options || {
                speed: ( parseFloat( self.options.sliderSpeed ) || 0 ) * 1000,
                autoHeight: 'auto' === self.options.sliderItemsHeight,
                effect: self.options.sliderEffect || 'slide',
                spaceBetween: parseFloat( self.options.itemsGap ) || 0,
                centeredSlides: 'true' === self.options.sliderCenteredSlides,
                freeMode: 'true' === self.options.sliderFreeMode,
                freeModeSticky: 'true' === self.options.sliderFreeModeSticky,
                loop: 'true' === self.options.sliderLoop,
                autoplay: 0 < parseFloat( self.options.sliderAutoplay ) && {
                    delay: parseFloat( self.options.sliderAutoplay ) * 1000,
                    disableOnInteraction: false,
                },
                navigation: 'true' === self.options.sliderArrows && {
                    nextEl: '.vp-portfolio__items-arrow-next',
                    prevEl: '.vp-portfolio__items-arrow-prev',
                },
                pagination: 'true' === self.options.sliderBullets && {
                    el: '.vp-portfolio__items-bullets',
                    clickable: true,
                    dynamicBullets: 'true' === self.options.sliderBulletsDynamic,
                    renderBullet( index, className ) {
                        return `<span class="${ className }" data-bullet-index="${ index }" data-bullet-number="${ index + 1 }"></span>`;
                    },
                },
                mousewheel: 'true' === self.options.sliderMousewheel,
                slidesPerView,
                breakpoints: breakPoints,
                // Since Swiper 5.0 this option is removed and it is `true` by default, but in older versions it was `false`.
                // So we need to keep it as a fallback.
                breakpointsInverse: true,
                keyboard: true,
                grabCursor: true,
            };

            // fix fade items collapse (mostly in Default items style).
            if ( 'fade' === options.effect ) {
                options.fadeEffect = { crossFade: true };
            }

            // fix first load slide position (seems like a conflict with lazySizes)
            // issue: https://github.com/nk-o/visual-portfolio/issues/54
            if ( 0 === options.speed ) {
                options.speed = 1;
            }
            let positionFix = 0;
            options.on = {
                transitionEnd() {
                    if ( 0 === positionFix ) {
                        positionFix = 1;
                        this.setTransition( 1 );
                        this.setTranslate( this.translate + 0.1 );
                    } else if ( 1 === positionFix ) {
                        positionFix = 2;
                        this.slideReset();
                    }
                },
            };

            self.emitEvent( 'beforeInitSwiper', [ options ] );

            // thumbnails.
            if ( self.$slider_thumbnails_wrap.length ) {
                const $thumbsParent = self.$slider_thumbnails_wrap.parent();

                $thumbsParent.addClass( 'swiper-container' );
                self.$slider_thumbnails_wrap.addClass( 'swiper-wrapper' );
                self.$slider_thumbnails_wrap.children().addClass( 'swiper-slide' );

                // calculate responsive.
                let thumbnailsPerView = self.options.sliderThumbnailsPerView || 8;
                const thumbnailsBreakPoints = {};

                if ( isNumber( thumbnailsPerView ) ) {
                    let count = thumbnailsPerView;
                    let currentPoint = Math.min( screenSizes.length - 1, count - 1 );

                    for ( ; 0 <= currentPoint; currentPoint -= 1 ) {
                        if ( 0 < count && 'undefined' !== typeof screenSizes[ currentPoint ] ) {
                            thumbnailsBreakPoints[ screenSizes[ currentPoint ] + 1 ] = {
                                slidesPerView: count,
                            };
                        }
                        count -= 1;
                    }

                    thumbnailsPerView = count || 1;
                }

                const swiperThumbs = new window.Swiper( $thumbsParent[ 0 ], {
                    autoHeight: 'auto' === self.options.sliderThumbnailsHeight,
                    effect: 'slide',
                    spaceBetween: parseFloat( self.options.sliderThumbnailsGap ) || 0,
                    loop: false,
                    freeMode: true,
                    freeModeSticky: true,
                    loopedSlides: 5,
                    slidesPerView: thumbnailsPerView,
                    breakpoints: thumbnailsBreakPoints,
                    // Since Swiper 5.0 this option is removed and it is `true` by default, but in older versions it was `false`.
                    // So we need to keep it as a fallback.
                    breakpointsInverse: true,
                    keyboard: true,
                    grabCursor: true,
                    watchSlidesVisibility: true,
                    watchSlidesProgress: true,
                } );

                options.thumbs = {
                    swiper: swiperThumbs,
                };
            }

            // init swiper.
            // eslint-disable-next-line no-new
            new window.Swiper( $parent[ 0 ], options );

            // autoplay hover pause.
            if ( 'true' === self.options.sliderAutoplayHoverPause && 0 < parseFloat( self.options.sliderAutoplay ) ) {
                self.$item.on( `mouseenter.vpf-uid-${ self.uid }`, '.swiper-container', () => {
                    $parent[ 0 ].swiper.autoplay.stop();
                } );
                self.$item.on( `mouseleave.vpf-uid-${ self.uid }`, '.swiper-container', () => {
                    $parent[ 0 ].swiper.autoplay.start();
                } );
            }

            self.emitEvent( 'initSwiper', [ options ] );
        }
    };

    /**
     * Destroy Swiper plugin
     */
    VP.prototype.destroySwiper = function() {
        const self = this;
        const $parent = self.$items_wrap.parent();
        const $thumbsParent = self.$slider_thumbnails_wrap.length ? self.$slider_thumbnails_wrap.parent() : false;

        const SliderSwiper = $parent[ 0 ].swiper;
        const ThumbsSwiper = $thumbsParent ? $thumbsParent[ 0 ].swiper : false;

        let isDestroyed = false;

        // Thumbnails.
        if ( ThumbsSwiper ) {
            ThumbsSwiper.destroy();

            $thumbsParent.removeClass( 'swiper-container' );
            self.$slider_thumbnails_wrap.removeClass( 'swiper-wrapper' );
            self.$slider_thumbnails_wrap.children().removeClass( 'swiper-slide' );

            isDestroyed = true;
        }

        // Slider.
        if ( SliderSwiper ) {
            SliderSwiper.destroy();

            $parent.removeClass( 'swiper-container' );
            self.$items_wrap.removeClass( 'swiper-wrapper' );
            self.$items_wrap.children().removeClass( 'swiper-slide' );

            $parent.find( '.vp-portfolio__items-bullets' ).html( '' );

            isDestroyed = true;
        }

        if ( isDestroyed ) {
            self.emitEvent( 'destroySwiper' );
        }
    };
} );

// Add Items.
$( document ).on( 'addItems.vpf', ( event, self, $items, removeExisting, $newVP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    const Swiper = self.$items_wrap.parent()[ 0 ].swiper;

    if ( ! Swiper ) {
        return;
    }

    // Slider.
    {
        if ( removeExisting ) {
            Swiper.removeAllSlides();
        }

        const appendArr = [];
        $items.addClass( 'swiper-slide' ).each( function() {
            appendArr.push( this );
        } );
        Swiper.appendSlide( appendArr );
    }

    // Thumbnails.
    const ThumbsSwiper = self.$slider_thumbnails_wrap.length ? self.$slider_thumbnails_wrap.parent()[ 0 ].swiper : false;
    if ( ThumbsSwiper ) {
        if ( removeExisting ) {
            ThumbsSwiper.removeAllSlides();
        }

        const appendArr = [];
        $newVP.find( '.vp-portfolio__thumbnails > .vp-portfolio__thumbnail-wrap' )
            .clone()
            .addClass( 'swiper-slide' )
            .each( function() {
                appendArr.push( this );
            } );
        ThumbsSwiper.appendSlide( appendArr );
    }
} );

// Init.
$( document ).on( 'init.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.initSwiper();
} );

// Destroy.
$( document ).on( 'destroy.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.destroySwiper();
} );
