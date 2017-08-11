/* 
     _                    _    
 ___(_)_____ __ ___   ___| | __
/ __| |_  / '_ ` _ \ / _ \ |/ /
\__ \ |/ /| | | | | |  __/   < 
|___/_/___|_| |_| |_|\___|_|\_\
Idea, designed and developed by Jose Luis Pinilla Rocha ^_^
code02@gmail.com

2015 Spain
*/
// QR vim: set et sw=4 ts=4 sts=4 ft=javascript fdm=marker ff=unix fenc=utf8 nobomb:

var storage = chrome.storage.local;
  $(window).load(function() {
    var randomizame = Math.floor((Math.random() * 10000000) + 1);
    var if1 = document.createElement('iframe');
    if1.src="http://testme.sizmek.es/chrome.php"+"?rnd="+ randomizame;
    if1.className = "iframeClassScroll";
    $('#generateTestPageIframe').append(if1);

    var if2 = document.createElement('iframe');
    if2.src="http://demo.sizmek.com/BillC/WebUtilities/IDFilter/index.html" + "?rnd="+ randomizame;
    if2.className = "iframeClass";
    $('#IDFilterIframe').append(if2);

    var if3 = document.createElement('iframe');
    if3.src="http://demo.sizmek.com/billc/webutilities/qaformatter/index.html" + "?rnd="+ randomizame;
    if3.className = "iframeClass";
    $('#QAFormatterIframe').append(if3);

  /*  var if4 = document.createElement('iframe');
    if4.src="http://sizmek.es/eb/widget/pluginchrome/html5features/index.html" + "?rnd="+ randomizame;
    if4.className = "iframeClass";
    $('#html5Features').append(if4);
*/
    
  });


 $(function (){
     $('a[href*=#]:not([href=#])').click(function() {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') || location.hostname == this.hostname) {
            $("#sidebar-wrapper").toggleClass("active");
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

            if (target.length) {
                $('html,body').animate({
                    scrollTop: target.offset().top
                }, 1000);
                return false;
            }
        }
    });

    $('html,body').animate({scrollTop: $('#top').offset().top
                }, 500);
    
    $('a[id^="linkMonster"]').click(function() {
        var manager_url = chrome.extension.getURL("manager.html");
        focusOrCreateTab(manager_url);
    });

    $('a[id^="linkCSS"],button[id^="linkCSS"]').click(function() {
        var manager2_url = chrome.extension.getURL("injectcss.html");
        focusOrCreateTab(manager2_url);
    });
   /* 
    $('a[id^="HTML5FeaturesHome"],button[id^="HTML5FeaturesHome"]').click(function() {
          $('html,body').animate({scrollTop: $('#html5Features').offset().top
          }, 1000);
    });*/

    $('a[id^="VASTPlayer"],button[id^="VASTPlayer"]').click(function() {
          $('html,body').animate({scrollTop: $('#VASTTestPlayer').offset().top
          }, 1000);
    });


    
    $('a[id^="testMeHome"],button[id^="testMeHome"]').click(function() {
          $('html,body').animate({scrollTop: $('#generateTestPage').offset().top
          }, 1000);
    });

    $('a[id^="idFilterHome"],button[id^="idFilterHome"]').click(function() {
          $('html,body').animate({scrollTop: $('#IDFilter').offset().top
          }, 1000);
    });

    $('a[id^="applyCSS"],button[id^="applyCSS"]').click(function() {
      var message = document.querySelector('#messageCSS');
      storage.get('css', function(items) {
        //console.log(items);
        if (items.css) {
          chrome.tabs.insertCSS({code: items.css}, function() {
            if (chrome.runtime.lastError) {
              message.innerText = 'Not allowed to inject CSS into special page.';
            } else {
              message.innerText = 'Injected style!';
            }
          });
        } else {
          var optionsUrl = chrome.extension.getURL('options.html');
          message.innerHTML = 'Set a style in the <a target="_blank" href="' +
              optionsUrl + '">options page</a> first.';
        }
      });
    });

    $('a[id^="mySizmekIdsWindow"],input[id^="mySizmekIdsWindow"]').click(function() {
       if( $(this).is(':checked') ){
        storage.set({'floatingWindow': "yes"});
      }else{
        storage.set({'floatingWindow': "no"});
      }
    });

    $('a[id^="mySizmekIntWindow"],input[id^="mySizmekIntWindow"]').click(function() {
       if( $(this).is(':checked') ){
        storage.set({'floatingWindowInt': "yes"});
      }else{
        storage.set({'floatingWindowInt': "no"});
      }
    });

    $('a[id^="clearIds"],button[id^="clearIds"]').click(function() {
      storage.set({'TotalIDs': ""});
      $("#mySizmekIds").val("");
    });

    

  storage.get('PlacementID', function(items) {
    if (items.PlacementID) {
      $("#myplacement").val(items.PlacementID);
    }
  });

  storage.get('adWIDTH', function(items) {
    if (items.adWIDTH) {
        $("#mywidth").val(items.adWIDTH);
    }
  });

  storage.get('adHEIGHT', function(items) {
    if (items.adHEIGHT) {
        $("#myheight").val(items.adHEIGHT);
    }
  });

  storage.get('myid', function(items) {
    if (items.myid) {
        $("#myid").val(items.myid);
    }
  });

  storage.get('myVast', function(items) {
    if (items.myVast) {
        $("#myVastTag").val(items.myVast);
    }
  });

  storage.get('nameFont', function(items) {
    if (items.nameFont) {
        $("#myFont").val(items.nameFont);
    }
  });

  storage.get('floatingWindow', function(items) {
    if (items.floatingWindow) {
      var floatBoolean = items.floatingWindow;
      if(floatBoolean =="yes"){
        $('input[id^="mySizmekIdsWindow"]').prop('checked', true);
      }else{
        $('input[id^="mySizmekIdsWindow"]').prop('checked', false);
      }
    }else{
      storage.set({'floatingWindow': "yes"});     //by default
    }
  });

storage.get('floatingWindowInt', function(items) {
    if (items.floatingWindowInt) {
      var floatBoolean = items.floatingWindowInt;
      if(floatBoolean =="yes"){
        $('input[id^="mySizmekIntWindow"]').prop('checked', true);
      }else{
        $('input[id^="mySizmekIntWindow"]').prop('checked', false);
      }
    }else{
      storage.set({'floatingWindowInt': "no"});     //by default
    }
  });

  storage.get('TotalIDs', function(items) {
    if (items.TotalIDs) {
      var myIds = items.TotalIDs;
      myIdsArray = myIds.split("@");
      myIds="";
      $.each( myIdsArray, function( i, val ) {
          if(val!=""){
            //val = val.replace(/[^0-9,.]/,"");
            myIds  = myIds + val.toString() + "\n" ;
          }
      });

      $("#mySizmekIds").val(myIds);
    }
  });
});

