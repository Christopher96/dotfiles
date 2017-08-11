/* For:
     _                    _    
 ___(_)_____ __ ___   ___| | __
/ __| |_  / '_ ` _ \ / _ \ |/ /
\__ \ |/ /| | | | | |  __/   < 
|___/_/___|_| |_| |_|\___|_|\_\
Idea, designed and developed by Jose Luis Pinilla Rocha ^_^
code02@gmail.com

2015 Spain
*/
chrome.tabs.getSelected(null, function(tab){
    chrome.tabs.executeScript({code: 'var myIframe=window.frames["previewServer"]; if(myIframe){ var iframes=myIframe.document.getElementsByTagName("iframe"); if(iframes[0]){iframes[0].src;}}'}, function(result) {
        var QRDiv = document.querySelector('.content');
        if (chrome.runtime.lastError) {
			$('#imageQR').removeAttr("href");
			$("#downloadQR").css("display","none");
			$("#linkQR").css("display","none");
        } else {
			if(result[0]!=null)	{
				var url = "https://chart.googleapis.com/chart?cht=qr"+
				  "&chs=200x200&choe=UTF-8&chld=Q|0&chl=" + escape(result[0]) + "";
			 	$("#imageQR").attr("href", result[0]);
			}else{
				var url = "https://chart.googleapis.com/chart?cht=qr"+
					  "&chs=200x200&choe=UTF-8&chld=Q|0&chl=" + escape(tab.url)  + "";
			  	$("#imageQR").attr("href", tab.url);
			}

            if (tab.favIconUrl) {
                $("#fav").attr("src", tab.favIconUrl).show();
            }

            $("#fav, #qr").bind("error", function(e) {
                $(e.target).hide();
            });
       //   $("#imageQR").attr("href",url);
          $("#downloadQR").attr("href",url);
          $("#qr").attr("src", url);

        }
    });
});
