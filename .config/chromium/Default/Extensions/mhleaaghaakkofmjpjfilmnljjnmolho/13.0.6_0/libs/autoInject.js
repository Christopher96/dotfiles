var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
var context = canvas.getContext("2d"); 
chrome.browserAction.setIcon({path: 'img/icons/icon_32.png'});
chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});
chrome.browserAction.setBadgeText ({ text: "0" } );
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
var Saveids = "";
var contids = 0;
var SizmekMDX = false;
var MyFirstTime = true;
var floatWindowInt = "no";
var pro = true;
var mdx_server = "serving-sys.com/";
//var nxt_server = "prod.sizmdx.com/";
var nxt_server = "platform.sizmek.com/";

storage.set({'isNXT': "no"});

var mdx_formats = new Array(
	"cn=rsb", 		//0-Rich BANNER
	"cn=sb",		//1-Standard
	"cn=adserver",	//2-Floating
	"cn=dt",		//3-DynamicRetargeting
	"cn=dtgets",	//4-Retargeting Reading
	"cn=dtsets",	//5-Retargeting Writing
	"cn=ot",		//6-onetag
	"cn=gs",		//7-SetState read
	"cn=setstate",	//8-SetState write
	"cn=tf",		//9-tracking Ad
	"mc=imp",		//10-impresiontracking
	"mc=click",		//11-clickcommand
	"cn=as",		//12-Retargeting
	"cn=tis",		//13-Instream impresion
	"cn=bisi",		//14-Redirect Instream
	"cn=ig",		//15-In Gaming
	"cn=textlink",	//16-Text Link
	"cn=brd",		//17-Imagen Default
	"cn=bsr",		//18-Imagen Default
	"instream",		//19-vast
	"addat.xml"		//20-
);

var mdx_formats_name = new Array(
	"RICH", 		//0-Rich BANNER
	"STD.",			//1-Standard
	"FLOAT",		//2-Floating
	"DYN.RET.",		//3-DynamicRetargeting
	"DYN.RET.(get)",//4-Retargeting Reading
	"DYN.RET.(clear)",//5-Retargeting Writing
	"ONETAG",		//6-onetag
	"SetState(read)",//7-SetState read
	"SetState(set)",//8-SetState write
	"",				//9-tracking Ad
	"IMP.",			//10-impresiontracking
	"CLICKCOMM.",	//11-clickcommand
	"ACT.",			//12-Retargeting
	"IMP.INSTR.",	//13-Instream impresion
	"CLICK.INSTR.",	//14-Redirect Instream
	"INGAME.",		//15-In Gaming
	"TEXTLINK",		//16-Text Link
	"DEF.IMG.",		//17-Imagen Default
	"DEF.IMG.",		//18-Imagen Default
	"VAST",			//19-vast
	""		//20-
);

var nxt_formats = new Array(
	"cn=display",	//0-Display
	"plu=0",	 	//1-Display
	"c=23", 		//2-Display+instream
	"c=25", 		//3-Display+tracking inStream
	"c=24", 		//4-Display+impression inStream
	"cn=trd", 		//5-Tracking click
	"c=19", 		//6-Display+Tracking impresion
	"c=28",			//7-in-Banner
	"c=20" 			//8-clicks
);

var nxt_formats_name = new Array(
	"DISPLAY", 			//0-Display
	"DISPLAY",	 		//1-Display
	"INSTREAM", 		//2-Display inStream
	"TRACK.INSTREAM", 	//3-Display tracking inStream
	"IMP.INSTREAM", 	//4-Display impression inStream
	"TRACK.CLICK", 		//5-Tracking click
	"TRACK.IMP.", 		//6-Tracking impresion
	"IN-BANNER", 		//7-Display In-banner
	"CLICK" 			//8-Cick
);