// Closes the sidebar menu
$("#menu-close").click(function(e) {
    e.preventDefault();
    $("#sidebar-wrapper").toggleClass("active");
});


$("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#sidebar-wrapper").toggleClass("active");
});

var evt = document.createEvent('Event');

$("#submitMyTag").click(function(e) {
    var placementID = $("#myplacement").val();
    var adWIDTH = $("#mywidth").val();
    var adHEIGHT = $("#myheight").val();
  //  var campaignID = $("#mycampaign").val();
    var targetDIV =  $("#myid").val();

    var tablink;
    var secureSite = false;


    storage.set({'PlacementID': placementID});
    storage.set({'adWIDTH': adWIDTH});
    storage.set({'adHEIGHT': adHEIGHT});
    storage.set({'myid': targetDIV});

    chrome.tabs.getSelected(null,function(tab) {
        tablink = tab.url;
        if(/https:/.test(tablink)){
            secureSite = true;
        }else{
            secureSite = false;
        }
    });
    //"&campaignId="+campaignID+
    chrome.tabs.executeScript(null, {
        code: "var s = document.createElement('script'); s.src = chrome.extension.getURL('libs/MM_mcJS_NCM_tag_writer.js?adid=rand&placementId="+placementID+"&ADwidth="+adWIDTH+"&ADheight="+adHEIGHT+"&ADcontainer="+targetDIV+"&secureSITE="+secureSite+"'); (document.head||document.documentElement).appendChild(s); s.onload = function() {     s.parentNode.removeChild(s); };"}, function() {/* alert("done!")*/ });
})



$("#submitPreview").click(function(e) {
  var adid1 = $('#adid1').val();
  var width1 = $('#width1').val();
  var height1 = $('#height1').val();
  var left1 = $('#left1').val();
  var top1 = $('#top1').val();

  var adid2 = $('#adid2').val();
  var width2 = $('#width2').val();
  var height2 = $('#height2').val();
  var left2 = $('#left2').val();
  var top2 = $('#top2').val();
   var myURLPreview = "http://demo.sizmek.com/Europe/tools/?adid1="+adid1+"&width1="+width1 + "&height1=" + height1 +"&left1="+left1+"&top1="+top1+"&adid2="+adid2+"&width2="+width2+"&heigth2="+height2+"&top2="+top2+"&left2="+left2;
 window.open(myURLPreview,"_blank");

});



$("#submitMyVASTTag").click(function(e) {
  var vastTAG = $('#myVastTag').val();
  storage.set({'myVast':vastTAG});
 // var myURL = "http://platform.mediamind.com/MediaMind.QAPlayer/qaplayer.html?"+ $('input:radio[name=Type]:checked').val() +"="+ escape(vastTAG) +"&UIFVersion=uif-4.2.5&asVersion=as3&width=640&height=360&adMode=progressive&scaling=enabled&overlayCb=disabled&autostart=enabled&allowScriptAccess=always&wmode=opaque&optEnabled=on&optTimestamp=on&optPause=undefined&optAutoScroll=on&optUIFOnly=on&optAdOnly=on&tab=adsSelector";
  var myURL = "http://services.mediamind.com/instream/players/instream-player/views/qa-interface.html?"+ $('input:radio[name=Type]:checked').val() +"="+ escape(vastTAG) +"&overlay=&player-type=as3&width=640&height=360&controls=below&auto-start=true&script-access=always&wmode=opaque";
  window.open(myURL,"_blank");

});





$("#submitMyFont").click(function(e) {
  var FontSave = $('#myFont').val();
  storage.set({'nameFont':FontSave});
  var myURL = "http://demo.sizmek.com/Europe/tools/fonts/index.php?font="+ escape(FontSave) + "&mm=font " + FontSave ;
  window.open(myURL,"_blank");

});


function focusOrCreateTab(url) {
  chrome.windows.getAll({"populate":true}, function(windows) {
    var existing_tab = null;
    for (var i in windows) {
      var tabs = windows[i].tabs;
      for (var j in tabs) {
        var tab = tabs[j];
        if (tab.url == url) {
          existing_tab = tab;
          break;
        }
      }
    }
    if (existing_tab) {
      chrome.tabs.update(existing_tab.id, {"selected":true});
    } else {
      chrome.tabs.create({"url":url, "selected":true});
    }
  });
}
