function m() {
  for (var a = [["edge", /Edge\/([0-9\._]+)/], ["chrome", /Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/], ["firefox", /Firefox\/([0-9\.]+)(?:\s|$)/], ["opera", /Opera\/([0-9\.]+)(?:\s|$)/], ["ie", /Trident\/7\.0.*rv\:([0-9\.]+)\).*Gecko$/], ["ie", /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/], ["ie", /MSIE\s(7\.0)/], ["bb10", /BB10;\sTouch.*Version\/([0-9\.]+)/], ["android", /Android\s([0-9\.]+)/], ["ios", /iPad\;\sCPU\sOS\s([0-9\._]+)/], ["ios", /iPhone\;\sCPU\siPhone\sOS\s([0-9\._]+)/], ["safari", /Safari\/([0-9\._]+)/]], 
  b = 0, h = [], b = 0;b < a.length;b++) {
    var k = b, l;
    l = a[b];
    l = l.concat(l[1].exec(navigator.userAgent));
    a[k] = l;
    a[b][2] && h.push(a[b]);
  }
  for (b = (a = h[0]) && a[3].split(/[._]/).slice(0, 3);b && 3 > b.length;) {
    b.push("0");
  }
  h = {};
  h.name = a && a[0];
  h.version = b && b.join(".");
  h.versionInt = parseInt(h.version);
  return h;
}
;window._gaq = window._gaq || [];
var r = {J:function(a) {
  return a + Math.random();
}, Q:function(a) {
  for (var b = a.length, h, k;0 !== b;) {
    k = Math.floor(Math.random() * b), b -= 1, h = a[b], a[b] = a[k], a[k] = h;
  }
  return a;
}, P:function(a, b) {
  return Math.floor(Math.random() * (b - a + 1) + a);
}}, s = {extend:function(a, b) {
  function h() {
  }
  h.prototype = b.prototype;
  a.prototype = new h;
  a.prototype.constructor = a;
  a.A = b.prototype;
}}, u = {e:function(a) {
  return chrome.i18n.getMessage(a);
}};
function Notification(a) {
  this.a = a;
  this.i = null;
}
function w(a) {
  w.A.constructor.apply(this, arguments);
  this.create();
}
s.extend(w, Notification);
w.prototype.create = function() {
  var a = this, b = {type:"progress", title:"Lightshot", message:u.e("screenshot_plugin_uploading_window_capt"), iconUrl:"img/icon256.png", buttons:[{title:u.e("screenshot_plugin_cancel")}], isClickable:!0, progress:0};
  50 <= m().versionInt && (b.requireInteraction = !0);
  chrome.notifications.create(this.a, b, function() {
    a.i = "uploading";
  });
};
w.prototype.update = function(a) {
  var b = this;
  "progress" === a.type && a.progress ? chrome.notifications.update(this.a, {progress:a.progress}, function() {
  }) : "success" === a.type && a.message ? (a = {type:"basic", message:a.message, buttons:[{title:u.e("screenshot_plugin_copy")}, {title:u.e("screenshot_plugin_open")}]}, chrome.notifications.update(this.a, a, function() {
    b.i = "success";
  })) : "failed" === a.type && (a = {type:"basic", message:u.e("screenshot_plugin_upload_failed_retry"), buttons:[{title:u.e("screenshot_plugin_retry")}, {title:u.e("screenshot_plugin_cancel")}]}, chrome.notifications.update(this.a, a, function() {
    b.i = "failed";
  }));
};
function x() {
  function a(a) {
    chrome.notifications.clear(a, function() {
    });
    delete b[a];
  }
  var b = {};
  chrome.notifications.onClicked.addListener(function(a) {
    a = b[a];
    "success" === a.i && y.sendMessage({name:z, id:a.a});
  });
  chrome.notifications.onButtonClicked.addListener(function(a, k) {
    var l = b[a];
    "uploading" === l.i && 0 === k ? y.sendMessage({name:A, id:l.a}) : "success" === l.i ? 0 === k ? y.sendMessage({name:B, id:l.a}) : 1 === k && y.sendMessage({name:z, id:l.a}) : "failed" === l.i && (0 === k ? y.sendMessage({name:C, id:l.a}) : 1 === k && y.sendMessage({name:A, id:l.a}));
  });
  return{I:function(h) {
    a(h);
    b[h] = new w(h);
  }, B:function(a, k) {
    b[a].update(k);
  }, n:a};
}
;var D = {save:function(a, b) {
  a && "undefined" != typeof a && "undefined" != typeof a.img_url && $.ajax({type:"POST", url:"https://api.prntscr.com/v1/", data:JSON.stringify({jsonrpc:"2.0", id:1, method:"save", params:a}), dataType:"json", beforeSend:function(a) {
    a.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  }, complete:function(a) {
    a.responseJSON && "undefined" != typeof a.responseJSON && "undefined" != typeof a.responseJSON.result ? b(a.responseJSON.result) : b(null);
  }});
}};
if ("function" !== typeof E) {
  var E = function() {
    function a(a, e) {
      var f = a[0], c = a[1], d = a[2], g = a[3], f = h(f, c, d, g, e[0], 7, -680876936), g = h(g, f, c, d, e[1], 12, -389564586), d = h(d, g, f, c, e[2], 17, 606105819), c = h(c, d, g, f, e[3], 22, -1044525330), f = h(f, c, d, g, e[4], 7, -176418897), g = h(g, f, c, d, e[5], 12, 1200080426), d = h(d, g, f, c, e[6], 17, -1473231341), c = h(c, d, g, f, e[7], 22, -45705983), f = h(f, c, d, g, e[8], 7, 1770035416), g = h(g, f, c, d, e[9], 12, -1958414417), d = h(d, g, f, c, e[10], 17, -42063), c = h(c, 
      d, g, f, e[11], 22, -1990404162), f = h(f, c, d, g, e[12], 7, 1804603682), g = h(g, f, c, d, e[13], 12, -40341101), d = h(d, g, f, c, e[14], 17, -1502002290), c = h(c, d, g, f, e[15], 22, 1236535329), f = k(f, c, d, g, e[1], 5, -165796510), g = k(g, f, c, d, e[6], 9, -1069501632), d = k(d, g, f, c, e[11], 14, 643717713), c = k(c, d, g, f, e[0], 20, -373897302), f = k(f, c, d, g, e[5], 5, -701558691), g = k(g, f, c, d, e[10], 9, 38016083), d = k(d, g, f, c, e[15], 14, -660478335), c = k(c, d, 
      g, f, e[4], 20, -405537848), f = k(f, c, d, g, e[9], 5, 568446438), g = k(g, f, c, d, e[14], 9, -1019803690), d = k(d, g, f, c, e[3], 14, -187363961), c = k(c, d, g, f, e[8], 20, 1163531501), f = k(f, c, d, g, e[13], 5, -1444681467), g = k(g, f, c, d, e[2], 9, -51403784), d = k(d, g, f, c, e[7], 14, 1735328473), c = k(c, d, g, f, e[12], 20, -1926607734), f = b(c ^ d ^ g, f, c, e[5], 4, -378558), g = b(f ^ c ^ d, g, f, e[8], 11, -2022574463), d = b(g ^ f ^ c, d, g, e[11], 16, 1839030562), c = 
      b(d ^ g ^ f, c, d, e[14], 23, -35309556), f = b(c ^ d ^ g, f, c, e[1], 4, -1530992060), g = b(f ^ c ^ d, g, f, e[4], 11, 1272893353), d = b(g ^ f ^ c, d, g, e[7], 16, -155497632), c = b(d ^ g ^ f, c, d, e[10], 23, -1094730640), f = b(c ^ d ^ g, f, c, e[13], 4, 681279174), g = b(f ^ c ^ d, g, f, e[0], 11, -358537222), d = b(g ^ f ^ c, d, g, e[3], 16, -722521979), c = b(d ^ g ^ f, c, d, e[6], 23, 76029189), f = b(c ^ d ^ g, f, c, e[9], 4, -640364487), g = b(f ^ c ^ d, g, f, e[12], 11, -421815835), 
      d = b(g ^ f ^ c, d, g, e[15], 16, 530742520), c = b(d ^ g ^ f, c, d, e[2], 23, -995338651), f = l(f, c, d, g, e[0], 6, -198630844), g = l(g, f, c, d, e[7], 10, 1126891415), d = l(d, g, f, c, e[14], 15, -1416354905), c = l(c, d, g, f, e[5], 21, -57434055), f = l(f, c, d, g, e[12], 6, 1700485571), g = l(g, f, c, d, e[3], 10, -1894986606), d = l(d, g, f, c, e[10], 15, -1051523), c = l(c, d, g, f, e[1], 21, -2054922799), f = l(f, c, d, g, e[8], 6, 1873313359), g = l(g, f, c, d, e[15], 10, -30611744), 
      d = l(d, g, f, c, e[6], 15, -1560198380), c = l(c, d, g, f, e[13], 21, 1309151649), f = l(f, c, d, g, e[4], 6, -145523070), g = l(g, f, c, d, e[11], 10, -1120210379), d = l(d, g, f, c, e[2], 15, 718787259), c = l(c, d, g, f, e[9], 21, -343485551);
      a[0] = n(f, a[0]);
      a[1] = n(c, a[1]);
      a[2] = n(d, a[2]);
      a[3] = n(g, a[3]);
    }
    function b(a, e, b, c, d, g) {
      e = n(n(e, a), n(c, g));
      return n(e << d | e >>> 32 - d, b);
    }
    function h(a, e, f, c, d, g, h) {
      return b(e & f | ~e & c, a, e, d, g, h);
    }
    function k(a, e, f, c, d, g, h) {
      return b(e & c | f & ~c, a, e, d, g, h);
    }
    function l(a, e, f, c, d, g, h) {
      return b(f ^ (e | ~c), a, e, d, g, h);
    }
    function v(b) {
      var e = b;
      txt = "";
      var f = e.length;
      b = [1732584193, -271733879, -1732584194, 271733878];
      var c;
      for (c = 64;c <= e.length;c += 64) {
        for (var d = e.substring(c - 64, c), g = [], h = void 0, h = 0;64 > h;h += 4) {
          g[h >> 2] = d.charCodeAt(h) + (d.charCodeAt(h + 1) << 8) + (d.charCodeAt(h + 2) << 16) + (d.charCodeAt(h + 3) << 24);
        }
        a(b, g);
      }
      e = e.substring(c - 64);
      d = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (c = 0;c < e.length;c++) {
        d[c >> 2] |= e.charCodeAt(c) << (c % 4 << 3);
      }
      d[c >> 2] |= 128 << (c % 4 << 3);
      if (55 < c) {
        for (a(b, d), c = 0;16 > c;c++) {
          d[c] = 0;
        }
      }
      d[14] = 8 * f;
      a(b, d);
      for (e = 0;e < b.length;e++) {
        f = b[e];
        c = "";
        for (d = 0;4 > d;d++) {
          c += q[f >> 8 * d + 4 & 15] + q[f >> 8 * d & 15];
        }
        b[e] = c;
      }
      return b.join("");
    }
    function n(a, b) {
      return a + b & 4294967295;
    }
    var q = "0123456789abcdef".split("");
    "5d41402abc4b2a76b9719d911017c592" != v("hello") && (n = function(a, b) {
      var f = (a & 65535) + (b & 65535);
      return(a >> 16) + (b >> 16) + (f >> 16) << 16 | f & 65535;
    });
    return v;
  }()
}
;function F(a, b) {
  this.a = a;
  this.j = b;
  this.H = this.o = this.b = this.r = null;
  this.g = {};
  this.g[this.f.l] = $.Callbacks();
  this.g[this.f.k] = $.Callbacks();
}
F.prototype.f = {l:"progress_change", k:"complete"};
F.prototype.m = {D:"success", C:"failed"};
F.prototype.p = function() {
  var a = {M:this.o};
  this.b ? a.error = this.b : a.w = this.H;
  return a;
};
F.prototype.attachEvent = function(a, b) {
  "undefined" !== typeof this.g[a] && this.g[a].add(b);
};
F.prototype.detachEvent = function(a, b) {
  "undefined" !== typeof this.g[a] && this.g[a].remove(b);
};
function G(a, b) {
  G.A.constructor.call(this, a, b);
  this.s = "5CE3DF4D45AC";
  this.L = "http://upload.prntscr.com/upload/{time}/{hash}/";
}
s.extend(G, F);
G.prototype.upload = function() {
  var a = this;
  this.o = this.m.C;
  var b = function(a) {
    var b = a.split(",");
    a = b[0].match(/:(.*?);/)[1];
    for (var b = atob(b[1]), h = b.length, k = new Uint8Array(h);h--;) {
      k[h] = b.charCodeAt(h);
    }
    return new Blob([k], {type:a});
  }(a.j.dataUrl), h = new FormData;
  h.append("image", b, "image.png");
  var b = Math.floor(Date.now() / 1E3), k = E("{key}*{time}".replace("{key}", this.s).replace("{time}", b)), b = this.L.replace("{time}", b).replace("{hash}", k);
  this.r = $.ajax({processData:!1, contentType:!1, url:b, type:"POST", timeout:18E4, data:h, xhr:function() {
    var b = new XMLHttpRequest;
    b.upload.onprogress = function(b) {
      b.lengthComputable && a.g[a.f.l].fire({loaded:b.loaded, total:b.total});
    };
    return b;
  }, beforeSend:function() {
  }, complete:function(b, h) {
    a.o = a.m.C;
    try {
      var k = $.parseXML(b.responseText);
      if (k && k.getElementsByTagName("url").length) {
        a.o = a.m.D;
        var q = {};
        k && k.getElementsByTagName("url").length && (k.getElementsByTagName("url")[0].innerHTML && (q.img_url = k.getElementsByTagName("url")[0].innerHTML), k.getElementsByTagName("thumb")[0].innerHTML && (q.thumb_url = k.getElementsByTagName("thumb")[0].innerHTML), q.width = 0, q.height = 0, q.delete_hash = "");
        a.H = q;
      } else {
        a.b = u.e("screenshot_plugin_image_hosting_incorrect_response");
      }
    } catch (t) {
      a.b = u.e("screenshot_plugin_upload_error_capt") + "\n\n", a.b += u.e("screenshot_plugin_upload_error_detailed_info") + ":\n", a.b += "status = " + (b && b.status ? b.status : "") + "\n", a.b += "textStatus = " + h + "\n", a.b += "e = " + t + "\n", a.b += "responseText = " + (b && b.responseText ? b.responseText : "") + "\n";
    }
    a.g[a.f.k].fire(a.p());
  }});
};
G.prototype.cancel = function() {
  this.r && this.r.abort();
};
G.prototype.p = function() {
  var a = G.A.p.apply(this, arguments);
  a.key = this.s.substr(this.s.length - 4);
  return a;
};
function H(a, b) {
  this.a = a;
  this.j = b;
  var h = this;
  this.q = [];
  this.q.push(function() {
    return new G(h.a, h.j);
  });
  this.t = 0;
  this.u = this.v = this.G = this.F = this.c = null;
}
function I(a) {
  a.v = function(b) {
    J(a, b);
  };
  a.c.attachEvent(a.c.f.k, a.v);
  a.u = function(b) {
    y.sendMessage({name:K, id:a.a, progress:Math.round(b.loaded / b.total * 100)});
  };
  a.c.attachEvent(a.c.f.l, a.u);
}
function L(a) {
  a.c.detachEvent(a.c.f.k, a.v);
  a.c.detachEvent(a.c.f.l, a.u);
}
H.prototype.upload = function() {
  this.c = this.q[this.t]();
  I(this);
  M.d("upload", "hosting", "attempt");
  this.c.upload();
};
function J(a, b) {
  b.M === a.c.m.D ? (a.F = b.w.img_url, a.j.cmdAfterUpload === N ? y.sendMessage({name:O, id:a.a}) : (b.w.dpr = a.j.dpr, M.d("upload", "prntscr", "attempt"), D.save(b.w, function(b) {
    b && b.success && b.url ? (a.G = b.url, M.d("upload", "prntscr", "success")) : M.d("upload", "prntscr", "fail");
    y.sendMessage({name:O, id:a.a});
    M.d("upload", "prntscr", "finished");
  })), M.d("upload", "hosting", "success_" + b.key)) : (M.d("upload", "hosting", "fail_" + b.key), P(a));
  M.d("upload", "hosting", "finished");
}
function P(a) {
  a.t++;
  a.t < a.q.length ? (L(a), a.c = null, a.upload()) : (y.sendMessage({name:Q, id:a.a}), M.d("upload", "totalfail"));
}
H.prototype.cancel = function() {
  this.c.cancel();
  L(this);
  M.d("upload", "cancel");
};
function R() {
  this.h = {};
}
R.prototype.upload = function(a, b) {
  this.h[a] = new H(a, b);
  this.h[a].upload();
  y.sendMessage({name:S, id:a});
  M.d("upload", "attempt");
};
function T(a, b) {
  var h;
  a.h[b] ? (h = a.h[b], h = h.G || h.F) : h = null;
  return h;
}
;var C = "upload_screenshot", S = "upload_started", K = "upload_progress", O = "upload_success", Q = "upload_failed", z = "open_screenshot_link", B = "copy_screenshot_link", A = "cancel_upload", N = "search_google";
var M = function(a) {
  (function() {
    window._gaq.push(["_setAccount", a]);
    window._gaq.push(["_trackPageview"]);
    var b = document.createElement("script");
    b.type = "text/javascript";
    b.async = !0;
    b.src = "https://ssl.google-analytics.com/ga.js";
    b.O = "sha256-Ti7WNavwsty6w+oE0WzPWLshlTZNZbdhkPA9oPQyVcU=";
    var h = document.getElementsByTagName("script")[0];
    h.parentNode.insertBefore(b, h);
  })();
  return{d:function(a, h, k, l, v) {
    window._gaq.push(["_trackEvent", a, h, k, l, v]);
  }};
}("UA-53060756-1"), y = function() {
  function a(a) {
    a.clipboardData.setData("text/plain", f);
    a.preventDefault();
  }
  function b(a, b, c) {
    if (a && "undefined" !== typeof a && "undefined" !== typeof a.name) {
      switch(a.name) {
        case "load_screenshot":
          a = a.id;
          b = "";
          void 0 !== typeof d[a] && (b = d[a], delete d[a]);
          c(b);
          break;
        case C:
          l(a.id), c();
      }
    }
  }
  function h(a) {
    k(a, function() {
      if (c[a] && c[a].cmdAfterUpload) {
        var b = T(t, a);
        switch(c[a].cmdAfterUpload) {
          case N:
            chrome.tabs.create({url:"http://www.google.com/searchbyimage?image_url=" + b});
            break;
          case "share_twitter":
            chrome.tabs.create({url:"http://twitter.com/home?source=Lightshot&status=" + b + "%20"});
            break;
          case "share_facebook":
            chrome.tabs.create({url:"https://www.facebook.com/dialog/share?app_id=585941498129307&display=page&href=" + b + "&redirect_uri=" + b});
            break;
          case "share_vk":
            chrome.tabs.create({url:"http://vk.com/share.php?url=" + b});
            break;
          case "share_pinterest":
            chrome.tabs.create({url:"http://pinterest.com/pin/create/button/?url=" + b + "&media=" + b + "/direct"});
        }
        e.n(a);
      } else {
        e.B(a, {type:"success", message:T(t, a)});
      }
    });
  }
  function k(a, b) {
    chrome.storage.local.remove(a, function() {
      b && b();
    });
  }
  function l(a) {
    chrome.storage.local.get(a, function(b) {
      b = b[a];
      c[a] = b;
      t.upload(a, b);
    });
  }
  function v() {
    n();
  }
  function n() {
    q(function(a) {
      var b = r.J("screenshot_");
      d[b] = a;
      chrome.tabs.create({url:chrome.extension.getURL("screenshot.html?id=" + b)}, function(a) {
        if ("function" == typeof chrome.tabs.N) {
          try {
            chrome.tabs.N(a.id, 1);
          } catch (b) {
          }
        }
      });
    });
  }
  function q(a) {
    chrome.tabs.captureVisibleTab({format:"png"}, function(b) {
      a(b);
    });
  }
  var t = null, e = null, f = null, c = {}, d = {};
  return{K:function() {
    t = new R;
    e = x();
    chrome.browserAction.onClicked.addListener(v);
    chrome.runtime.onMessage.addListener(b);
    document.addEventListener("copy", a);
    var c = chrome.runtime.getManifest().version;
    "undefined" === typeof localStorage.lightshot_version ? localStorage.ever_updated = "no" : localStorage.lightshot_version != c && (localStorage.ever_updated = "yes");
    localStorage.lightshot_version = c;
  }, sendMessage:function(a) {
    if (a && "undefined" !== typeof a && "undefined" !== typeof a.name) {
      switch(a.name) {
        case S:
          e.I(a.id);
          break;
        case K:
          e.B(a.id, {type:"progress", progress:a.progress});
          break;
        case O:
          h(a.id);
          break;
        case Q:
          e.B(a.id, {type:"failed"});
          break;
        case z:
          chrome.tabs.create({url:T(t, a.id)});
          e.n(a.id);
          break;
        case B:
          f = T(t, a.id);
          document.execCommand("copy");
          e.n(a.id);
          break;
        case A:
          k(a.id, function() {
            var b = t, c = a.id;
            b.h[c] && (b.h[c].cancel(), delete b.h[c]);
          }), e.n(a.id);
      }
    }
  }};
}();
y.K();