var mdx_variable = new Array(
	"pli=", 				//0-ID
	"kw=", 					//1-kw
	"&", 					//2-&
	"ai=", 					//3-AI
	"vid=", 				//4-Version
	"flightid=", 			//5-FlightID
	"tid=",					//6-Retargeting ID
	"clear",				//7-Retargeting clear
	"tval=",				//8-Retargeting value
	"campaignid=",			//9-SetState
	"statevalue=",			//10-StateValue
	"onetagid=",			//11-onetagID
	"seccall",				//12-Seccall
	"activityid=",			//13-Activityid
	"adwith=",				//14-adwith
	"adheigth=",			//15-adheigth
	"adid=",				//16-adid
	"&w=",					//17-Width
	"&h=",					//18-Height
	"features/screenshot/",	//19-features Screenshots
	"features/feeds/", 		//20-Features feed
	"int",					//21-INT
	"pli%3d",				//22-pli
	"eyeblasterid",			//23-eyeblasterid
	"~",					//24-chartosearch
	"/"						//25-features
); 

var mdx_interactions = new Array(
	"^vs",
	"ebuserinitiated",
	"interactionid",
	"ebclose",
	"ebvideounmuted",
	"ebvideounmute",
	"ebvideostarted",
	"ebuniquevideostarted",
	"eb25per_played",
	"eb50per_played",
	"eb75per_played",
	"ebvideofullplay",
	"ebvideoreplay",
	"ebuserinitiated",
	"ebpanelsviewed",
	"ebdwelltime",
	"ebuniquedwell",
	"ebdatacapture"
);

var mdx_interactions_name = new Array(
	"Visibility",
	"UserInitiated",
	"InteractionID",
	"ClosePanel",
	"VideoUnMuted",
	"VideoUnMute",
	"VideoStarted",
	"UniqueVideoStarted",
	"25per",
	"50per",
	"75per",
	"VideoFullPlay",
	"VideoReplay",
	"userInteraction",
	"PanelViewed",
	"DwellTime",
	"UniqueDwell",
	"DataCapture"
);

//----------------------------------------------------------------------------
function findString(urlToCheck,stringToSearch){
	if(urlToCheck.indexOf(stringToSearch)!=-1){
		return true;
	}else{
		return false;
	}
}

function checkKW(urlToCheck,formatType,idPlacement,tab_id){
	if(findString(urlToCheck,mdx_variable[1])){ //KW
		varKW = urlToCheck.substr(urlToCheck.indexOf(mdx_variable[1])+3);
		if(findString(varKW,mdx_variable[2])){
		   varKW = varKW.substr(0,varKW.indexOf(mdx_variable[2]));
		}
		updateKodeId(tab_id,formatType+": "+idPlacement+"<br>KW: "+varKW);
   	}else{
		updateKodeId(tab_id,formatType+": "+idPlacement);
	}
}

function checkAI(urlToCheck,formatType,idPlacement,tab_id){
	if(findString(urlToCheck,mdx_variable[3])){ //AI id testing
		idPlacement = urlToCheck.substr(urlToCheck.indexOf(mdx_variable[3])+3,longId);
		idPlacement =  idPlacement.replace(/[^0-9\.]+/g, '');
		if(findString(urlToCheck,mdx_variable[4])){ //VID - ID version
			idVersion = urlToCheck.substr(urlToCheck.indexOf(mdx_variable[4])+4,longId);
			idVersion =  idVersion.replace(/[^0-9\.]+/g, '');
			updateKodeId(tab_id,formatType+": "+idPlacement+"<br>VER. ID: "+idVersion);  
		}else{
			updateKodeId(tab_id,formatType+": "+idPlacement);  
		}
	}
}

function givemeaValue(urlToCheck,variable){ 
	nextVar = urlToCheck.substr(urlToCheck.indexOf(variable)+variable.length)
	if(findString(nextVar,mdx_variable[2])){
		nextVar = nextVar.substr(0,nextVar.indexOf(mdx_variable[2]))	
	}
//	nextVar =  nextVar.replace(/[^0-9\.]+/g, '');
	return nextVar;
}

