!function(){"use strict";var e={n:function(n){var o=n&&n.__esModule?function(){return n.default}:function(){return n};return e.d(o,{a:o}),o},d:function(n,o){for(var t in o)e.o(o,t)&&!e.o(n,t)&&Object.defineProperty(n,t,{enumerable:!0,get:o[t]})},o:function(e,n){return Object.prototype.hasOwnProperty.call(e,n)}},n=window.jQuery,o=e.n(n);let t;try{t=new Event("jetpack-lazy-images-load",{bubbles:!0,cancelable:!0})}catch(e){t=document.createEvent("Event"),t.initEvent("jetpack-lazy-images-load",!0,!0)}o()(document).on("loadedNewItems.vpf",(function(e){"vpf"===e.namespace&&o()("body").get(0).dispatchEvent(t)}));const i=(200,function(e,n,o){var t,i=o||{},a=i.noTrailing,c=void 0!==a&&a,r=i.noLeading,d=void 0!==r&&r,u=i.debounceMode,v=void 0===u?void 0:u,l=!1,f=0;function p(){t&&clearTimeout(t)}function s(){for(var o=arguments.length,i=new Array(o),a=0;a<o;a++)i[a]=arguments[a];var r=this,u=Date.now()-f;function s(){f=Date.now(),n.apply(r,i)}function m(){t=void 0}l||(d||!v||t||s(),p(),void 0===v&&u>e?d?(f=Date.now(),c||(t=setTimeout(v?m:s,e))):s():!0!==c&&(t=setTimeout(v?m:s,void 0===v?e-u:e)))}return s.cancel=function(e){var n=(e||{}).upcomingOnly,o=void 0!==n&&n;p(),l=!o},s}(200,(e=>{e.vpf("imagesLoaded")}),{debounceMode:!1!==(void 0!==(a={}.atBegin)&&a)}));var a;o()(document.body).on("jetpack-lazy-loaded-image",".vp-portfolio",(function(){const e=o()(this).closest(".vp-portfolio");e&&e.length&&i(e)}))}();