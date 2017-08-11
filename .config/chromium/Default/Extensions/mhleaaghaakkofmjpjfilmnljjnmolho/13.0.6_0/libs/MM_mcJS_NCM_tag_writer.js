var ebScriptFileName = "MM_mcJS_NCM_tag_writer.js";

function scriptPath()
{
    var scripts = document.getElementsByTagName('SCRIPT');
    var path = '';
        for(var i = 0; i < scripts.length; i++)
		{
            var temp_PATH = scripts[i].src;
			if(temp_PATH.indexOf(ebScriptFileName)>-1)
			{
                path = temp_PATH;
            }
        }
		return path;
}

function GetQueryStringParams(sParam)
{
	var sPageURL = scriptPath;
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam)
        {
		    return sParameterName[1];
        }
    }
}



function WriteMyTAG(placementID, adWIDTH, adHEIGHT, campaignID, targetDIV,secureSite)
{
		var ebRand = new String(Math.random());
		ebRand = ebRand.substr(ebRand.indexOf(".") + 1);
		var divId = "ebDiv" + ebRand;
		var myDiv=document.createElement("div");
		myDiv.id=divId;
	
		var findMyID = document.getElementById(targetDIV);
		//var iframeID=false;
		if(findMyID){
			findMyID.innerHTML=" ";
			var targetDiv=document.getElementById(targetDIV)
			//if(targetDiv.tagName == "IFRAME"){
			//	iframeID = true;
			//	targetDiv.appendChild(myDiv);
		//	}else{
				targetDiv.appendChild(myDiv);
			//}
		}else{
			var confirmar=confirm("I can't find the ID :( \nI will continue using a floatingDiv (like a 1x1),\nContinue?"); 
			if (confirmar) {
				var iDiv = document.createElement('div');
				iDiv.id = 'ebKode_1x1';
				iDiv.style.cssText = 'position:absolute;top:0px;left:0px;width:1px !important;height:1px !important;';
				document.getElementsByTagName('body')[0].appendChild(iDiv);
				iDiv.appendChild(myDiv);
			}else{
				return 0;
			} 
		}

		var ebNewTag = window.ebNewTag = {};
		var ebPtcl;
		if(secureSite){
			ebPtcl = "https://";
		}else{
			ebPtcl = "http://";
		}

		ebNewTag.containerId = divId;
															
		//ebNewTag.partialRequest = ebPtcl + "bs.serving-sys.com/BurstingPipe/adServer.bs?cn=rb&c=22&ai="+placementID+"&w="+adWIDTH+"&h="+adHEIGHT+"&ord="+ebRand+"&pr=1&pi=0&dlm=3";
	//	ebNewTag.partialRequest = ebPtcl + "bs.serving-sys.com/BurstingPipe/adServer.bs?cn=rsb&c=28&ai="+placementID+"&PluID=0&w="+adWIDTH+"&h="+adHEIGHT+"&ord="+ebRand+"&ucm=true";
		ebNewTag.partialRequest = ebPtcl + "bs.serving-sys.com/BurstingPipe/adServer.bs?cn=rsb&c=28&pli="+placementID+"&PluID=0&w="+adWIDTH+"&h="+adHEIGHT+"&ord="+ebRand+"&ucm=true";
		ebNewTag.ebPtcl = ebPtcl;
		ebNewTag.sms = (ebNewTag.ebPtcl == "https://") ? "secure-" + "ds.serving-sys.com/BurstingScript/" : "ds.serving-sys.com/BurstingScript/";
		ebNewTag.placementId = placementID;
		ebNewTag.width = adWIDTH;
		ebNewTag.height = adHEIGHT;
		ebNewTag.asyncMode = true;
		//ebNewTag.campaignId = campaignID;
		ebNewTag.ffs = [];
		var ebPreServingScript = ebNewTag.ebPtcl + ebNewTag.sms + "ebPreServing.js";
		
		var myScript=document.createElement("script");
		myScript.type = 'text/javascript';
		myScript.src=ebPreServingScript;
	//	if(iframeID ==false){
		myDiv.appendChild(myScript);

		/*var container = document.getElementById(divId);
		container.innerHTML = myDiv;		
*/
		//myDiv.innerHTML = myScript;
		//}else{
		//	alert(myScript.toSource());
			/*var iframe = top.frames[targetDIV].document;
			iframe.open();
			//iframe.write(myScript.toSource());
			iframe.close();*/
	//	}

	/*
		var myScript=document.createElement("script");
		myScript.type = 'text/javascript';
		myScript.src="http://bs.preview.serving-sys.com/BurstingPipe/adServer.bs?cn=rb&amp;c=22&amp;pr=1&amp;w=300&amp;h=250&amp;ai=20057964&amp;pi=0&amp;dlm=3";
		myDiv.appendChild(myScript);
*/
		alert("Done!");
		return 1;
}
	

var scriptPath = scriptPath();

var placementID = GetQueryStringParams('placementId');
var campaignID = "";//GetQueryStringParams('campaignId');
var adWIDTH = GetQueryStringParams('ADwidth');
var adHEIGHT = GetQueryStringParams('ADheight');
var targetDIV = GetQueryStringParams('ADcontainer');
var secureSite = GetQueryStringParams('secureSITE');

var result = WriteMyTAG(placementID, adWIDTH, adHEIGHT, campaignID, targetDIV,secureSite);