function givemeaValueInt(urlToCheck,variable){ 
	nextVar = urlToCheck.substr(urlToCheck.indexOf(variable)+variable.length)
	if(findString(nextVar,mdx_variable[24])){
		nextVar = nextVar.substr(0,nextVar.indexOf(mdx_variable[24]))	
	}
//	nextVar =  nextVar.replace(/[^0-9\.]+/g, '');
	return nextVar;
}

function givemeaValueFeatures(urlToCheck,variable){ 
	nextVar = urlToCheck.substr(urlToCheck.indexOf(variable)+variable.length)
	if(findString(nextVar,mdx_variable[25])){
		nextVar = nextVar.substr(0,nextVar.indexOf(mdx_variable[25]))	
	}
//	nextVar =  nextVar.replace(/[^0-9\.]+/g, '');
	return nextVar;
}

function changeColorNXT(){
    storage.set({'isNXT': "yes"});
}


function onBeforeRequest(deets) {
    var checkURL = deets.url, tab_id = deets.tabId;
	var longId = 8;
	
    checkURL= checkURL.toLowerCase();
    if(SizmekMDX==false){
        if(findString(checkURL , mdx_server) || findString(checkURL , nxt_server)){
			if(findString(checkURL , nxt_server)){
				changeColorNXT();
			}
//nxt_formats_name,nxt_formats
//////NXT////////////////////////////////////////////////////////////////////////NXT
            if(findString(checkURL,nxt_formats[0])){ //DISPLAY
	            if(findString(checkURL,nxt_formats[1])){ //Display
					if(findString(checkURL,mdx_variable[0])){ //PLI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[1],idPlacement,tab_id);
						}else{
							checkAI(checkURL,nxt_formats_name[1]+" (TEST)",idPlacement,tab_id);         
						}
					}
					if(findString(checkURL,mdx_variable[3])){ //UI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[3]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[1]+" (TEST)",idPlacement,tab_id);         
						}
					}
                }
				
	            if(findString(checkURL,nxt_formats[2])){ 
					if(findString(checkURL,mdx_variable[0])){ //PLI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[2],idPlacement,tab_id);
						}else{
							checkAI(checkURL,nxt_formats_name[2]+" (TEST)",idPlacement,tab_id);         
						}
					}
					if(findString(checkURL,mdx_variable[3])){ //UI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[3]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[2]+" (TEST)",idPlacement,tab_id);         
						}
					}
                }
				
	            if(findString(checkURL,nxt_formats[3])){ 
					if(findString(checkURL,mdx_variable[0])){ //PLI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[3],idPlacement,tab_id);
						}else{
							checkAI(checkURL,nxt_formats_name[3]+" (TEST)",idPlacement,tab_id);         
						}
					}
					if(findString(checkURL,mdx_variable[3])){ //UI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[3]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[3]+" (TEST)",idPlacement,tab_id);         
						}
					}
                }
				
	            if(findString(checkURL,nxt_formats[4])){ 
					if(findString(checkURL,mdx_variable[0])){ //PLI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[4],idPlacement,tab_id);
						}else{
							checkAI(checkURL,nxt_formats_name[4]+" (TEST)",idPlacement,tab_id);         
						}
					}
					if(findString(checkURL,mdx_variable[3])){ //UI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[3]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[4]+" (TEST)",idPlacement,tab_id);         
						}
					}
                }
				
	            if(findString(checkURL,nxt_formats[6])){
					if(findString(checkURL,mdx_variable[0])){ //PLI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[6],idPlacement,tab_id);
						}else{
							checkAI(checkURL,nxt_formats_name[6]+" (TEST)",idPlacement,tab_id);         
						}
					}
					if(findString(checkURL,mdx_variable[3])){ //UI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[3]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[6]+" (TEST)",idPlacement,tab_id);         
						}
					}
				}
	            if(findString(checkURL,nxt_formats[7])){ 
					if(findString(checkURL,mdx_variable[0])){ //PLI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[7],idPlacement,tab_id);
						}else{
							checkAI(checkURL,nxt_formats_name[7]+" (TEST)",idPlacement,tab_id);         
						}
					}		
					if(findString(checkURL,mdx_variable[3])){ //UI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[3]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[7]+" (TEST)",idPlacement,tab_id);         
						}
					}
                }
	            if(findString(checkURL,nxt_formats[8])){
					if(findString(checkURL,mdx_variable[0])){ //PLI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[8],idPlacement,tab_id);
						}else{
							checkAI(checkURL,nxt_formats_name[8]+" (TEST)",idPlacement,tab_id);         
						}
					}
					if(findString(checkURL,mdx_variable[3])){ //UI - ID
						idPlacement = givemeaValue(checkURL,mdx_variable[3]);
						if(idPlacement!=0){
							checkKW(checkURL,nxt_formats_name[8]+" (TEST)",idPlacement,tab_id);         
						}
					}
                }
            }
			
