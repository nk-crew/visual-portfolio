!function(){"use strict";var n={n:function(o){var t=o&&o.__esModule?function(){return o.default}:function(){return o};return n.d(t,{a:t}),t},d:function(o,t){for(var e in t)n.o(t,e)&&!n.o(o,e)&&Object.defineProperty(o,e,{enumerable:!0,get:t[e]})},o:function(n,o){return Object.prototype.hasOwnProperty.call(n,o)}},o=window.jQuery,t=n.n(o);const e=t()(window);t()(document).on("initEvents.vpf",((n,o)=>{if("vpf"!==n.namespace||"infinite"!==o.options.pagination)return;const t=`.vpf-uid-${o.uid}`;let i=!1;function r(){if(i||!o.options.nextPageUrl)return;i=!0;const n=o.$item[0].getBoundingClientRect();n.bottom>0&&n.bottom-400<=window.innerHeight?o.loadNewItems(o.options.nextPageUrl,!1,(()=>{setTimeout((()=>{i=!1,r()}),300)})):i=!1}var u,a,c,l;r(),e.on(`load${t} scroll${t} resize${t} orientationchange${t}`,function(n,o,t){var e,i=t||{},r=i.noTrailing,u=void 0!==r&&r,a=i.noLeading,c=void 0!==a&&a,l=i.debounceMode,f=void 0===l?void 0:l,d=!1,v=0;function s(){e&&clearTimeout(e)}function p(){for(var t=arguments.length,i=new Array(t),r=0;r<t;r++)i[r]=arguments[r];var a=this,l=Date.now()-v;function p(){v=Date.now(),o.apply(a,i)}function m(){e=void 0}d||(c||!f||e||p(),s(),void 0===f&&l>n?c?(v=Date.now(),u||(e=setTimeout(f?m:p,n))):p():!0!==u&&(e=setTimeout(f?m:p,void 0===f?n-l:n)))}return p.cancel=function(n){var o=(n||{}).upcomingOnly,t=void 0!==o&&o;s(),d=!t},p}(150,(u=()=>{r()},a=[],c=null,l=function(){for(var n=arguments.length,o=new Array(n),t=0;t<n;t++)o[t]=arguments[t];a=o,c||(c=requestAnimationFrame((function(){c=null,u.apply(void 0,a)})))},l.cancel=function(){c&&(cancelAnimationFrame(c),c=null)},l)))}))}();