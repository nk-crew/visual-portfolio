!function(){const e=window.jQuery,{VPData:t}=window,{settingsPopupGallery:i}=t,o="content"in document.createElement("template"),r={vendor:!1,vendors:[{vendor:"youtube",embedUrl:"https://www.youtube.com/embed/{{video_id}}?{{params}}",pattern:/(https?:\/\/)?(www.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?list=(.*)&v=|watch\?(.*[^&]&)v=)?((\w|-){11})(&list=(\w+)&?)?(.*)/,patternIndex:6,params:{autoplay:1,autohide:1,fs:1,rel:0,hd:1,wmode:"transparent",enablejsapi:1,html5:1},paramsIndex:10,embedCallback(e,t){let i=!1;const o=this,a=!(!t||!t[o.patternIndex])&&t[o.patternIndex];if(a){const p=/\/shorts\//.test(e),l=p?476:1920,n=p?847:1080;i=r.embedCallback({...o,width:l,height:n},a,e,t)}return i}},{vendor:"vimeo",embedUrl:"https://player.vimeo.com/video/{{video_id}}?{{params}}",pattern:/https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)(.*)/,patternIndex:3,params:{autoplay:1,hd:1,show_title:1,show_byline:1,show_portrait:0,fullscreen:1},paramsIndex:4}],init(){},open(){},close(){},getQueryStringParams(e){return e?(/^[?#]/.test(e)?e.slice(1):e).split("&").reduce(((e,t)=>{const[i,o]=t.split("=");return e[i]=o?decodeURIComponent(o.replace(/\+/g," ")):"",e}),{}):{}},prepareParams(e,t){let i="";const o=t.params||{};if(t.paramsIndex&&e&&e[t.paramsIndex]){const i=r.getQueryStringParams(e[t.paramsIndex]);i&&"object"==typeof i&&Object.keys(i).forEach((e=>{e&&i[e]&&(o[e]=i[e])}))}return o&&Object.keys(o).length&&Object.keys(o).forEach((e=>{e&&o[e]&&(i&&(i+="&"),i+=`${e}=${o[e]}`)})),i},embedCallback(e,t,i,o=!1){let{embedUrl:a}=e;a=a.replace(/{{video_id}}/g,t),a=a.replace(/{{video_url}}/g,i),a=a.replace(/{{video_url_encoded}}/g,encodeURIComponent(i)),a=a.replace(/{{params}}/g,o?r.prepareParams(o,e):"");const p=e.width||1920,l=e.height||1080;return{vendor:e.vendor,id:t,embed:`<iframe width="${p}" height="${l}" src="${a}" scrolling="no" frameborder="0" allowTransparency="true" allow="accelerometer; autoplay; clipboard-write; fullscreen; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,embedUrl:a,url:i,width:p,height:l}},parseVideo(e,t){let i=!1;return r.vendors.forEach((o=>{if(!i){const a=e.match(o.pattern),p=!(!a||!a[o.patternIndex])&&a[o.patternIndex];p&&(i=o.embedCallback?o.embedCallback(e,a,t):r.embedCallback(o,p,e,a))}})),i||(i=r.embedCallback({vendor:"unknown",embedUrl:e},e,e,!1)),i},parseItem(e){let t=!1;const i=e&&e.querySelector(".vp-portfolio__item-popup");return i&&(t={$dataElement:i,$content:i,data:i.dataset},o&&"TEMPLATE"===i.nodeName&&i.content&&(t.$content=i.content),t.$title=t?.$content?.querySelector(".vp-portfolio__item-popup-title"),t.$description=t?.$content?.querySelector(".vp-portfolio__item-popup-description")),t},parseGallery(e){const t=[];let i,o,a,p;return e.find(".vp-portfolio__item-wrap:not(.swiper-slide-duplicate)").each((function(){const e=r.parseItem(this);if(e){if(i=(e?.data?.vpPopupImgSize||"1920x1080").split("x"),a=e?.data?.vpPopupVideo,p=!1,a&&(p=r.parseVideo(a,e?.data?.vpPopupPoster)),p)o={type:"embed",el:this,poster:p.poster,src:p.embedUrl,embed:p.embed,width:p.width||1920,height:p.height||1080};else{o={type:"image",el:this,src:e?.data?.vpPopupImg,srcset:e?.data?.vpPopupImgSrcset,width:parseInt(i[0],10),height:parseInt(i[1],10)};const t=e?.data?.vpPopupSmImg||o.src;if(t){const i=(e?.data?.vpPopupSmImgSize||e?.data?.vpPopupImgSize||"1920x1080").split("x");o.srcSmall=t,o.srcSmallWidth=parseInt(i[0],10),o.srcSmallHeight=parseInt(i[1],10)}const r=e?.data?.vpPopupMdImg||o.src;if(r){const t=(e?.data?.vpPopupMdImgSize||e?.data?.vpPopupImgSize||"1920x1080").split("x");o.srcMedium=r,o.srcMediumWidth=parseInt(t[0],10),o.srcMediumHeight=parseInt(t[1],10)}}(e?.$title||e?.$description)&&(o.caption=(e?.$title?.outerHTML||"")+(e?.$description?.outerHTML||"")),t.push(o)}})),t},maybeFocusGalleryItem(t){i.restore_focus&&(t.linkEl?e(t.linkEl).focus():t.el&&e(t.el).find(".vp-portfolio__item-img > a").focus())}};function a(e){return/(.png|.jpg|.jpeg|.gif|.tiff|.tif|.jfif|.jpe|.svg|.bmp|.webp)$/.test(e.href.toLowerCase().split("?")[0].split("#")[0])}function p(t){const i=e(t);let o=t.childNodes[0],r=i.next("figcaption");return"NOSCRIPT"===o.nodeName&&t.childNodes[1]&&(o=t.childNodes[1]),!r.length&&i.parent(".gallery-icon").length&&(r=i.parent(".gallery-icon").next("figcaption")),r=r.html(),r&&(r=`<div class="vp-portfolio__item-popup-description">${r}</div>`),{type:"image",el:o,linkEl:t,src:t.href,caption:r}}window.VPPopupAPI=r,e(document).on("extendClass.vpf",((t,i)=>{"vpf"===t.namespace&&(i.prototype.initPopupGallery=function(){const t=this;t.options.itemsClickAction&&"url"!==t.options.itemsClickAction&&(t.isPreview()||t.$item.on(`click.vpf-uid-${t.uid}`,"\n        .vp-portfolio__item a.vp-portfolio__item-meta,\n        .vp-portfolio__item .vp-portfolio__item-img > a,\n        .vp-portfolio__item .vp-portfolio__item-meta-title > a,\n        .vp-portfolio__item a.vp-portfolio__item-overlay\n      ",(function(i){if(i.isDefaultPrevented())return;let o=e(this).closest(".vp-portfolio__item-wrap");if(o.hasClass("swiper-slide-duplicate")&&o.attr("data-swiper-slide-index")&&(o=t.$item.find(`[data-swiper-slide-index="${o.attr("data-swiper-slide-index")}"].swiper-slide:not(.swiper-slide-duplicate)`)),!o.find(".vp-portfolio__item-popup").length)return;const a=r.parseGallery(t.$item);let p=-1;a.forEach(((e,t)=>{e.el===o[0]&&(p=t)})),-1!==p&&(i.preventDefault(),r.open(a,p,t))})))},i.prototype.destroyPopupGallery=function(){const e=this;e.options.itemsClickAction&&"url"!==e.options.itemsClickAction&&(e.$item.off(`click.vpf-uid-${e.uid}`),e.emitEvent("destroyPopupGallery"))})})),e(document).on("init.vpf",((e,t)=>{"vpf"===e.namespace&&t.initPopupGallery()})),e(document).on("destroy.vpf",((e,t)=>{"vpf"===e.namespace&&t.destroyPopupGallery()})),i.enable_on_wordpress_images&&e(document).on("click","\n      .wp-block-image > a,\n      .wp-block-image > figure > a,\n      .wp-block-gallery .blocks-gallery-item > figure > a,\n      .wp-block-gallery .wp-block-image > a,\n      .wp-block-media-text > figure > a,\n      .gallery .gallery-icon > a,\n      figure.wp-caption > a,\n      figure.tiled-gallery__item > a,\n      p > a\n    ",(function(t){if(t.isDefaultPrevented())return;if(!this.childNodes.length)return;let i=this.childNodes[0];if("NOSCRIPT"===i.nodeName&&this.childNodes[1]&&(i=this.childNodes[1]),"IMG"!==i.nodeName&&"PICTURE"!==i.nodeName)return;if(!a(this))return;t.preventDefault();const o=e(this),l=[],n=p(this),s=o.closest(".wp-block-gallery, .gallery, .tiled-gallery__gallery");let c=0;if(s.length){const e=s.find(".blocks-gallery-item > figure > a, .wp-block-image > a, .gallery-icon > a, figure.tiled-gallery__item > a");let t=0;e.each((function(){a(this)&&(this===n.linkEl&&(c=t),l.push(p(this)),t+=1)}))}else l.push(n);r.open(l,c)}))}();