//////TRD///////////////////////////////////////////////////////////////////////////////
			if(findString(checkURL,nxt_formats[5])){ //Display instream
				if(findString(checkURL,mdx_variable[0])){ //PLI - ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
					if(idPlacement!=0){
						checkKW(checkURL,nxt_formats_name[5],idPlacement,tab_id);
					}else{
						checkAI(checkURL,nxt_formats_name[5]+" (TEST)",idPlacement,tab_id);         
					}
				}
				if(findString(checkURL,mdx_variable[3])){ //UI - ID
					idPlacement = givemeaValue(checkURL,mdx_variable[3]);
					if(idPlacement!=0){
						checkKW(checkURL,nxt_formats_name[8]+" (TEST)",idPlacement,tab_id);         
					}
				}
			}

			
//////MDX///////////////////////////////////////////////////////////////////////////////
//////RICHBANNER////////////////////////////////////////////////////////////////////////RICHBANNER
            if(findString(checkURL,mdx_formats[0])){ //TAG rich
                if(findString(checkURL,mdx_variable[0])){ //PLI - ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
                    if(idPlacement!=0){
						checkKW(checkURL,mdx_formats_name[0],idPlacement,tab_id);
                    }else{
						checkAI(checkURL,mdx_formats_name[0]+" (TEST)",idPlacement,tab_id);         
                    }
                }
            }

//////STANDARD////////////////////////////////////////////////////////////////////////STANDARD
            if(findString(checkURL,mdx_formats[1])){ //TAG Standard
                if(findString(checkURL,mdx_variable[0])){ //PLI - ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
                     if(idPlacement!=0){
						 checkKW(checkURL,mdx_formats_name[1],idPlacement,tab_id);
                    }else{
						checkAI(checkURL,mdx_formats_name[1]+" (TEST)",idPlacement,tab_id);
                    }
                }
            }

            //ebserving / adserver
//////FLOATING////////////////////////////////////////////////////////////////////////
            if(findString(checkURL,mdx_formats[2])){ //TAG floating
                if(findString(checkURL,mdx_variable[5])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[5]);
                    if(idPlacement!=0){
						checkKW(checkURL,mdx_formats_name[2],idPlacement,tab_id);
                    }else{
						checkAI(checkURL,mdx_formats_name[2]+" (TEST)",idPlacement,tab_id);
                    }
                }
            }

