!function(){const e=window.jQuery;function i(e){e&&e.height>1&&(e.style.width=`${e.height}px`)}const n=new ResizeObserver((e=>{e.forEach((e=>{let{target:n}=e;n&&i(n)}))}));e(document).on("init.vpf loadedNewItems.vpf",((t,A)=>{if("vpf"!==t.namespace||"paged"!==A.options.pagination||!A.$pagination.children(".vp-pagination__style-minimal").length)return;const a=A.$pagination.find(".vp-pagination__item-active");let o=a.find("img");o.length||(o=e('<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">'),n.observe(o[0]),a.prepend(o),i(o[0]))}))}();