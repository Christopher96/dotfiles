Registry.require(["promise","icon","helper"],function(){var h=Registry.log,r=Registry.get("promise"),u=Registry.get("icon"),v=Registry.get("helper"),t=function(){var b={},c=null,f=0;return{init:function(){var e=function(a){c=a||"unknown";h.debug("notify: chronos level",a)};rea.notifications.supported?(rea.notifications.getPermissionLevel(e),rea.notifications.onPermissionLevelChanged.addListener(e),rea.notifications.onClicked.addListener(function(a){h.debug("notify: chronos click",a);b[a]&&(b[a].cb.click&&
b[a].cb.click(),b[a].cancel(),delete b[a])}),rea.notifications.onClosed.addListener(function(a){h.debug("notify: chronos close",a);b[a]&&b[a].cb.close&&b[a].cb.close();delete b[a]})):e("unsupported")},create:function(e,a,q){var d=r(),m=10,n=function(){if(c)if("granted"==c){var g={nid:null,cb:{},on:function(a,b){g.cb[a]=b},cancel:function(){},show:function(){var c={type:"basic",title:a||"",message:q||""};c.iconUrl=0==f?e:"data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
var k=v.createUUID();rea.notifications.create(k,c,function(){rea.runtime.lastError?1>f?(h.debug("notify: chronos creating failed, retry...",rea.runtime.lastError),f++,g.show()):(h.debug("notify: chronos creating finally failed",rea.runtime.lastError),d.reject()):(h.debug("notify: chronos created",k),g.cancel=function(){b[k]&&rea.notifications.clear(k,function(){})},b[k]=g)})}};d.resolve(g)}else d.resolve();else{var l=function(){c?n():m--?window.setTimeout(l,200):d.resolve()};l()}};n();return d.promise()}}}(),
p={notify:function(b,c,f,e,a){var q=!1;a||(q=!0,a=function(){});var d=null,m=!1,n=!1,g=null,l,p=function(){g&&window.clearTimeout(g);m||a({});n=!0},k=function(){m=!0;var b={clicked:m};a&&a(b);d&&d.cancel()};f=f||rea.extension.getURL("images/icon128.png");u.getDataUriFromUrl(f).then(function(b){l=b;return r.Pledge()}).then(function(){return t.create(l,b,c)}).then(function(a){var d=r();if(!a)try{var e=rea.other.webkitNotifications.createNotification(l,b||"",c||"");a={on:function(a,b){e["on"+a]=b},cancel:function(){n||
e.cancel()},show:function(){e.show()}}}catch(f){h.warn("notify: Notification creation failed with: "+f.message),a={cb:{},on:function(b,c){a.cb[b]=c},cancel:function(){},show:function(){q||window.setTimeout(function(){confirm((b?b+"\n\n":"")+c)?a.cb.click&&a.cb.click():a.cb.close&&a.cb.close()},1)}}}d.resolve(a);return d.promise()}).then(function(a){d=a;d.on("close",p);d.on("click",k);g=window.setTimeout(function(){g=null;d.cancel()},e?e:6E5);h.debug("notify:",b,c,f,e);d.show()});return{cancel:function(){d&&
d.cancel()}}},showUpdate:function(b,c,f,e){return p.notify(b,c,f,3E5,e)},show:function(b,c,f,e,a){return p.notify(b,c,f,e,a)},highlight:function(b,c){rea.tabs.highlight({tabs:b},c)}};Registry.register("notify","5362",function(){t.init();return p})});