//////DYNAMIC RETARGETING////////////////////////////////////////////////////////////////////////
			if(findString(checkURL,mdx_formats[3])){ //Dynamic Retargeting			
               if(findString(checkURL,mdx_formats[4])){ //Retargeting Reading
                    if(findString(checkURL,mdx_variable[6])){ //Retargeting ID
						idPlacement = givemeaValue(checkURL, mdx_variable[6]);
                        addKodeId(tab_id,mdx_formats_name[4]+": "+idPlacement);
                    }
                }else{
					if(findString(checkURL,mdx_variable[8])){ //tval
						varsRetargeting = checkURL.substr(checkURL.indexOf(mdx_variable[8]));
						varsRetargeting = varsRetargeting.substr(0,varsRetargeting.indexOf("&"));
						arrayVals = null;
						arrayVals = varsRetargeting.split("$");
						varsRetargeting="";
						for(var i = 0; i < arrayVals.length; i++) {
							arrayVals[i] = arrayVals[i].replace(/^\s*/, "").replace(/\s*$/, "").replace(/[^0-9\.]+/g, '');
							varsRetargeting = varsRetargeting+ "TVAL("+(i+1)+"):" + arrayVals[i] + '<br>';
						}
						updateKodeId(tab_id,mdx_formats_name[3]+": "+idPlacement + "<br>" + varsRetargeting);
					}

                    if(findString(checkURL,mdx_formats[5])){ //Retargeting Set
                        if(findString(checkURL,mdx_variable[7])){ //clear
                            if(findString(checkURL,mdx_variable[6])){ //Retargeting ID
								idPlacement = givemeaValue(checkURL, mdx_variable[6]);
                                addKodeId(tab_id,mdx_formats_name[5]+": "+idPlacement);
                            }
                        }					
                    }else{
                        if(findString(checkURL,mdx_formats[5])){ // ID
							idPlacement = givemeaValue(checkURL, mdx_variable[6]);
                            if(findString(checkURL,mdx_variable[8])){ //variables
                                varsRetargeting = checkURL.substr(checkURL.indexOf(mdx_variable[8]));
                                varsRetargeting = varsRetargeting.substr(0,varsRetargeting.indexOf("&"));
                                arrayVals = varsRetargeting.split("$");
                                varsRetargeting="";
                                for(var i = 0; i < arrayVals.length; i++) {
                                    arrayVals[i] = arrayVals[i].replace(/^\s*/, "").replace(/\s*$/, "").replace(/[^0-9\.]+/g, '');
                                    varsRetargeting = varsRetargeting+ "TVAL("+(i+1)+"):" + arrayVals[i] + '<br>';
                                }
                                updateKodeId(tab_id,mdx_formats_name[3]+": "+idPlacement + "<br>" + varsRetargeting);
                            }else{
                                updateKodeId(tab_id,mdx_formats_name[3]+": "+idPlacement);
                            }
                        }                        
                    }

                }
            }

//////SET STATE READ////////////////////////////////////////////////////////////////////////
            if(findString(checkURL,mdx_formats[7])){ //SetState read
				idPlacement = givemeaValue(checkURL, mdx_variable[9]);
                updateKodeId(tab_id,mdx_formats_name[7]+": "+ idPlacement);
			}
			
//////SET STATE WRITE////////////////////////////////////////////////////////////////////////
            if(findString(checkURL,mdx_formats[8])){ //SetState write
				idPlacement = givemeaValue(checkURL, mdx_variable[9]);
				statevalue = givemeaValue(checkURL, mdx_variable[10]);
                updateKodeId(tab_id,mdx_formats_name[8]+": "+ idPlacement + "<br>Value: " + statevalue);
			}

//////ONE TAG////////////////////////////////////////////////////////////////////////
            if(findString(checkURL,mdx_formats[6])){ //OneTag
                if(findString(checkURL,mdx_variable[11])){ //ID
                   	idPlacement = givemeaValue(checkURL,mdx_variable[11]);
                    updateKodeId(tab_id,mdx_formats_name[6]+": "+ idPlacement);
                }

              /*  if(checkURL.indexOf("pageurl")!=-1){ //pageurl
                    idPlacement = checkURL.substr(checkURL.indexOf("pageurl")+longId);
                    //mysms="";
                  //  updateKodeId(tab_id,"<a href='#' onclick=\"alert('hola');return false\" style='color: white;'>PAGEURL</a>");
                }*/
//////SecCall////////////////////////////////////////////////////////////////////// SecCall
                if(findString(checkURL,mdx_variable[12])){ //SECCALL
                    updateKodeId(tab_id,"-SecCall");
                }
            }else{
//////VIS VERI////////////////////////////////////////////////////////////////////// VIS VERI
                if(findString(checkURL,mdx_variable[12])){ //SECCALL
                    updateKodeId(tab_id,"-Vis/Veri");
                }
            }


