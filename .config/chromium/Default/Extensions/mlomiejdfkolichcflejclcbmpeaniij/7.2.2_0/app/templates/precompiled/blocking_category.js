module.exports=function(t){var n,s="";return s+='<div class="flex sticky-category">\n\t<img class="cat-image" src="/app/images/panel/'+(null==(n=t.img_name)?"":n)+'.svg">\n\t<div class="flex vertical">\n\t\t<div class="cat-name">\n\t\t\t'+(null==(n=t.name)?"":n)+'\n\t\t</div>\n\t\t<div class="counts flex">\n\t\t\t<div class="total-count">\n\t\t\t\t<span class="count">'+(null==(n=t.num_total)?"":n)+'</span>\n\t\t\t\t<span class="text">\n\t\t\t\t\t'+(null==(n=1===t.num_total?t.blocking_category_tracker:t.blocking_category_trackers)?"":n)+'\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t\t<div class="blocked-count" style="display:none;">\n\t\t\t\t<span class="count"></span>\n\t\t\t\t<span class="text">'+(null==(n=t.blocking_category_blocked)?"":n)+'</span>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n<div class="trackers-list"></div>\n'};