!function(){const{jQuery:e,ajaxurl:t,VPAdminVariables:a}=window;e('select[name="vp_general[portfolio_archive_page]"]').select2({ajax:{url:t,dataType:"json",delay:250,data(e){return{q:e.term,selected:this[0].value,nonce:a.nonce,action:"vp_get_pages_list"}},processResults(t){const a=[],s=this.$element.select2("data");let l=!1;return s&&s[0]&&s[0].selected&&(l=Number(s[0].id),a.push({id:l,text:s[0].text})),t&&e.each(t,((e,t)=>{l&&l===t[0]||a.push({id:t[0],text:t[1]})})),{results:a}},cache:!0}})}();