//////IMPRESION////////////////////////////////////////////////////////////////////////
              if(findString(checkURL,mdx_formats[10])){//impresion
                    if(findString(checkURL,mdx_variable[0])){ //ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
                        updateKodeId(tab_id,mdx_formats_name[10]+": "+ idPlacement);
                    }
              }			  

//////TRACKING AD////////////////////////////////////////////////////////////////////////
              if(findString(checkURL,mdx_formats[9])){//Tracking Ad
                if(findString(checkURL,mdx_formats[11])){ //clickcommand
                    if(findString(checkURL,mdx_variable[0])){ //ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
                        updateKodeId(tab_id,mdx_formats_name[11]+": "+ idPlacement);
                    }
                }
				
                if(findString(checkURL,mdx_formats[12])){ //impresiontracking
					if(findString(checkURL,mdx_variable[0])){ //ID
						idPlacement = givemeaValue(checkURL,mdx_variable[0]);
						updateKodeId(tab_id,mdx_formats_name[12]+": "+ idPlacement);
					}
				}
            }
//////RETARGETING///////////////////////////////////////////////////////////////////////
              if(findString(checkURL,mdx_formats[12])){//Retargeting
                if(findString(checkURL,mdx_variable[13])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[13]);
					updateKodeId(tab_id,mdx_formats_name[12]+": "+ idPlacement);
                }
			  }

//////IMPRESION INSTREAM///////////////////////////////////////////////////////////////////////
              if(findString(checkURL,mdx_formats[13])){//INSTREAM IMPRESION
                if(findString(checkURL,mdx_variable[0])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
					updateKodeId(tab_id,mdx_formats_name[13]+": "+ idPlacement);
                }
			  }

//////BANNER REDIRECT INSTREAM///////////////////////////////////////////////////////////////////////
             if(findString(checkURL,mdx_formats[14])){//INSTREAM IMPRESION
                if(findString(checkURL,mdx_variable[0])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
					updateKodeId(tab_id,mdx_formats_name[14]+": "+ idPlacement);
                }
			 }
//////IN GAMING//////////////////////////////////////////////////////////////////////
			if(findString(checkURL,mdx_formats[15])){ //IN GAMING
				if(findString(checkURL,mdx_variable[0])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
					updateKodeId(tab_id,mdx_formats_name[15]+": "+ idPlacement);
				}
			}

//////TEXT LINK//////////////////////////////////////////////////////////////////////
			if(findString(checkURL,mdx_formats[16])){ //IN GAMING
				if(findString(checkURL,mdx_variable[0])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
					updateKodeId(tab_id,mdx_formats_name[16]+": "+ idPlacement);
				}
			}
//////IMAGEN DEFAULT//////////////////////////////////////////////////////////////////////
			if(findString(checkURL,mdx_formats[17])){ //IMAGEN DEFAULT
				if(findString(checkURL,mdx_variable[0])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
					updateKodeId(tab_id,mdx_formats_name[17]+": "+ idPlacement);
				}
			}
			if(findString(checkURL,mdx_formats[18])){ //IMAGEN DEFAULT
				if(findString(checkURL,mdx_variable[5])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[5]);
					updateKodeId(tab_id,mdx_formats_name[18]+": "+ idPlacement);
				}
			}
