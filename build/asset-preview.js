!function(){const e=window.jQuery,t=e("body"),a=e(document),n=e("#vp_preview");document.addEventListener("click",(e=>{e.stopPropagation(),e.preventDefault(),window.parentIFrame&&window.parentIFrame.sendMessage("clicked")}),!0),document.addEventListener("mousedown",(e=>{e.stopPropagation(),e.preventDefault(),e.target.blur(),window.focus()}),!0),a.on("startLoadingNewItems.vpf",((e,t,a,n)=>{"vpf"===e.namespace&&(n.data=Object.assign(n.data||{},window.vp_preview_post_data))}));const s={};window.iFrameResizer={log:!1,heightCalculationMethod(){return n.outerHeight(!0)},onMessage(a){if(a&&a.name)switch(a.name){case"resize":t.css("max-width",a.width+Math.random());break;case"dynamic-css":{const t=`vp-dynamic-styles-${a.blockId}-inline-css`;if(s[t]&&a.styles===s[t])break;let n=e(`#${t}`);n.length||(n=e(`<style id="${t}"></style>`).appendTo("head")),s[t]=a.styles,n.text(a.styles);break}}}}}();