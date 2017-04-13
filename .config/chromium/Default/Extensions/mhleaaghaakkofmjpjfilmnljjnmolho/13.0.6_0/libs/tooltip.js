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
var storage = chrome.storage.local;
 $( document ).ready(function() {
	var floatWindow ="yes";
	var floatWindowInt ="no";
	var isNXT = "no";
	loadIds();
	function loadIds(){
		storage.get('isNXT', function(items) {
		    if (items.isNXT) {
		      	isNXT = items.isNXT;
		    }else{
     			storage.set({'isNXT': "no"});
    		}
		});	
		storage.get('floatingWindow', function(items) {
		    if (items.floatingWindow) {
		      	floatWindow = items.floatingWindow;
		      	if(floatWindow =="yes"){
		     		showMeIds();
				}
		    }else{
     			storage.set({'floatingWindow': "yes"});
		      	showMeIds();
    		}
		});	
	}

	function showMeIds(){
		 if(floatWindow =="yes"){
			var $div = $('<div id="kodeId" class="kodeId" ><div id="kodeClose" href="#"></div><br></div>');
	
			var backgroundPopup, bordePopup;
			if(isNXT=="yes"){
				backgroundPopup = 'url('+chrome.extension.getURL("img/vertical_logo_nxt.png")+') no-repeat 85% 0% rgba(172, 204, 232,0.74902);';
				bordePopup = '3px solid rgb(76, 166, 230);';
				
			}else{
				backgroundPopup = 'url('+chrome.extension.getURL("img/vertical_logo.png")+') no-repeat 80% 0% rgba(29, 61, 105, 0.74902);';
				bordePopup = '2px solid rgb(42, 106, 160);';
			}
	
			$('head').append('<style>.kodeDiv{font-family: Helvetica, Calibri, sans-serif;    font-size: 12px;    line-height: 13px;} #kodeId{background:'+backgroundPopup+' background-size:contain !important; min-height: 60px !important; height: auto !important;			   	max-height:700px !important;			   	line-height: 13px !important;			   	overflow-y:auto !important;			    width: 160px !important;			    display:none;			    right:3% !important;			    top:3% !important;			    z-index:9999999999  !important;			    position: fixed !important;			    padding: 20px 0px 20px 20px !important;			    text-align: left;			    text-decoration: none;			    font: 12px Helvetica, Calibri, sans-serif !important;			    color: rgb(255, 255, 255) !important;			    text-shadow:rgb(84, 108, 141) 1px 1px 2px !important;			    border: '+bordePopup+' !important;			    box-shadow: rgb(28, 29, 29) 2px 2px 5px !important;			    border-radius: 5px !important;			    border-top-left-radius: 5em !important;		  		border-bottom-right-radius: 5em !important;				border-bottom-left-radius: 2em !important;				box-sizing:initial !important;} .kodeId::-webkit-scrollbar {    width: 8px;} .kodeId::-webkit-scrollbar-track {    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3);     border-radius: 5px;   margin-bottom: 60px;  margin-top: 30px;} .kodeId::-webkit-scrollbar-thumb { border-radius: 5px;  -webkit-box-shadow: inset 5px 5px 60px rgba(25, 88, 236, 0.55); </style>');
			$("body").append($div);
			$( "#kodeClose" ).css({ "position": "absolute", "right": "0px", "top" : "0px", "width": "25px", "height": "25px","background": "url(" + chrome.extension.getURL('img/button_close.png') +") no-repeat center center" });
			$( "#kodeClose" ).click(function(){
				 $div.remove();
				//$div.fadeTo( "slow" , 0, function() { $div.remove(); });
		    });
		   // $div.fadeTo( "slow" , 0.8);

		}
	}			
});