///////VAST//////////////////////////////////////////////////////////////////////////
			if(findString(checkURL,mdx_formats[19])){ //VAST
				if(findString(checkURL,mdx_variable[5])){ //ID
					idPlacement = givemeaValue(checkURL,mdx_variable[0]);
                    udateKodeId(tab_id,mdx_formats_name[19]+": "+ idPlacement);
                }
///////VAST WIDTH HEIGTH//////////////////////////////////////////////////////////////////////////
                if(findString(checkURL,mdx_variable[14])){ //width height
                    sizeFormat = givemeaValue(checkURL,mdx_variable[14]);
                    w_format = sizeFormat.replace(/[^0-9\.]+/g, '');
                    sizeFormat = givemeaValue(checkURL,mdx_variable[15]);
                    h_format = sizeFormat.replace(/[^0-9\.]+/g, '');
                    addKodeId(tab_id,"-"+w_format+"x"+h_format);
                }
            }else{
///////VAST WIDTH HEIGTH//////////////////////////////////////////////////////////////////////////
                if(findString(checkURL,mdx_formats[20])){
                    if(findString(checkURL,mdx_variable[16])){ //ID
						idPlacement = givemeaValue(checkURL,mdx_variable[16]);
                        udateKodeId(tab_id,mdx_formats_name[19]+": "+ idPlacement);
                    }
                }else{
					if(findString(checkURL,mdx_variable[17])){ //width height						                   
                        sizeFormat = givemeaValue(checkURL,mdx_variable[17]);
                        w_format = sizeFormat.replace(/[^0-9\.]+/g, '');
                        sizeFormat = givemeaValue(checkURL,mdx_variable[18]);
                        h_format = sizeFormat.replace(/[^0-9\.]+/g, '');
                        addKodeId(tab_id,"("+w_format+"x"+h_format+")");
                    }
                }
            }
///////ONLY PRO//////////////////////////////////////////////////////////////////////////
			if(pro==true){
	            if(findString(checkURL,mdx_variable[19])){ //sitesnap
					idPlacement = givemeaValueFeatures(checkURL,mdx_variable[19]);
	                updateKodeId(tab_id,"SiteSnap: "+ idPlacement);
	            }

	            if(findString(checkURL,mdx_variable[20])){ //filesnap
					idPlacement = givemeaValueFeatures(checkURL,mdx_variable[20]);
	                updateKodeId(tab_id,"FileSnap: "+ idPlacement);
	            }
	        }
////////////////////////////////////////////
               
            checkFloatingWindowInt();
            if(floatWindowInt=="yes"){           
                if(findString(checkURL,mdx_variable[21])){//INTERACTIONS
                    var idInter="";
                    if(findString(checkURL,mdx_variable[21]+"=")){ //ID
						idPlacement = givemeaValueInt(checkURL,mdx_variable[21]+"=");
                        idInter="<br>("+idPlacement + ")";
                    }

					for (i = 0; i < mdx_interactions.length; i++) { 
						if(findString(checkURL,mdx_interactions[i])){ //INTERACTIONS
							addKodeId(tab_id,"INT:"+mdx_interactions_name[i]+"" + idInter);
						}
					}

                }

                if(findString(checkURL,mdx_formats[17])){ //CLICK
                    if(findString(checkURL,mdx_variable[22])){ //ID
						idPlacement = givemeaValue(checkURL,mdx_variable[22]);
                        alert("--CLICKED--" + "\n" +"ID: "+idPlacement);
                        updateKodeId(tab_id,"--CLICKED-- ID: "+idPlacement);
                    }else{
                        if(findString(checkURL,mdx_variable[23])){ //ID
                           	idPlacement = givemeaValue(checkURL,mdx_variable[23]+"=");
                            alert("--CLICKED--" + "\n" +"ADID: "+idPlacement);
                            updateKodeId(tab_id,"--CLICKED-- ADID: "+idPlacement);
                        }else{
                            alert("--CLICKED--");
                            updateKodeId(tab_id,"--CLICKED--");
                        }
                    }
                }
            } 
        }
    }
}

