(()=>{"use strict";var o={n:t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return o.d(e,{a:e}),e},d:(t,e)=>{for(var i in e)o.o(e,i)&&!o.o(t,i)&&Object.defineProperty(t,i,{enumerable:!0,get:e[i]})},o:(o,t)=>Object.prototype.hasOwnProperty.call(o,t)};const t=window.jQuery;var e=o.n(t);const i=function(o){var t=[],e=null,i=function(){for(var i=arguments.length,n=new Array(i),p=0;p<i;p++)n[p]=arguments[p];t=n,e||(e=requestAnimationFrame((function(){e=null,o.apply(void 0,t)})))};return i.cancel=function(){e&&(cancelAnimationFrame(e),e=null)},i};function n(o,t,e){var i,n=e||{},p=n.noTrailing,s=void 0!==p&&p,a=n.noLeading,r=void 0!==a&&a,d=n.debounceMode,f=void 0===d?void 0:d,v=!1,u=0;function c(){i&&clearTimeout(i)}function m(){for(var e=arguments.length,n=new Array(e),p=0;p<e;p++)n[p]=arguments[p];var a=this,d=Date.now()-u;function m(){u=Date.now(),t.apply(a,n)}function l(){i=void 0}v||(r||!f||i||m(),c(),void 0===f&&d>o?r?(u=Date.now(),s||(i=setTimeout(f?l:m,o))):m():!0!==s&&(i=setTimeout(f?l:m,void 0===f?o-d:o)))}return m.cancel=function(o){var t=(o||{}).upcomingOnly,e=void 0!==t&&t;c(),v=!e},m}const{getComputedStyle:p}=window,s=e()(window),a=e()(document),r=["tiles","masonry","grid"];var d;a.on("extendClass.vpf",((o,t)=>{"vpf"===o.namespace&&(t.prototype.initIsotope=function(o){const t=this;if(t.$items_wrap.isotope&&r.includes(t.options.layout)){const e="rtl"===p(t.$items_wrap[0]).direction,i=o||{itemSelector:".vp-portfolio__item-wrap",layoutMode:"masonry",masonry:"masonry"===t.options.layout?{horizontalOrder:"true"===t.options.masonryHorizontalOrder}:{},transitionDuration:"0.3s",percentPosition:!0,originLeft:!e,resize:!1};t.emitEvent("beforeInitIsotope",[i]),t.$items_wrap.isotope(i),t.emitEvent("initIsotope",[i])}},t.prototype.destroyIsotope=function(){const o=this;o.$items_wrap.data("isotope")&&(o.$items_wrap.isotope("destroy"),o.emitEvent("destroyIsotope"))})})),a.on("addItems.vpf",((o,t,e,i)=>{if("vpf"===o.namespace&&t.$items_wrap.data("isotope")){if(i){const o=t.$items_wrap.find(".vp-portfolio__item-wrap");t.$items_wrap.isotope("remove",o),t.$items_wrap.prepend(e).isotope("prepended",e)}else t.$items_wrap.append(e).isotope("appended",e);t.initIsotope("layout"),setTimeout((()=>{t.initIsotope("layout")}),0)}})),a.on("removeItems.vpf",((o,t,e)=>{"vpf"===o.namespace&&t.$items_wrap.data("isotope")&&t.$items_wrap.isotope("remove",e)})),a.on("init.vpf",((o,t)=>{"vpf"===o.namespace&&t.initIsotope()})),a.on("imagesLoaded.vpf",((o,t)=>{"vpf"===o.namespace&&t.initIsotope("layout")})),a.on("destroy.vpf",((o,t)=>{"vpf"===o.namespace&&t.destroyIsotope()})),a.on("initEvents.vpf",((o,t)=>{if("vpf"===o.namespace&&t.$items_wrap.isotope&&r.includes(t.options.layout)){const o=`.vpf-uid-${t.uid}`;s.on(`resize${o}`,n(100,i((()=>{t.initIsotope("layout")}))))}})),a.on("destroyEvents.vpf",((o,t)=>{if("vpf"===o.namespace&&r.includes(t.options.layout)){const o=`.vpf-uid-${t.uid}`;s.off(`resize${o}`)}})),a.on("vc-full-width-row",(150,n(150,i(((o,t)=>{e()(t).find(".vp-portfolio").each((function(){this.vpf&&this.vpf.initIsotope&&this.vpf.$items_wrap.data("isotope")&&this.vpf.initIsotope("layout")}))})),{debounceMode:!1!==(void 0!==(d={}.atBegin)&&d)})))})();