function updateKodeId(tab_Myid,action){
    if(MyFirstTime==true){
        chrome.browserAction.setIcon({path: 'img/icons/icon_32_on.png', tabId: tab_Myid});
        chrome.browserAction.setBadgeBackgroundColor({ color: [51, 0, 51, 230], tabId: tab_Myid });
        MyFirstTime=false;
    }
    contids+=1;
    chrome.browserAction.setBadgeText({text: contids.toString(),tabId: tab_Myid });
    chrome.tabs.executeScript(tab_Myid,{code: '  if (window.jQuery) { \n var kodeDiv = $("#kodeId"); \n kodeDiv.append( "<div class=\'kodeDiv\'>'+action+'</div>" ); \n kodeDiv.show(); \n}'}, function(result) {
    });
	saveMonitor(action);
}

function addKodeId(tab_Myid,action){
    if(MyFirstTime==true){
        chrome.browserAction.setIcon({path: 'img/icons/icon_32_on.png', tabId: tab_Myid});
        chrome.browserAction.setBadgeBackgroundColor({ color: [51, 0, 51, 230], tabId: tab_Myid });
        MyFirstTime=false;
    }
    chrome.tabs.executeScript(tab_Myid,{code: '  if (window.jQuery) { \n var kodeDiv = $("#kodeId"); \n kodeDiv.append( "<div class=\'kodeDiv\'>'+action+'</div>" ); \n kodeDiv.show(); \n}'}, function(result) {
    });
}



function saveMonitor(actualId){
    Saveids = Saveids + "@" + actualId;
    storage.get('TotalIDs', function(items) {
        if (items.TotalIDs) {
            var sumaTodo =  items.TotalIDs +"@"+Saveids;
            storage.set({'TotalIDs':sumaTodo});                     
        }else{
            storage.set({'TotalIDs':Saveids});                     
        }
    });
}

function onNavigation(deets) {
    var tab_id = deets.tabId;
    SizmekMDX = false;
    Saveids = "";
    //contids =0;

    if (deets.url.indexOf('platform.mediamind.com') !=-1) {
		if(pro==false){
	        SizmekMDX = true;
		}
         return;
    }else{
        SizmekMDX = false;
    }
    if (!isValidTopLevelNavigation(deets)) {
        //SizmekMDX = true;
       // if (deets.url.indexOf('https://chrome.google.com/webstore/') === 0) {
      //  }
        return;
    }
}


function logLatency(deets, success) {
    var request_id = deets.requestId,
        tab_id = deets.tabId,
        checkURL = deets.url;
}

function isValidTopLevelNavigation(deets) {
    var url = deets.url;
    return deets.frameId === 0 &&
        deets.tabId > 0 &&
        url.indexOf('http') === 0 &&
        url.indexOf('https://chrome.google.com/webstore/') !== 0;
}

function checkFloatingWindowInt(){
    storage.get('floatingWindowInt', function(items) {
        if (items.floatingWindowInt) {
            floatWindowInt = items.floatingWindowInt;
        }else{
            storage.set({'floatingWindowInt': "no"});
            floatWindowInt = "no";
        }
    });   
}

function init() {
    chrome.webNavigation.onCommitted.addListener(onNavigation);
    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
            urls: ['http://*/*', 'https://*/*']
    }, ['blocking']);

    chrome.tabs.onActiveChanged.addListener(function (tab_id) {
        contids =0;
        checkFloatingWindowInt();
    });

    chrome.webNavigation.onDOMContentLoaded.addListener(function (deets) {
        var tab_id = deets.tabId;
        if (!isValidTopLevelNavigation(deets)) {
            return;
        }
    });

    chrome.tabs.onUpdated.addListener(function(tab_Id, changeInfo, tab)   {
        if(changeInfo.status=="loading"){
            contids =0;
            chrome.browserAction.setIcon({path: 'img/icons/icon_32.png',tabId: tab_Id});
            chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230],tabId: tab_Id});
            MyFirstTime=true;
			storage.set({'isNXT': "no"});
        }
    });

}    

init();

