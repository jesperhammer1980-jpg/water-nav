'use strict';
const VERSION='v45.4';
const TILE_MANIFEST_PATH='./data/tiles/ddm-tile-manifest.json';
const MAX_DEPTH_TILES=180;
const MAX_CONTOUR_TILES=36;
const VIEW_TILE_PAD_DEG=0.08;
const STORAGE_KEY='waternav.routes.v1';
const ORIENTATION_KEY='waternav.orientation.v1';
const HOME_KEY='waternav.homePort.v1';
const USER_SETTINGS_KEY='waternav.userSettings.v1';
const OLD_ROUTE_KEYS=['waternav.routes.v34','waternav.routes.v33','waternav.routes.v32','waternav.routes.v31','waternav.routes.v30'];
const OLD_ORIENTATION_KEYS=['waternav.orientation.v34','waternav.orientation.v33','waternav.orientation.v32','waternav.orientation.v31'];
const OLD_HOME_KEYS=['waternav.homePort.v34','waternav.homePort.v33','waternav.homePort.v32','waternav.homePort.v31'];
const state={pickMode:null,start:null,end:null,gps:null,lastSogKn:null,lastCog:null,prevGps:null,contours:[],activeContours:[],routeLayer:null,routeLine:null,routeBounds:null,startMarker:null,endMarker:null,currentRoute:null,pendingRouteSave:null,savedRoutes:[],depthGrid:null,localDepthGrid:null,denmarkDepthGrid:null,depthGridSource:'tiles',tileManifest:null,manifestStatus:'idle',manifestError:null,tileById:new Map(),loadedDepthTiles:new Map(),loadingDepthTiles:new Map(),loadedContourTiles:new Map(),loadingContourTiles:new Map(),visibleTileIds:new Set(),routingTileIds:new Set(),tileUpdateTimer:null,tileProgress:null,tileProgressSeq:0,lastTileLoadError:null,tileErrors:[],failedTileCount:0,lastTileError:null,routeDebug:{lastStatus:'Ingen rute beregnet endnu',lastError:null,pointCount:0,distanceNm:0,layerVisible:false},contourLayerGroup:L.layerGroup(),boatMarker:null,homeMarker:null,forwardLayer:L.layerGroup(),navActive:false,trollingEnabled:true,depthAlarm:true,offRouteAlarm:true,orientationMode:'north',mapRotationDeg:0,homePort:null,trollingDirection:1};
if(typeof window!=='undefined') window.waterNavState=state;
const $=id=>document.getElementById(id);
const startIcon=L.divIcon({className:'start-marker',html:'<div style="width:22px;height:22px;border-radius:50%;background:#24dc86;border:4px solid #fff;box-shadow:0 0 0 4px rgba(0,0,0,.28)"></div>',iconSize:[30,30],iconAnchor:[15,15]});
const endIcon=L.divIcon({className:'end-marker',html:'<div style="width:22px;height:22px;border-radius:50%;background:#ff5066;border:4px solid #fff;box-shadow:0 0 0 4px rgba(0,0,0,.28)"></div>',iconSize:[30,30],iconAnchor:[15,15]});
const boatIcon=L.divIcon({className:'boat-marker',html:'<div style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:24px solid #fff;filter:drop-shadow(0 0 5px #003);transform-origin:50% 70%;"></div>',iconSize:[26,28],iconAnchor:[13,18]});
const map=L.map('map',{zoomControl:true,preferCanvas:true}).setView([55.955,11.83],12);
L.control.scale({metric:true,imperial:false}).addTo(map);
const routePane=map.createPane('routePane');
routePane.style.zIndex=560;
routePane.style.pointerEvents='none';
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:4,updateWhenIdle:false,updateWhenZooming:false,attribution:'© OpenStreetMap'}).addTo(map);
const seaMarks=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{maxZoom:18,keepBuffer:4,updateWhenIdle:false,updateWhenZooming:false,attribution:'OpenSeaMap'}).addTo(map);
state.contourLayerGroup.addTo(map);state.forwardLayer.addTo(map);
init();
function init(){migrateUserData();bindUI();loadUserSettings();loadSavedRoutes();renderSavedRoutes();loadHomePort();loadOrientationPreference();updateManifestDependentControls();loadTileManifest().then(()=>updateVisibleMapTiles({initial:true})).then(()=>setStatus('v45.4 klar. DDM tiles loader dynamisk for synligt kortområde og ruter.')).catch(e=>{console.error(e);setStatus(manifestErrorMessage(e));});updateInfoBox();cleanupOldCaches();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=45.4').then(r=>r.update()).catch(()=>{});setTimeout(()=>{map.invalidateSize(true);applyMapOrientation(true);scheduleVisibleTileUpdate();},300)}
function bindUI(){
 $('collapsePanel').onclick=()=>$('panel').classList.add('hidden');$('showPanel').onclick=()=>$('panel').classList.remove('hidden');$('openSettings').onclick=openSettings;$('closeSettings').onclick=closeSettings;$('openTrolling').onclick=openTrolling;$('closeTrolling').onclick=closeTrolling;$('settingsOverlay').onclick=e=>{if(e.target.id==='settingsOverlay')closeSettings()};$('exportUserData').onclick=exportUserData;$('importUserDataBtn').onclick=()=>$('userDataImport').click();$('userDataImport').onchange=importUserData;if($('navHomeMain'))$('navHomeMain').onclick=()=>navigateHome(true);if($('sendSuggestion'))$('sendSuggestion').onclick=sendSuggestion;
 $('modeFree').onclick=()=>setTrollingMode(false);$('modeTrolling').onclick=()=>setTrollingMode(true);$('orientationNorth').onclick=()=>setMapOrientation('north');$('orientationCourse').onclick=()=>setMapOrientation('course');$('pickStart').onclick=()=>beginMapPick('start');$('pickEnd').onclick=()=>beginMapPick('end');if($('navPickStart'))$('navPickStart').onclick=()=>beginMapPick('start');if($('navPickEnd'))$('navPickEnd').onclick=()=>beginMapPick('end');$('useGps').onclick=useGpsAsStart;if($('centerGps'))$('centerGps').onclick=centerOnGps;$('centerArea').onclick=()=>map.setView([55.955,11.83],12);$('saveHomeGps').onclick=saveHomeFromGps;$('pickHome').onclick=()=>beginMapPick('home');$('navHome').onclick=()=>navigateHome(true);
 if($('loadLocalContours'))$('loadLocalContours').onclick=reloadVisibleTiles;if($('refreshMapTiles'))$('refreshMapTiles').onclick=reloadVisibleTiles;$('makeRoute').onclick=makeTrollingRouteFromMenu;if($('makeRouteMain'))$('makeRouteMain').onclick=makeRoute;$('saveRoute').onclick=saveCurrentRoute;if($('saveRouteMain'))$('saveRouteMain').onclick=saveCurrentRoute;if($('chooseTrollingRoute'))$('chooseTrollingRoute').onclick=toggleSavedTrollingRoutes;if($('confirmRouteSave'))$('confirmRouteSave').onclick=confirmRouteSave;if($('cancelRouteSave'))$('cancelRouteSave').onclick=closeRouteNameDialog;if($('routeNameOverlay'))$('routeNameOverlay').onclick=e=>{if(e.target.id==='routeNameOverlay')closeRouteNameDialog()};if($('routeNameInput'))$('routeNameInput').onkeydown=e=>{if(e.key==='Enter')confirmRouteSave();if(e.key==='Escape')closeRouteNameDialog()};$('clearRoute').onclick=clearRoute;$('reverseRoute').onclick=reverseCurrentRoute;$('fileImport').onchange=importGeoJsonFile;
 $('startNav').onclick=startNavigation;$('stopNav').onclick=()=>stopNavigation();if($('startTrolling'))$('startTrolling').onclick=startTrolling;if($('stopTrolling'))$('stopTrolling').onclick=()=>stopNavigation();
 $('targetDepth').onchange=()=>{renderContours();updateDepthLabels();};$('depthTolerance').onchange=()=>{renderContours();updateDepthLabels();};if($('freeMinDepth'))$('freeMinDepth').onchange=updateDepthLabels;setTrollingMode(true);
 $('toggleSea').onchange=e=>toggleLayers(e.target.checked,[seaMarks]);$('toggleContours').onchange=e=>toggleLayers(e.target.checked,[state.contourLayerGroup]);$('toggleDepthAlarm').onchange=e=>{state.depthAlarm=e.target.checked;saveUserSettings();};$('toggleOffRouteAlarm').onchange=e=>{state.offRouteAlarm=e.target.checked;saveUserSettings();};
 map.on('click',e=>{const p={lat:e.latlng.lat,lng:e.latlng.lng};if(state.pickMode){const mode=state.pickMode;state.pickMode=null;if(mode==='start')setStart(p);if(mode==='end')setEnd(p);if(mode==='home')saveHomePort(p);return;}showMapActionMenu(p)});
 map.on('move zoom resize',()=>applyMapOrientation(false));
 map.on('moveend zoomend resize',()=>{applyMapOrientation(false);scheduleVisibleTileUpdate();});
 if(navigator.geolocation){navigator.geolocation.watchPosition(onGps,()=>{$('gpsStatus').textContent='GPS: ingen adgang'},{enableHighAccuracy:true,maximumAge:2000,timeout:10000})}
}
function onGps(pos){
 const nextGps={lat:pos.coords.latitude,lng:pos.coords.longitude,speed:pos.coords.speed,heading:pos.coords.heading,accuracy:pos.coords.accuracy,time:pos.timestamp||Date.now()};
 const inferredCog=inferCogFromGps(state.gps,nextGps);
 state.prevGps=state.gps;
 state.gps=nextGps;
 state.lastSogKn=Number.isFinite(pos.coords.speed)?pos.coords.speed*1.94384:state.lastSogKn;
 state.lastCog=Number.isFinite(pos.coords.heading)?pos.coords.heading:(Number.isFinite(inferredCog)?inferredCog:state.lastCog);
 $('gpsStatus').textContent='GPS: klar';
 if($('centerGps'))$('centerGps').disabled=false;
 $('posText').textContent=`Position: ${state.gps.lat.toFixed(5)}, ${state.gps.lng.toFixed(5)}`;
 $('sogText').textContent=`SOG: ${state.lastSogKn?state.lastSogKn.toFixed(1):'—'} kn`;
 $('cogText').textContent=`COG: ${Number.isFinite(state.lastCog)?Math.round(state.lastCog):'—'}°`;
 updateBoatMarker();
 updateInfoBox();
 applyMapOrientation(false);
 drawForwardLine(Number.isFinite(state.lastCog)?state.lastCog:NaN);
 if(state.navActive)updateNavigation()
}
function updateBoatMarker(){if(!state.gps)return;if(!state.boatMarker){state.boatMarker=L.marker(state.gps,{icon:boatIcon,zIndexOffset:900}).addTo(map).bindTooltip('Din position')}else state.boatMarker.setLatLng(state.gps);const el=state.boatMarker.getElement()?.querySelector('div');if(el&&Number.isFinite(state.lastCog))el.style.transform=`rotate(${state.lastCog}deg)`}
function toggleLayers(on,layers){layers.forEach(layer=>{if(on){if(!map.hasLayer(layer))layer.addTo(map)}else{if(map.hasLayer(layer))map.removeLayer(layer)}})}
function setStatus(t){$('statusText').textContent=t}
function setPickMode(m){state.pickMode=m;setStatus(m==='start'?'Klik startpunkt på kortet.':m==='end'?'Klik slutpunkt på kortet.':m==='home'?'Klik din hjemhavn på kortet.':'Klar.')}
function openSettings(){document.body.classList.add('settings-open');$('settingsOverlay').hidden=false;setTimeout(()=>map.invalidateSize(false),120)}
function closeSettings(){document.body.classList.remove('settings-open');$('settingsOverlay').hidden=true;setTimeout(()=>map.invalidateSize(false),120)}
function openTrolling(){setTrollingMode(true,true);document.body.classList.remove('settings-open');if($('settingsOverlay'))$('settingsOverlay').hidden=true;document.body.classList.add('trolling-menu-open');setTimeout(()=>map.invalidateSize(false),120)}
function closeTrolling(){document.body.classList.remove('trolling-menu-open');setTimeout(()=>map.invalidateSize(false),120)}
function beginMapPick(mode){
 map.closePopup();
 closeTrolling();
 closeSettings();
 if(typeof window!=='undefined'&&window.innerWidth<=800)$('panel')?.classList.add('hidden');
 setPickMode(mode);
}
function loadUserSettings(){
 try{const s=JSON.parse(localStorage.getItem(USER_SETTINGS_KEY)||'{}');state.depthAlarm=s.depthAlarm!==false;state.offRouteAlarm=s.offRouteAlarm!==false;}catch{state.depthAlarm=true;state.offRouteAlarm=true}
 if($('toggleDepthAlarm'))$('toggleDepthAlarm').checked=state.depthAlarm;
 if($('toggleOffRouteAlarm'))$('toggleOffRouteAlarm').checked=state.offRouteAlarm;
}
function saveUserSettings(){
 localStorage.setItem(USER_SETTINGS_KEY,JSON.stringify({depthAlarm:state.depthAlarm,offRouteAlarm:state.offRouteAlarm,updated:new Date().toISOString()}));
}
function migrateUserData(){
 migrateFirstAvailable(STORAGE_KEY,OLD_ROUTE_KEYS);
 migrateFirstAvailable(ORIENTATION_KEY,OLD_ORIENTATION_KEYS);
 migrateFirstAvailable(HOME_KEY,OLD_HOME_KEYS);
}
function migrateFirstAvailable(newKey,oldKeys){
 if(localStorage.getItem(newKey)!==null)return;
 for(const k of oldKeys){const v=localStorage.getItem(k);if(v!==null){localStorage.setItem(newKey,v);return;}}
}
function exportUserData(){
 const payload={version:VERSION,exported:new Date().toISOString(),homePort:state.homePort,routes:state.savedRoutes,orientationMode:state.orientationMode,userSettings:{depthAlarm:state.depthAlarm,offRouteAlarm:state.offRouteAlarm}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='waternav-userdata-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 setStatus('Brugerdata eksporteret.');
}
function importUserData(evt){
 const f=evt.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(String(r.result));if(data.homePort){localStorage.setItem(HOME_KEY,JSON.stringify(data.homePort));state.homePort=data.homePort;renderHomePort();updateHomeUi();}
 if(Array.isArray(data.routes)){state.savedRoutes=data.routes;localStorage.setItem(STORAGE_KEY,JSON.stringify(state.savedRoutes));renderSavedRoutes();}
 if(data.orientationMode)setMapOrientation(data.orientationMode,true);
 if(data.userSettings){state.depthAlarm=data.userSettings.depthAlarm!==false;state.offRouteAlarm=data.userSettings.offRouteAlarm!==false;saveUserSettings();loadUserSettings();}
 setStatus('Brugerdata importeret.');}catch(e){setStatus('Kunne ikke importere brugerdata. Filen er ikke gyldig WaterNav JSON.')}};r.readAsText(f);evt.target.value='';
}



function loadOrientationPreference(){
 const saved=localStorage.getItem(ORIENTATION_KEY);
 setMapOrientation(saved==='course'?'course':'north',true);
}
function setMapOrientation(mode,silent=false){
 state.orientationMode=mode==='course'?'course':'north';
 localStorage.setItem(ORIENTATION_KEY,state.orientationMode);
 document.body.classList.toggle('map-course-up',state.orientationMode==='course');
 $('orientationNorth')?.classList.toggle('active',state.orientationMode==='north');
 $('orientationCourse')?.classList.toggle('active',state.orientationMode==='course');
 updateOrientationText();
 applyMapOrientation(true);
 if(!silent)setStatus(state.orientationMode==='course'?'Kortorientering: sejlretning op.':'Kortorientering: nord op.');
}
function updateOrientationText(){
 const cog=Number.isFinite(state.lastCog)?Math.round(state.lastCog):null;
 const text=state.orientationMode==='course'?(cog!==null?`Sejlretning op · COG ${cog}°`:'Sejlretning op · venter på COG'):'Nord op';
 if($('orientationBadge'))$('orientationBadge').textContent=text;
 if($('orientationHelp'))$('orientationHelp').textContent=state.orientationMode==='course'?'Kortet roterer efter COG, så din aktuelle sejlretning er op. Ved lav fart/ukendt COG holdes seneste sikre retning.':'Nord op: kortet er låst mod geografisk nord. Bådikonen og kurslinjen viser stadig COG.';
}
function applyMapOrientation(force=false){
 const panes=['tilePane','overlayPane','routePane','shadowPane','markerPane','tooltipPane','popupPane'];
 let target=0;
 if(state.orientationMode==='course'&&Number.isFinite(state.lastCog))target=-state.lastCog;
 target=((target%360)+360)%360;
 if(target>180)target-=360;
 const rotate=state.orientationMode==='course'&&Number.isFinite(state.lastCog);
 const wasRotating=document.body.classList.contains('course-up-active');
 if(!force&&rotate===wasRotating&&Math.abs(target-state.mapRotationDeg)<0.5){updateOrientationText();return;}
 state.mapRotationDeg=target;
 document.documentElement.style.setProperty('--waternav-map-rotation',`${rotate?target:0}deg`);
 document.documentElement.style.setProperty('--waternav-counter-rotation',`${rotate?-target:0}deg`);
 const size=map.getSize();
 for(const name of panes){
  const pane=map.getPane(name);
  if(!pane)continue;
  pane.classList.toggle('course-up-rotating',rotate);
  pane.style.transformOrigin=`${size.x/2}px ${size.y/2}px`;
  pane.style.transform=rotate?`rotate(${target}deg)`:'';
 }
 document.body.classList.toggle('course-up-active',rotate);
 updateOrientationText();
 if(force)requestAnimationFrame(()=>map.invalidateSize(false));
}


function setTrollingMode(enabled,silent=false){
 state.trollingEnabled=!!enabled;
 document.body.classList.toggle('free-mode',!state.trollingEnabled);
 $('modeFree')?.classList.toggle('active',!state.trollingEnabled);
 $('modeTrolling')?.classList.toggle('active',state.trollingEnabled);
 if($('makeRouteMain'))$('makeRouteMain').textContent=state.trollingEnabled?'Lav trollingstrækning':'Lav fri rute';
 if($('freeRouteControls'))$('freeRouteControls').hidden=state.trollingEnabled;
 if($('modeHelp'))$('modeHelp').textContent=state.trollingEnabled?'TrollingMode laver en strækning langs valgt DDM-isobath. Brug Trolling-menu til dybde, tolerance, gemte trollingruter og vend retning.':'Fri navigation bruger minimumsdybde og beregner en water-only rute uden land/ukendt DDM-data.';
 updateDepthLabels();
 saveUserSettings();if(!silent)setStatus(state.trollingEnabled?'TrollingMode slået til.':'TrollingMode slået fra. Fri dybdestyret navigation aktiv.');
 renderContours();
 updateRouteActionButtons();
}
function selectedDepth(){return Number($('targetDepth').value)}
function selectedTolerance(){return Number($('depthTolerance').value)}
function selectedFreeMinDepth(){return Number($('freeMinDepth')?.value||selectedDepth())}
function freeMinDepth(){return selectedFreeMinDepth()} // Fri navigation treats selected depth as a HARD minimum, not a soft target.
function updateDepthLabels(){
 if(!$('depthLabel'))return;
 const d=selectedDepth(),tol=selectedTolerance();
 $('depthLabel').textContent='Trollingdybde / isobath';
 $('toleranceLabel').textContent='Tolerance / nærmeste kurve';
 $('depthModeHelp').textContent=`TrollingMode følger DDM-isobath omkring ${d.toFixed(1)} m med nærmeste kurve inden for ±${tol.toFixed(2)} m.`;
 if($('freeModeHelp'))$('freeModeHelp').textContent=`Fri navigation behandler ${freeMinDepth().toFixed(1)} m som minimumsdybde. Celler under denne dybde og naboceller mod lavt/ukendt vand blokeres.`;
}

function setStart(p){state.start={lat:p.lat,lng:p.lng};if(state.startMarker)state.startMarker.setLatLng(state.start);else state.startMarker=L.marker(state.start,{icon:startIcon,zIndexOffset:980}).addTo(map).bindPopup('Start');state.startMarker.bringToFront?.();updateRouteDebugUi();setStatus('Start valgt. Vælg slutpunkt.')}
function setEnd(p){state.end={lat:p.lat,lng:p.lng};if(state.endMarker)state.endMarker.setLatLng(state.end);else state.endMarker=L.marker(state.end,{icon:endIcon,zIndexOffset:990}).addTo(map).bindPopup('Slut');state.endMarker.bringToFront?.();updateRouteDebugUi();setStatus(state.trollingEnabled?'Slut valgt. Lav trollingrute på DDM-dybdekurven.':'Slut valgt. Lav fri rute efter valgt dybde.')}
function useGpsAsStart(){if(!state.gps)return setStatus('GPS er ikke klar endnu.');setStart(state.gps);map.panTo(state.gps)}
function centerOnGps(){if(!state.gps)return setStatus('GPS er ikke klar endnu.');map.panTo([state.gps.lat,state.gps.lng],{animate:true,duration:.3});setStatus('Kortet er centreret på aktuel GPS-position.');applyMapOrientation(true)}
function loadHomePort(){
 try{state.homePort=JSON.parse(localStorage.getItem(HOME_KEY)||'null')}catch{state.homePort=null}
 if(state.homePort)renderHomePort();
 updateHomeUi();
}
function saveHomeFromGps(){
 if(!state.gps)return setStatus('GPS er ikke klar endnu, så hjemhavn kan ikke gemmes fra aktuel position.');
 saveHomePort({lat:state.gps.lat,lng:state.gps.lng});
}
function saveHomePort(p){
 state.homePort={lat:Number(p.lat),lng:Number(p.lng),saved:new Date().toISOString()};
 localStorage.setItem(HOME_KEY,JSON.stringify(state.homePort));
 renderHomePort();
 updateHomeUi();
 setStatus(`Hjemhavn gemt: ${state.homePort.lat.toFixed(5)}, ${state.homePort.lng.toFixed(5)}.`);
}
function renderHomePort(){
 if(!state.homePort)return;
 const icon=L.divIcon({className:'home-marker',html:'<div class="home-dot">⌂</div>',iconSize:[30,30],iconAnchor:[15,15]});
 if(state.homeMarker)state.homeMarker.setLatLng(state.homePort);
 else state.homeMarker=L.marker(state.homePort,{icon,zIndexOffset:850}).addTo(map).bindTooltip('Hjemhavn');
}
function updateHomeUi(){
 const el=$('homeText');
 const hasHome=!!state.homePort;
 if(el)el.textContent=hasHome?`${state.homePort.lat.toFixed(5)}, ${state.homePort.lng.toFixed(5)}`:'Ikke gemt';
 if($('navHome'))$('navHome').disabled=!hasHome;
 if($('navHomeMain'))$('navHomeMain').disabled=!hasHome;
}
function navigateHome(autoRoute=false){
 if(!state.homePort)return setStatus('Der er ikke gemt en hjemhavn endnu.');
 navigateToDestination(state.homePort,{label:'hjemhavn',autoRoute,mode:'free'});
}
function navigateToDestination(dest,{label='valgt punkt',autoRoute=true,mode='free'}={}){
 if(!dest||!Number.isFinite(Number(dest.lat))||!Number.isFinite(Number(dest.lng)))return setStatus('Destinationen er ugyldig.');
 if(mode==='free')setTrollingMode(false,true);
 const start=getBestStartPoint();
 if(!start)return setStatus('GPS er ikke klar, og kortcentrum kunne ikke bruges som start.');
 setStart(start);
 setEnd(dest);
 map.closePopup();
 map.panTo(dest);
 setStatus(`${label[0]?.toUpperCase()||'P'}${label.slice(1)} valgt. Beregner DDM-water-only rute...`);
 if(autoRoute)setTimeout(()=>makeRoute(),80);
}
function getBestStartPoint(){
 if(state.gps&&Number.isFinite(state.gps.lat)&&Number.isFinite(state.gps.lng))return{lat:state.gps.lat,lng:state.gps.lng};
 const c=map.getCenter();
 return{lat:c.lat,lng:c.lng};
}
function showMapActionMenu(p){
 const depth=depthAtLatLng(p);
 const depthText=Number.isFinite(depth)?`${depth.toFixed(1)} m`:'ukendt';
 const wrap=document.createElement('div');
 wrap.className='mapActionMenu';
 wrap.innerHTML=`<div class="mapActionMenuHeader"><strong>Valgt punkt</strong><button type="button" data-act="close" aria-label="Luk kortmenu">&times;</button></div><small>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} · DDM dybde: ${depthText}</small><button type="button" data-act="nav">Navigér hertil</button><button type="button" data-act="start">Brug som startpunkt</button><button type="button" data-act="end">Brug som slutpunkt</button><button type="button" data-act="home">Gem som hjemhavn</button><button type="button" data-act="troll">Start trollingstræk her</button>`;
 wrap.querySelector('[data-act=close]').onclick=()=>map.closePopup();
 wrap.querySelector('[data-act=nav]').onclick=()=>navigateToDestination(p,{label:'valgt punkt',autoRoute:true});
 wrap.querySelector('[data-act=start]').onclick=()=>{setStart(p);map.closePopup();};
 wrap.querySelector('[data-act=end]').onclick=()=>{setEnd(p);map.closePopup();};
 wrap.querySelector('[data-act=home]').onclick=()=>{saveHomePort(p);map.closePopup();};
 wrap.querySelector('[data-act=troll]').onclick=()=>{setTrollingMode(true,true);setStart(p);map.closePopup();setStatus('TrollingMode: start valgt. Vælg slutpunkt på kortet.');beginMapPick('end');};
 L.popup({maxWidth:260,closeButton:false,autoPan:true,className:'map-action-popup'}).setLatLng(p).setContent(wrap).openOn(map);
}
function sendSuggestion(){
 const pos=state.gps?`${state.gps.lat.toFixed(5)}, ${state.gps.lng.toFixed(5)}`:'GPS ikke klar';
 const mode=state.trollingEnabled?'TrollingMode':'Fri navigation';
 const subject=encodeURIComponent('WaterNav forslag');
 const body=encodeURIComponent(`Hej Jesper,

Forslag/fejl:


---
App-version: ${VERSION}
Mode: ${mode}
Position: ${pos}
Hjemhavn: ${state.homePort?`${state.homePort.lat.toFixed(5)}, ${state.homePort.lng.toFixed(5)}`:'ikke gemt'}
`);
 window.location.href=`mailto:jesperhammer1980@gmail.com?subject=${subject}&body=${body}`;
}

async function loadTileManifest(){
 setManifestStatus('loading',`DDM manifest: indlæser... (${TILE_MANIFEST_PATH})`);
 state.tileManifest=null;state.tileById=new Map();state.depthGrid=null;updateManifestDependentControls();
 const url=manifestUrl();
 let res;
 try{
  res=await fetch(url,{cache:'no-store'});
 }catch(e){
  throw manifestLoadError(`fetch error: ${e?.message||e}`,e);
 }
 if(!res.ok)throw manifestLoadError(`${res.status} ${res.statusText||'HTTP fejl'}`);
 let manifest;
 try{
  manifest=await res.json();
 }catch(e){
  throw manifestLoadError(`parse error: ${e?.message||e}`,e);
 }
 validateTileManifest(manifest);
 state.tileManifest=manifest;
 state.tileById=new Map(manifest.tiles.map(tile=>[tile.id,tile]));
 state.depthGrid=buildVirtualTileGrid(manifest);
 state.depthGridSource='tiles';
 state.manifestError=null;
 $('dataSource').textContent='DDM 2024 tile-manifest · dynamisk loading';
 $('contourCount').textContent='0';
 setManifestStatus('ready','DDM manifest: indlæst');
 updateMapRegionsUi();
 updateManifestDependentControls();
 return manifest;
}

function manifestUrl(){const base=typeof window!=='undefined'?window.location.href:undefined;const url=base?new URL(TILE_MANIFEST_PATH,base).href:TILE_MANIFEST_PATH;return `${url}?v=${encodeURIComponent(VERSION)}`}
function expectedManifestPath(){return TILE_MANIFEST_PATH}
function manifestLoadError(message,cause=null){const err=new Error(`DDM manifest fejl (${expectedManifestPath()}): ${message}. Fetch URL: ${manifestUrl()}`);err.cause=cause;state.manifestError=err.message;setManifestStatus('error',err.message);updateManifestDependentControls();return err}
function manifestErrorMessage(e){return e?.message||`DDM manifest fejl (${expectedManifestPath()})`}
function validateTileManifest(manifest){
 if(!manifest)throw manifestLoadError('tomt manifest');
 if(manifest.schema!=='waternav-ddm-tile-manifest-v1')throw manifestLoadError(`forkert format: schema=${manifest.schema||'mangler'}`);
 if(!Array.isArray(manifest.tiles))throw manifestLoadError('forkert format: tiles-array mangler');
 if(!manifest.tiles.length)throw manifestLoadError('tomt manifest: 0 tiles');
 if(!manifest.grid?.bounds||!Number.isFinite(Number(manifest.grid.step)))throw manifestLoadError('forkert format: grid metadata mangler');
}

function setManifestStatus(status,message){
 state.manifestStatus=status;
 const depthCount=state.tileManifest?.tiles?.filter(tile=>tile.depthFile).length||0;
 const contourCount=state.tileManifest?.tiles?.filter(tile=>tile.contourFile).length||0;
 if($('manifestStatus'))$('manifestStatus').textContent=message;
 if($('manifestPath'))$('manifestPath').textContent=expectedManifestPath();
 if($('manifestDepthCount'))$('manifestDepthCount').textContent=String(depthCount);
 if($('manifestContourCount'))$('manifestContourCount').textContent=String(contourCount);
 setStatus(message);
 updateDdmDebugUi();
}

function updateManifestDependentControls(){
 const ready=!!state.tileManifest&&state.manifestStatus==='ready';
 setDisabled('loadLocalContours',!ready);
 setDisabled('refreshMapTiles',!ready);
 if(!ready){setDisabled('makeRoute',true);setDisabled('makeRouteMain',true);return;}
 updateRouteActionButtons();
}

function requireTileManifest(actionLabel='Denne handling'){
 if(state.tileManifest&&state.manifestStatus==='ready')return true;
 const msg=state.manifestError||`${actionLabel} kræver DDM manifest. Forventet fil: ${expectedManifestPath()}`;
 setStatus(msg);
 return false;
}

function buildVirtualTileGrid(manifest){
 return{schema:'waternav-ddm-virtual-grid-v1',mode:'tiles',bounds:manifest.grid.bounds,step:manifest.grid.step,rows:manifest.grid.rows,cols:manifest.grid.cols,tileSize:manifest.grid.tileSize};
}

function tileUrl(file){return `./data/tiles/${file}?v=${encodeURIComponent(VERSION)}`}

function resetTileErrors(){
 state.tileErrors=[];
 state.failedTileCount=0;
 state.lastTileError=null;
 state.lastTileLoadError=null;
 updateDdmDebugUi();
}

function recordTileError(type,id,file,url,status,error=null){
 const rec={type,id,file:file||id||'ukendt tile',url,status:status||'ukendt fejl',message:error?.message||String(error||''),time:new Date().toISOString()};
 state.tileErrors.push(rec);
 state.lastTileError=rec;
 state.failedTileCount=state.tileErrors.length;
 state.lastTileLoadError=tileFailureMessage(rec);
 console.warn(`DDM tile fejl\nTile:\n${rec.file}\n\nURL:\n${rec.url}\n\nStatus:\n${rec.status}`,error||'');
 updateDdmDebugUi();
 return rec;
}

function tileFailureMessage(rec=state.lastTileError){
 if(!rec)return 'Nogle DDM-kortdata kunne ikke indlæses';
 return `Tile fejl: ${rec.file} · ${rec.status}`;
}

async function fetchTileJson(type,id,file){
 const url=tileUrl(file);
 let logged=false;
 const log=(status,error=null)=>{if(!logged){logged=true;recordTileError(type,id,file,url,status,error)}};
 try{
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok){
   const status=`${res.status} ${res.statusText||'HTTP fejl'}`;
   log(status);
   throw new Error(`Tile fejl: ${file} (${status})`);
  }
  const text=await res.text();
  try{
   return JSON.parse(text);
  }catch(e){
   log(`JSON parse error: ${e?.message||e}`,e);
   throw new Error(`Tile fejl: ${file} (JSON parse error)`);
  }
 }catch(e){
  if(!logged)log(`fetch error: ${e?.message||e}`,e);
  throw e;
 }
}

function hasPendingTileLoads(ids,{depth=false,contours=false}={}){
 for(const id of ids){
  const meta=state.tileById.get(id);
  if(!meta)continue;
  if(depth&&meta.depthFile&&!state.loadedDepthTiles.has(id))return true;
  if(contours&&meta.contourFile&&!state.loadedContourTiles.has(id))return true;
 }
 return false;
}

function beginTileProgress(){
 resetTileErrors();
 const tracker={id:++state.tileProgressSeq,total:0,loaded:0,failed:0,started:new Set(),completed:new Set(),hideTimer:null};
 state.tileProgress=tracker;
 updateTileProgressUi(tracker);
 return tracker;
}

function registerTileFetch(tracker,type,id){
 if(!tracker||state.tileProgress?.id!==tracker.id)return;
 const key=`${type}:${id}`;
 if(tracker.started.has(key))return;
 tracker.started.add(key);
 tracker.total++;
 updateTileProgressUi(tracker);
}

function completeTileFetch(tracker,type,id,ok){
 if(!tracker)return;
 const key=`${type}:${id}`;
 if(tracker.completed.has(key))return;
 tracker.completed.add(key);
 if(!tracker.started.has(key)){
  tracker.started.add(key);
  tracker.total++;
 }
 tracker.loaded++;
 if(!ok)tracker.failed++;
 updateTileProgressUi(tracker);
}

function updateTileProgressUi(tracker){
 if(!tracker||state.tileProgress?.id!==tracker.id)return;
 const box=$('tileProgress'),text=$('tileProgressText'),bar=$('tileProgressBar');
 if(!box||!text||!bar)return;
 const pct=tracker.total?Math.round((tracker.loaded/tracker.total)*100):0;
 box.hidden=false;
 box.setAttribute('aria-valuenow',String(pct));
 const complete=tracker.total>0&&tracker.loaded>=tracker.total;
 const message=complete?(tracker.failed?tileFailureMessage():'DDM-kortdata klar'):`Indlæser DDM-kortdata: ${pct}%`;
 text.textContent=message;
 bar.style.width=`${pct}%`;
 setStatus(message);
}

function finishTileProgress(tracker){
 if(!tracker||state.tileProgress?.id!==tracker.id)return;
 if(tracker.total===0){hideTileProgress(tracker);return;}
 updateTileProgressUi(tracker);
 clearTimeout(tracker.hideTimer);
 tracker.hideTimer=setTimeout(()=>{if(state.tileProgress?.id===tracker.id)hideTileProgress(tracker);},tracker.failed?3600:900);
}

function hideTileProgress(tracker=null){
 if(tracker&&state.tileProgress?.id!==tracker.id)return;
 const box=$('tileProgress'),bar=$('tileProgressBar');
 if(box)box.hidden=true;
 if(bar)bar.style.width='0%';
 state.tileProgress=null;
}

function waitForProgressPaint(tracker){
 if(!tracker)return Promise.resolve();
 return new Promise(resolve=>setTimeout(resolve,35));
}

function scheduleVisibleTileUpdate(){
 clearTimeout(state.tileUpdateTimer);
 state.tileUpdateTimer=setTimeout(()=>updateVisibleMapTiles().catch(e=>console.warn('Tile update failed',e)),90);
}

async function reloadVisibleTiles(){
 if(!requireTileManifest('Genindlæs synlige DDM tiles'))return;
 state.loadedContourTiles.clear();
 state.loadedDepthTiles.clear();
 state.routingTileIds.clear();
 renderContours();
 updateMapRegionsUi();
 await updateVisibleMapTiles({force:true});
 setStatus('Synlige DDM-kortområder er genindlæst.');
}

async function updateVisibleMapTiles(opts={}){
 if(!state.tileManifest){if(opts.force)setStatus(`DDM manifest mangler. Forventet fil: ${expectedManifestPath()}`);return;}
 const tiles=tilesForBounds(mapBoundsWithPadding(VIEW_TILE_PAD_DEG));
 const ids=new Set(tiles.map(tile=>tile.id));
 state.visibleTileIds=ids;
 state.lastTileLoadError=null;
 if(!ids.size){
  $('contourCount').textContent='0';
  $('activeDepth').textContent='Ingen DDM tiles i synligt kortområde';
  updateMapRegionsUi();
  return;
 }
 const tracker=hasPendingTileLoads(ids,{depth:true,contours:true})?beginTileProgress():null;
 await waitForProgressPaint(tracker);
 const results=await Promise.allSettled([ensureDepthTiles(ids,tracker),ensureContourTiles(ids,tracker)]);
 const failed=results.some(result=>result.status==='rejected');
 if(failed||tracker?.failed)state.lastTileLoadError=tileFailureMessage();
 pruneDepthTiles(new Set([...ids,...state.routingTileIds]));
 pruneContourTiles(ids);
 renderContours();
 updateMapRegionsUi();
 if(tracker)finishTileProgress(tracker);
 if(failed||tracker?.failed)setStatus(tileFailureMessage());
 else if(!tracker&&opts.initial)setStatus(`DDM tiles klar: ${ids.size} synlige tiles hentet.`);
 else if(!tracker)setStatus(`DDM kortdata klar: ${ids.size} synlige tiles.`);
}

function mapBoundsWithPadding(padDeg=0){
 const b=map.getBounds();
 return{latMin:b.getSouth()-padDeg,latMax:b.getNorth()+padDeg,lngMin:b.getWest()-padDeg,lngMax:b.getEast()+padDeg};
}

function tilesForBounds(bounds){
 if(!state.tileManifest)return[];
 return state.tileManifest.tiles.filter(tile=>boundsIntersect(tile.bounds,bounds));
}

function boundsFromPoints(points,padDeg=0){
 let latMin=Infinity,latMax=-Infinity,lngMin=Infinity,lngMax=-Infinity;
 for(const p of points){if(!p)continue;latMin=Math.min(latMin,p.lat);latMax=Math.max(latMax,p.lat);lngMin=Math.min(lngMin,p.lng);lngMax=Math.max(lngMax,p.lng)}
 if(!Number.isFinite(latMin))return null;
 return{latMin:latMin-padDeg,latMax:latMax+padDeg,lngMin:lngMin-padDeg,lngMax:lngMax+padDeg};
}

function boundsIntersect(a,b){
 return a&&b&&a.latMin<=b.latMax&&a.latMax>=b.latMin&&a.lngMin<=b.lngMax&&a.lngMax>=b.lngMin;
}

async function ensureDepthTiles(ids,tracker=null){
 const jobs=[];
 for(const id of ids)jobs.push(loadDepthTile(id,tracker));
 const results=await Promise.allSettled(jobs);
 const failed=results.find(result=>result.status==='rejected');
 if(failed)throw failed.reason;
}

async function loadDepthTile(id,tracker=null){
 if(state.loadedDepthTiles.has(id)){state.loadedDepthTiles.get(id).lastUsed=Date.now();return state.loadedDepthTiles.get(id)}
 if(state.loadingDepthTiles.has(id)){
  registerTileFetch(tracker,'depth',id);
  return state.loadingDepthTiles.get(id).then(tile=>{completeTileFetch(tracker,'depth',id,true);return tile},e=>{completeTileFetch(tracker,'depth',id,false);throw e});
 }
 const meta=state.tileById.get(id);
 if(!meta?.depthFile)return null;
 registerTileFetch(tracker,'depth',id);
 const promise=fetchTileJson('depth',id,meta.depthFile).then(raw=>{
  const tile=decodeRleTile(raw,meta);
  state.loadedDepthTiles.set(id,tile);
  state.loadingDepthTiles.delete(id);
  updateDdmDebugUi();
  return tile;
 }).catch(e=>{state.loadingDepthTiles.delete(id);throw e});
 state.loadingDepthTiles.set(id,promise);
 return promise.then(tile=>{completeTileFetch(tracker,'depth',id,true);return tile},e=>{completeTileFetch(tracker,'depth',id,false);throw e});
}

function decodeRleTile(raw,meta){
 const data=(raw.dataRle||[]).map(row=>{
  const out=[];
  for(const pair of row){const n=pair[0],v=pair[1];for(let i=0;i<n;i++)out.push(v===null?null:Number(v));}
  return out;
 });
 return{...raw,...meta,data,lastUsed:Date.now()};
}

async function ensureContourTiles(ids,tracker=null){
 const jobs=[];
 for(const id of ids){
  if(state.tileById.get(id)?.contourFile)jobs.push(loadContourTile(id,tracker));
 }
 const results=await Promise.allSettled(jobs);
 const failed=results.find(result=>result.status==='rejected');
 if(failed)throw failed.reason;
}

async function loadContourTile(id,tracker=null){
 if(state.loadedContourTiles.has(id)){state.loadedContourTiles.get(id).lastUsed=Date.now();return state.loadedContourTiles.get(id)}
 if(state.loadingContourTiles.has(id)){
  registerTileFetch(tracker,'contour',id);
  return state.loadingContourTiles.get(id).then(tile=>{completeTileFetch(tracker,'contour',id,true);return tile},e=>{completeTileFetch(tracker,'contour',id,false);throw e});
 }
 const meta=state.tileById.get(id);
 if(!meta?.contourFile)return null;
 registerTileFetch(tracker,'contour',id);
 const promise=fetchTileJson('contour',id,meta.contourFile).then(geo=>{
  const contours=parseContours(geo).map(c=>({...c,scope:c.properties?.scope||'denmark',tileId:id}));
  const tile={id,contours,lastUsed:Date.now()};
  state.loadedContourTiles.set(id,tile);
  state.loadingContourTiles.delete(id);
  updateDdmDebugUi();
  return tile;
 }).catch(e=>{state.loadingContourTiles.delete(id);throw e});
 state.loadingContourTiles.set(id,promise);
 return promise.then(tile=>{completeTileFetch(tracker,'contour',id,true);return tile},e=>{completeTileFetch(tracker,'contour',id,false);throw e});
}

function pruneDepthTiles(retainIds=new Set()){
 pruneTileMap(state.loadedDepthTiles,MAX_DEPTH_TILES,retainIds);
}

function pruneContourTiles(retainIds=new Set()){
 pruneTileMap(state.loadedContourTiles,MAX_CONTOUR_TILES,retainIds);
}

function pruneTileMap(mapRef,max,retainIds){
 if(mapRef.size<=max)return;
 const removable=[...mapRef.entries()].filter(([id])=>!retainIds.has(id)).sort((a,b)=>(a[1].lastUsed||0)-(b[1].lastUsed||0));
 while(mapRef.size>max&&removable.length){
  const [id]=removable.shift();
  mapRef.delete(id);
 }
}

async function prepareRoutingGrid(start,end){
 if(!state.tileManifest)await loadTileManifest();
 if(!requireTileManifest('Lav rute'))return false;
 state.lastTileLoadError=null;
 state.depthGrid=buildVirtualTileGrid(state.tileManifest);
 if(!pointInsideGrid(start,state.depthGrid)||!pointInsideGrid(end,state.depthGrid)){state.lastTileLoadError='Manglende DDM tile: start/slut ligger uden for installeret DDM-område.';return false;}
 const pad=Math.min(1.1,Math.max(0.18,directNm(start,end)/120));
 const bounds=boundsFromPoints([start,end],pad);
 const tiles=tilesForBounds(bounds);
 if(!tiles.length){state.lastTileLoadError='Manglende DDM tile for ruteområdet.';return false;}
 const ids=new Set(tiles.map(tile=>tile.id));
 state.routingTileIds=ids;
 const tracker=hasPendingTileLoads(ids,{depth:true})?beginTileProgress():null;
 await waitForProgressPaint(tracker);
 try{
  await ensureDepthTiles(ids,tracker);
 }catch(e){
 console.error(e);
  if(tracker)finishTileProgress(tracker);
  state.lastTileLoadError=tileFailureMessage();
  setStatus(state.lastTileLoadError);
  return false;
 }
 if(tracker)finishTileProgress(tracker);
 pruneDepthTiles(new Set([...ids,...state.visibleTileIds]));
 state.depthGrid=buildVirtualTileGrid(state.tileManifest);
 state.depthGridSource=`${ids.size} DDM tile${ids.size===1?'':'s'}`;
 updateMapRegionsUi();
 return true;
}

function updateMapRegionsUi(){
 const box=$('mapRegions');
 if(!box||!state.tileManifest)return;
 box.innerHTML='';
 for(const region of state.tileManifest.regions||[]){
  const loaded=[...state.loadedDepthTiles.keys()].filter(id=>region.tileIds.includes(id)).length;
  const visible=[...state.visibleTileIds].filter(id=>region.tileIds.includes(id)).length;
  const card=document.createElement('div');
  card.className='regionCard';
  card.innerHTML=`<div><strong>${escapeHtml(region.name)}</strong><small>${region.installed?'Installeret':'Ikke installeret'} · ${region.tileIds.length} tiles · ${loaded} loaded${visible?` · ${visible} synlige`:''}</small></div><button type="button" disabled>Download senere</button>`;
  box.appendChild(card);
 }
 const loadedText=`${state.loadedDepthTiles.size} depth / ${state.loadedContourTiles.size} contour`;
 if($('tileCacheStatus'))$('tileCacheStatus').textContent=loadedText;
 updateDdmDebugUi();
}

function updateDdmDebugUi(){
 const depthCount=state.tileManifest?.tiles?.filter(tile=>tile.depthFile).length||0;
 const contourCount=state.tileManifest?.tiles?.filter(tile=>tile.contourFile).length||0;
 const loaded=state.loadedDepthTiles.size+state.loadedContourTiles.size;
 const failed=state.failedTileCount||0;
 const manifestText=state.manifestStatus==='ready'?'OK':state.manifestStatus==='loading'?'indlæser':state.manifestStatus==='error'?'fejl':'venter';
 if($('ddmDebugManifest'))$('ddmDebugManifest').textContent=manifestText;
 if($('ddmDebugDepthTiles'))$('ddmDebugDepthTiles').textContent=String(depthCount);
 if($('ddmDebugContourTiles'))$('ddmDebugContourTiles').textContent=String(contourCount);
 if($('ddmDebugLoaded'))$('ddmDebugLoaded').textContent=String(loaded);
 if($('ddmDebugFailed'))$('ddmDebugFailed').textContent=String(failed);
 if($('ddmDebugLastError'))$('ddmDebugLastError').textContent=state.lastTileError?state.lastTileError.file:'Ingen';
 if($('ddmTileErrorList')){
  $('ddmTileErrorList').textContent=state.tileErrors.length?state.tileErrors.map(e=>`Tile:\n${e.file}\n\nURL:\n${e.url}\n\nStatus:\n${e.status}`).join('\n\n---\n\n'):'Ingen tile-fejl';
 }
}

function importGeoJsonFile(evt){const f=evt.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const geo=JSON.parse(String(r.result));const contours=parseContours(geo);if(!contours.length)return setStatus('GeoJSON indeholder ingen læsbare dybdekurver.');setContours(contours,`importeret: ${f.name}`);setStatus(`Importeret ${contours.length} dybdekurver fra ${f.name}.`)}catch(e){setStatus('Kunne ikke læse GeoJSON.')}};r.readAsText(f)}
function pointInsideGrid(p,grid){
 if(!p||!grid||!grid.bounds)return false;const b=grid.bounds;
 return p.lat>=b.latMin&&p.lat<=b.latMax&&p.lng>=b.lngMin&&p.lng<=b.lngMax;
}
function bestDepthGridForPoint(){return state.depthGrid}

function parseContours(geo){if(!geo||!Array.isArray(geo.features))return[];const out=[];for(const f of geo.features){const depth=getDepthValue(f.properties||{});if(!Number.isFinite(depth))continue;for(const line of geometryToLines(f.geometry)){const pts=line.map(c=>Array.isArray(c)?{lng:Number(c[0]),lat:Number(c[1])}:null).filter(p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));if(pts.length>1)out.push({depth,points:pts,properties:f.properties||{}})}}return out}
function getDepthValue(p){const keys=['depth','DEPTH','valdco','VALDCO','contour','CONTOUR','elevation','ELEVATION','z','Z','value','VALUE','isobath','ISOBATH','dco','DCO','dep','DEP'];for(const k of keys){if(p[k]===undefined||p[k]===null||p[k]==='')continue;const n=Number(String(p[k]).replace(',','.'));if(Number.isFinite(n))return Math.abs(n)}for(const[k,v]of Object.entries(p)){if(!/depth|dco|contour|elev|isobath|dep|z/i.test(k))continue;const n=Number(String(v).replace(',','.'));if(Number.isFinite(n))return Math.abs(n)}return NaN}
function geometryToLines(g){if(!g)return[];if(g.type==='LineString')return[g.coordinates];if(g.type==='MultiLineString')return g.coordinates;if(g.type==='GeometryCollection')return g.geometries.flatMap(geometryToLines);return[]}
function setContours(contours,source){state.contours=contours;$('dataSource').textContent=source;renderContours()}
function loadedContours(){
 const out=[...state.contours];
 for(const tile of state.loadedContourTiles.values())out.push(...tile.contours);
 return out;
}
function renderContours(){state.contourLayerGroup.clearLayers();state.activeContours=[];const contours=loadedContours();$('contourCount').textContent=String(contours.length);if(!contours.length){$('activeDepth').textContent='Ingen DDM-kurver i synligt kortområde';return;}const target=selectedDepth(),tol=selectedTolerance();let bestDiff=Infinity;for(const c of contours)bestDiff=Math.min(bestDiff,Math.abs(c.depth-target));const limit=Math.max(tol,bestDiff+.001);for(const c of contours){const d=Math.abs(c.depth-target);const active=d<=limit;const color=active?'#ffe100':'#188cff';const weight=active?4.4:1.15;const opacity=active?.96:.40;if(active)state.activeContours.push(c);const isCoarse=c.scope==='denmark';const visibleBase=[1,2,3,5,7,8,10,15,20,30,50].includes(Number(c.depth));if(active||visibleBase){const w=isCoarse?Math.max(0.8,weight*.65):weight;const op=isCoarse?(active?.75:.22):opacity;L.polyline(c.points.map(p=>[p.lat,p.lng]),{color,weight:w,opacity:op,smoothFactor:isCoarse?1.2:.55}).bindTooltip(`${c.depth.toFixed(1)} m · DDM${isCoarse?' Danmark coarse':''}`,{sticky:true}).addTo(state.contourLayerGroup)}}$('activeDepth').textContent=state.activeContours.length?`${target} m (${state.activeContours.length} DDM-kurver / nærmeste ±${limit.toFixed(2)}m)`:`Ingen DDM-kurve tæt på ${target} m i loaded tiles`}
function makeTrollingRouteFromMenu(){setTrollingMode(true,true);makeRoute()}
function makeRoute(){if(!requireTileManifest('Lav rute'))return;setStatus('Henter DDM tiles og beregner vandrute...');setRouteBusy(true);setRoutingDebug('Beregner rute',null,0,0);setTimeout(async()=>{try{state.trollingEnabled?await makeTrollingRoute():await makeFreeRoute()}catch(e){console.error(e);handleRoutingFailure('Ruteberegning fejlede: '+(e?.message||e))}finally{setRouteBusy(false);updateRouteActionButtons()}},30)}
function setRouteBusy(busy){for(const id of ['makeRoute','makeRouteMain']){const el=$(id);if(el)el.disabled=!!busy||!state.tileManifest||state.manifestStatus!=='ready'}}

async function makeTrollingRoute(){
 if(!state.start||!state.end)return handleRoutingFailure('Vælg start og slut først.');
 if(!requireTileManifest('Lav trollingrute'))return;
 if(!await prepareRoutingGrid(state.start,state.end))return handleRoutingFailure(state.lastTileLoadError||'Manglende DDM tile eller start/slut uden for installeret DDM-område.');
 const target=selectedDepth();
 const tolerance=selectedTolerance();
 const result=buildWaterRoute(state.start,state.end,{mode:'trolling',targetDepth:target,tolerance,minDepth:0.4});
 if(!result.ok)return handleRoutingFailure(result.message);
 state.currentRoute={id:'r_'+Date.now(),name:'',mode:'trolling',depth:target,actualDepth:result.avgDepth,points:result.points,created:new Date().toISOString(),lengthNm:pathNm(result.points),source:'Danmarks Dybdemodel 2024 ddm_50m.dybde · water-only A* routing',stats:result.stats};
 drawRoute(result.points,target,`TrollingMode · DDM vandrute omkring ${target.toFixed(1)} m`);
 logRoutingSuccess(state.currentRoute,'trolling');
 updateRouteActionButtons();$('routeLength').textContent=`${state.currentRoute.lengthNm.toFixed(2)} NM`;
 setStatus(`DDM-vandrute fundet. Gennemsnitsdybde ${result.avgDepth.toFixed(1)} m, min ${result.stats.minDepth.toFixed(1)} m. Ingen landceller i ruten. Grid: ${routingGridLabel()}.`)
}
async function makeFreeRoute(){
 if(!state.start||!state.end)return handleRoutingFailure('Vælg start og slut først.');
 if(!requireTileManifest('Lav fri rute'))return;
 if(!await prepareRoutingGrid(state.start,state.end))return handleRoutingFailure(state.lastTileLoadError||'Manglende DDM tile eller start/slut uden for installeret DDM-område.');
 const target=selectedFreeMinDepth();
 const tolerance=selectedTolerance();
 const minDepth=freeMinDepth();
 const result=buildWaterRoute(state.start,state.end,{mode:'free',targetDepth:target,tolerance,minDepth});
 if(!result.ok)return handleRoutingFailure(result.message);
 state.currentRoute={id:'r_'+Date.now(),name:'',mode:'free',depth:target,minDepth,actualDepth:result.avgDepth,points:result.points,created:new Date().toISOString(),lengthNm:pathNm(result.points),source:'Danmarks Dybdemodel 2024 ddm_50m.dybde · depth-aware water-only A* routing',stats:result.stats};
 drawRoute(result.points,target,`Fri navigation · DDM vandrute ≥${minDepth.toFixed(1)} m / mål ${target.toFixed(1)} m`);
 logRoutingSuccess(state.currentRoute,'free');
 updateRouteActionButtons();$('routeLength').textContent=`${state.currentRoute.lengthNm.toFixed(2)} NM`;
 setStatus(`Fri DDM-vandrute fundet. Valgt minimumsdybde ${minDepth.toFixed(1)} m. Verificeret minimum på ruten ${result.stats.minDepth.toFixed(1)} m inkl. 3x3 grid-clearance. Ruten krydser ikke land/for lavt vand. Grid: ${routingGridLabel()}.`)
}

function routingGridLabel(){return state.depthGridSource||'DDM tiles'}

function setRoutingDebug(status,error=null,pointCount=null,distanceNm=null){
 state.routeDebug.lastStatus=status;
 state.routeDebug.lastError=error;
 if(pointCount!==null)state.routeDebug.pointCount=Number(pointCount)||0;
 if(distanceNm!==null)state.routeDebug.distanceNm=Number(distanceNm)||0;
 state.routeDebug.layerVisible=routeLayerVisible();
 updateRouteDebugUi();
}

function routeLayerVisible(){
 const hasLayer=!!state.routeLayer&&map.hasLayer(state.routeLayer);
 const el=state.routeLine?.getElement?.();
 if(!hasLayer)return false;
 if(!el)return true;
 const style=getComputedStyle(el);
 let box=null;
 try{box=el.getBBox?.()}catch{box=null}
 return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&(!box||box.width>0||box.height>0);
}

function updateRouteDebugUi(){
 const points=state.currentRoute?.points||[];
 const count=points.length||state.routeDebug.pointCount||0;
 const distance=Number(state.currentRoute?.lengthNm??state.routeDebug.distanceNm??0);
 state.routeDebug.layerVisible=routeLayerVisible();
 if($('routeDebugActive'))$('routeDebugActive').textContent=state.currentRoute?.points?.length?'Ja':'Nej';
 if($('routeDebugPoints'))$('routeDebugPoints').textContent=String(count);
 if($('routeDebugDistance'))$('routeDebugDistance').textContent=distance?`${distance.toFixed(2)} NM`:'0.00 NM';
 if($('routeDebugLayer'))$('routeDebugLayer').textContent=state.routeDebug.layerVisible?'Ja':'Nej';
 if($('routeDebugStatus'))$('routeDebugStatus').textContent=state.routeDebug.lastError||state.routeDebug.lastStatus||'Ingen';
}

function logRoutingSuccess(route,mode){
 setRoutingDebug('Rute beregnet',null,route.points.length,route.lengthNm);
 console.info('WaterNav routing success',{mode,routePointCount:route.points.length,routeDistanceNm:Number(route.lengthNm.toFixed(3)),layerVisible:routeLayerVisible(),bounds:state.routeBounds});
}

function handleRoutingFailure(message){
 const concrete=message||'Ingen vandrute fundet';
 setRoutingDebug('Routing fejlede',concrete,0,0);
 console.warn('WaterNav routing failure',{message:concrete,start:state.start,end:state.end,loadedDepthTiles:state.loadedDepthTiles.size,failedTiles:state.failedTileCount});
 setStatus(concrete);
 return false;
}

function buildWaterRoute(start,end,opts){
 const grid=state.depthGrid;
 const sCell=nearestNavigableCell(start,opts);
 const eCell=nearestNavigableCell(end,opts);
 if(!sCell)return{ok:false,message:'Startpunktet ligger ikke tæt på sejlbart DDM-vand i gridområdet.'};
 if(!eCell)return{ok:false,message:'Slutpunktet ligger ikke tæt på sejlbart DDM-vand i gridområdet.'};
 const path=aStarGrid(sCell,eCell,opts);
 if(!path||path.length<2)return{ok:false,message:`Ingen vandrute fundet med minimum ${Number(opts.minDepth||0).toFixed(1)} m. Prøv lavere minimumsdybde eller flyt start/slut til dybere vand.`};
 let pts=path.map(cellToLatLng);
 pts=simplifyWaterSafe(pts,opts);
 if(!validateWaterPath(pts,opts))return{ok:false,message:'Ruten blev afvist: validering fandt land/ukendt eller for lav dybde på et ruteben.'};
 const depths=samplePathDepths(pts,opts);
 const minDepth=Math.min(...depths),maxDepth=Math.max(...depths),avgDepth=depths.reduce((a,b)=>a+b,0)/Math.max(1,depths.length);
 return{ok:true,points:pts,avgDepth,stats:{minDepth,maxDepth,avgDepth,gridSteps:path.length,startDepth:depthAtCell(sCell.r,sCell.c),endDepth:depthAtCell(eCell.r,eCell.c)}};
}
function nearestNavigableCell(p,opts){
 const base=latLngToCell(p);if(!base)return null;
 let best=null;
 const maxR=34;
 for(let radius=0;radius<=maxR;radius++){
  for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
   if(Math.max(Math.abs(dr),Math.abs(dc))!==radius)continue;
   const r=base.r+dr,c=base.c+dc,d=depthAtCell(r,c);
   if(!cellNavigable(r,c,opts))continue;
   const cell={r,c};const geo=cellToLatLng(cell);const dist=directNm(p,geo);
   const depthPenalty=opts.mode==='trolling'&&Number.isFinite(opts.targetDepth)?Math.abs(d-opts.targetDepth)*0.85:0;
   const score=dist+depthPenalty;
   if(!best||score<best.score)best={r,c,score};
  }
  if(best&&radius>10)return best;
 }
 return best;
}

class MinHeap{
 constructor(){this.heap=[]}
 size(){return this.heap.length}
 push(item){this.heap.push(item);this.bubbleUp(this.heap.length-1)}
 pop(){
  if(this.heap.length===0)return null;
  const top=this.heap[0];
  const last=this.heap.pop();
  if(this.heap.length>0){this.heap[0]=last;this.sinkDown(0)}
  return top;
 }
 bubbleUp(i){
  const h=this.heap;
  while(i>0){
   const p=(i-1)>>1;
   if(h[p].f<=h[i].f)break;
   [h[p],h[i]]=[h[i],h[p]];i=p;
  }
 }
 sinkDown(i){
  const h=this.heap;
  while(true){
   const l=i*2+1,r=l+1;let s=i;
   if(l<h.length&&h[l].f<h[s].f)s=l;
   if(r<h.length&&h[r].f<h[s].f)s=r;
   if(s===i)break;
   [h[s],h[i]]=[h[i],h[s]];i=s;
  }
 }
}

function aStarGrid(start,end,opts){
 const grid=state.depthGrid,rows=grid.rows,cols=grid.cols;
 const startKey=start.r+','+start.c,endKey=end.r+','+end.c;
 const open=new MinHeap();open.push({r:start.r,c:start.c,g:0,f:0,key:startKey});
 const came=new Map(),gScore=new Map([[startKey,0]]),closed=new Set();
 const targetDepth=opts.targetDepth,minDepth=opts.minDepth;
 const maxIter=rows*cols;
 let iter=0;
 while(open.size()&&iter++<maxIter){
  const cur=open.pop();
  if(closed.has(cur.key))continue;
  if(cur.key===endKey)return reconstructPath(came,cur);
  closed.add(cur.key);
  for(const nb of neighbors(cur.r,cur.c,rows,cols)){
   const nKey=nb.r+','+nb.c;if(closed.has(nKey))continue;
   const d=depthAtCell(nb.r,nb.c);
   if(!cellNavigable(nb.r,nb.c,opts))continue;
   // Prevent diagonal squeezing through land, unknown depth, or too-shallow cells.
   if(nb.diag){
    if(!cellNavigable(cur.r,nb.c,opts)||!cellNavigable(nb.r,cur.c,opts))continue;
   }
   let step=nb.diag?1.414:1;
   let cost=step;
   if(opts.mode==='trolling'){
    const diff=Math.abs(d-targetDepth);
    cost += diff*diff*3.2 + diff*0.85;
    if(diff<=opts.tolerance)cost *= 0.55;
   }else{
    // Free navigation: selected depth is a HARD minimum; then prefer deeper water.
    const clearance=d-minDepth;
    if(clearance<0)continue;
    if(clearance<0.75)cost += (0.75-clearance)*8.0;
    cost += 1/(0.35+Math.max(0,clearance))*0.35;
    if(d>=minDepth+1.5)cost *= 0.88;
   }
   const tentative=(gScore.get(cur.key)??Infinity)+cost;
   if(tentative < (gScore.get(nKey)??Infinity)){
    came.set(nKey,{r:cur.r,c:cur.c,key:cur.key});gScore.set(nKey,tentative);
    const h=Math.hypot(nb.r-end.r,nb.c-end.c);
    open.push({r:nb.r,c:nb.c,g:tentative,f:tentative+h,key:nKey});
   }
  }
 }
 return null;
}
function neighbors(r,c,rows,cols){const out=[];for(const dr of[-1,0,1])for(const dc of[-1,0,1]){if(!dr&&!dc)continue;const nr=r+dr,nc=c+dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols)out.push({r:nr,c:nc,diag:dr&&dc})}return out}
function reconstructPath(came,cur){const out=[{r:cur.r,c:cur.c}];let key=cur.key;while(came.has(key)){const p=came.get(key);out.push({r:p.r,c:p.c});key=p.key}return out.reverse()}
function depthAtCell(r,c){const grid=state.depthGrid;if(!grid||r<0||c<0||r>=grid.rows||c>=grid.cols)return NaN;if(grid.mode==='tiles'){const hit=loadedDepthTileForCell(r,c);if(!hit)return NaN;const d=hit.tile.data[hit.r]?.[hit.c];return typeof d==='number'?d:NaN;}const d=grid.data?.[r]?.[c];return typeof d==='number'?d:NaN}
function loadedDepthTileForCell(r,c){
 const manifest=state.tileManifest;
 const tileSize=manifest?.grid?.tileSize||state.depthGrid?.tileSize;
 if(!tileSize)return null;
 const id=tileIdForCell(r,c,tileSize);
 const tile=state.loadedDepthTiles.get(id);
 if(!tile)return null;
 const localR=r-tile.row0,localC=c-tile.col0;
 if(localR<0||localC<0||localR>=tile.rows||localC>=tile.cols)return null;
 tile.lastUsed=Date.now();
 return{tile,r:localR,c:localC};
}
function tileIdForCell(r,c,tileSize){
 return`r${String(Math.floor(r/tileSize)).padStart(2,'0')}_c${String(Math.floor(c/tileSize)).padStart(2,'0')}`;
}
function latLngToCell(p){const grid=state.depthGrid;if(!grid)return null;const b=grid.bounds,step=grid.step;if(p.lat<b.latMin||p.lat>b.latMax||p.lng<b.lngMin||p.lng>b.lngMax)return null;return{r:Math.round((p.lat-b.latMin)/step),c:Math.round((p.lng-b.lngMin)/step)}}
function cellToLatLng(cell){const grid=state.depthGrid,b=grid.bounds,step=grid.step;return{lat:b.latMin+cell.r*step,lng:b.lngMin+cell.c*step}}
function depthAtLatLng(p){const prev=state.depthGrid;const g=bestDepthGridForPoint(p);if(g!==prev)state.depthGrid=g;const cell=latLngToCell(p);const d=cell?depthAtCell(cell.r,cell.c):NaN;state.depthGrid=prev;return d}
function minNeighborhoodDepth(r,c,radius=1){let min=Infinity;for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){const d=depthAtCell(r+dr,c+dc);if(!Number.isFinite(d))return NaN;if(d<min)min=d}return min}
function cellNavigable(r,c,opts){
 const d=depthAtCell(r,c);if(!Number.isFinite(d)||d<opts.minDepth)return false;
 // In free navigation the selected depth is a safety floor. Use 3x3 clearance so a route cannot skim across shallow grid edges.
 if(opts.mode==='free'){
  const nd=minNeighborhoodDepth(r,c,1);
  if(!Number.isFinite(nd)||nd<opts.minDepth)return false;
 }
 return true;
}
function validateWaterPath(points,opts){for(let i=1;i<points.length;i++){if(!segmentWaterClear(points[i-1],points[i],opts))return false}return true}
function segmentWaterClear(a,b,opts){const dist=directNm(a,b);const n=Math.max(2,Math.ceil(dist*1852/18));for(let i=0;i<=n;i++){const t=i/n;const p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};const cell=latLngToCell(p);if(!cell||!cellNavigable(cell.r,cell.c,opts))return false}return true}
function samplePathDepths(points,opts){const out=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const dist=directNm(a,b);const n=Math.max(2,Math.ceil(dist*1852/18));for(let k=0;k<=n;k++){const t=k/n;const p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};const cell=latLngToCell(p);if(!cell)continue;const d=opts.mode==='free'?minNeighborhoodDepth(cell.r,cell.c,1):depthAtCell(cell.r,cell.c);if(Number.isFinite(d))out.push(d)}}return out.length?out:points.map(depthAtLatLng).filter(Number.isFinite)}
function simplifyWaterSafe(points,opts){
 if(points.length<3)return points;
 const out=[points[0]];let anchor=0;
 for(let i=2;i<points.length;i++){
  if(!segmentWaterClear(points[anchor],points[i],opts)){
   out.push(points[i-1]);anchor=i-1;
  }
 }
 out.push(points[points.length-1]);
 // second pass: keep trolling routes from over-simplifying away from target depth.
 if(opts.mode==='trolling'&&Number.isFinite(opts.targetDepth)){
  const refined=[out[0]];
  for(let i=1;i<out.length;i++){
   const a=refined[refined.length-1],b=out[i];
   const dist=directNm(a,b);const n=Math.ceil(dist*1852/220);
   if(n>1){for(let k=1;k<n;k++){const t=k/n;const p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};const d=depthAtLatLng(p);if(Number.isFinite(d)&&Math.abs(d-opts.targetDepth)<=1.4)refined.push(p)}}
   refined.push(b);
  }
  return refined;
 }
 return out;
}
function bestContourForStartEnd(contours,start,end){let best=null;for(const c of contours){if(c.points.length<2)continue;const a=nearestIndex(c.points,start),b=nearestIndex(c.points,end);if(a.i===b.i)continue;const part=sliceContour(c,a.i,b.i);const length=pathNm(part);const score=a.d*1.8+b.d*1.8+Math.abs(c.depth-selectedDepth())*1500+Math.abs(length-directNm(start,end))*0.08+(1/(Math.abs(a.i-b.i)+1));if(!best||score<best.score)best={contour:c,iStart:a.i,iEnd:b.i,score}}return best}
function nearestIndex(points,p){let best={i:0,d:Infinity};for(let i=0;i<points.length;i++){const d=directNm(points[i],p);if(d<best.d)best={i,d}}return best}
function sliceContour(c,i1,i2){const pts=c.points;if(i1>i2)[i1,i2]=[i2,i1];let part=pts.slice(i1,i2+1);const alt=pts.slice(i2).concat(pts.slice(0,i1+1));if(alt.length>2&&pathNm(alt)<pathNm(part))part=alt;return simplify(part,.00012)}
function drawRoute(points,depth,label){
 if(state.routeLayer)map.removeLayer(state.routeLayer);
 state.routeLayer=null;state.routeLine=null;state.routeBounds=null;
 const latLngs=points.map(p=>[p.lat,p.lng]);
 const tip=label || (Number.isFinite(depth)?`Trollingrute · DDM ${depth.toFixed(1)}m`:'Fri navigationsrute');
 const halo=L.polyline(latLngs,{pane:'routePane',color:'#ff1f2d',weight:10,opacity:.72,lineCap:'round',lineJoin:'round'});
 const line=L.polyline(latLngs,{pane:'routePane',color:'#20d8ff',weight:6,opacity:1,lineCap:'round',lineJoin:'round'}).bindTooltip(tip,{sticky:true});
 state.routeLine=line;
 state.routeLayer=L.layerGroup([halo,line]).addTo(map);
 state.routeBounds=line.getBounds();
 line.bringToFront?.();
 if(state.routeBounds?.isValid?.())map.fitBounds(state.routeBounds,{padding:[70,70],maxZoom:15});
 updateInfoBox();updateRouteActionButtons();updateRouteDebugUi();
 requestAnimationFrame(()=>{updateRouteDebugUi();console.info('WaterNav route layer drawn',{routePointCount:points.length,routeDistanceNm:Number(pathNm(points).toFixed(3)),layerVisible:routeLayerVisible()})});
}
function clearRoute(){
 stopNavigation(true);
 if(state.routeLayer){map.removeLayer(state.routeLayer);state.routeLayer=null}
 state.routeLine=null;state.routeBounds=null;
 if(state.startMarker){map.removeLayer(state.startMarker);state.startMarker=null}
 if(state.endMarker){map.removeLayer(state.endMarker);state.endMarker=null}
 state.start=null;state.end=null;state.currentRoute=null;state.pickMode=null;
 setRoutingDebug('Rute ryddet',null,0,0);
 updateInfoBox();updateRouteActionButtons();
 $('routeLength').textContent='—';
 setStatus('Aktiv rute og navigation er ryddet. Hjemhavn, settings og gemte ruter er bevaret.');
}
function setDisabled(id,disabled){const el=$(id);if(el)el.disabled=!!disabled}
function updateRouteActionButtons(){
 const manifestReady=!!state.tileManifest&&state.manifestStatus==='ready';
 const has=!!state.currentRoute?.points?.length;
 const isTrolling=state.currentRoute?.mode==='trolling';
 setDisabled('makeRoute',!manifestReady);
 setDisabled('makeRouteMain',!manifestReady);
 setDisabled('loadLocalContours',!manifestReady);
 setDisabled('refreshMapTiles',!manifestReady);
 setDisabled('startNav',!has||state.navActive);
 setDisabled('stopNav',!state.navActive);
 setDisabled('saveRouteMain',!has);
 setDisabled('startTrolling',!has||!isTrolling||state.navActive);
 setDisabled('stopTrolling',!state.navActive||!isTrolling);
 setDisabled('reverseRoute',!has||!isTrolling);
 setDisabled('saveRoute',!has||!isTrolling);
}
function reverseCurrentRoute(){if(!state.currentRoute?.points?.length)return setStatus('Ingen rute at vende.');if(state.currentRoute.mode!=='trolling')return setStatus('Vend retning bruges til trollingstrækninger.');state.currentRoute.points=[...state.currentRoute.points].reverse();state.currentRoute.reversed=!state.currentRoute.reversed;state.trollingDirection=state.currentRoute.reversed?-1:1;const first=state.currentRoute.points[0],last=state.currentRoute.points[state.currentRoute.points.length-1];setStart(first);setEnd(last);drawRoute(state.currentRoute.points,Number(state.currentRoute.actualDepth||state.currentRoute.depth),`Trollingstrækning · ${state.currentRoute.depth}m · ${state.currentRoute.reversed?'retur':'frem'}`);logRoutingSuccess(state.currentRoute,'reverse');if(state.navActive)updateNavigation();setStatus('Trollingretning vendt. Sejl samme strækning tilbage.')}
function startNavigation(){if(!state.currentRoute?.points?.length)return setStatus('Ingen rute at navigere efter.');state.navActive=true;updateRouteActionButtons();setStatus(state.currentRoute.mode==='trolling'?'Trolling startet. Kurslinje 1/2/3 NM vises ved GPS/COG.':'Navigation startet. Kurslinje 1/2/3 NM vises ved GPS/COG.');updateNavigation();}
function startTrolling(){if(state.currentRoute?.mode!=='trolling')return setStatus('Vælg eller lav en trollingrute først.');startNavigation();}
function stopNavigation(silent=false){state.navActive=false;updateRouteActionButtons();$('navNext').textContent='—';$('navXte').textContent='—';updateInfoBox();drawForwardLine(Number.isFinite(state.lastCog)?state.lastCog:NaN);if(!silent)setStatus('Navigation stoppet.')}
function updateNavigation(){if(!state.gps||!state.currentRoute?.points?.length)return;const pts=state.currentRoute.points;let near=nearestIndex(pts,state.gps);let nextIdx=Math.min(pts.length-1,near.i+Math.max(3,Math.round(pts.length/30)));let next=pts[nextIdx];const distNext=directNm(state.gps,next);const xte=near.d;const brg=bearingDeg(state.gps,next);$('navNext').textContent=`${distNext.toFixed(2)} NM · ${Math.round(brg)}°`;$('navXte').textContent=`${xte.toFixed(2)} NM`;checkNavigationAlarms(xte);updateInfoBox();drawForwardLine(Number.isFinite(state.lastCog)?state.lastCog:brg);if(map.getZoom()>=12)map.panTo(state.gps,{animate:true,duration:.25});applyMapOrientation(false)}
function drawForwardLine(heading){
 state.forwardLayer.clearLayers();
 if(!state.gps||!Number.isFinite(heading)){$('navAhead').textContent='Venter på GPS-kurs';return;}
 const sog=state.lastSogKn||0;
 const line=[state.gps];
 for(const nm of [1,2,3])line.push(destinationPoint(state.gps,heading,nm));
 L.polyline(line.map(p=>[p.lat,p.lng]),{color:'#ff1f2d',weight:4,opacity:.94,dashArray:'10 8'}).addTo(state.forwardLayer);
 const parts=[];
 for(const nm of [1,2,3]){
  const p=destinationPoint(state.gps,heading,nm);
  const min=sog>0.3?Math.round((nm/sog)*60):null;
  const d=depthAtLatLng(p);
  const depthText=Number.isFinite(d)?` · ${d.toFixed(1)} m DDM`:'';
  parts.push(min?`${nm}NM ${min}m`:`${nm}NM`);
  L.circleMarker([p.lat,p.lng],{radius:5,color:'#ff1f2d',weight:3,fillColor:'#fff',fillOpacity:1}).bindTooltip(`<span class="course-label-text">${nm} NM${min?` · ca. ${min} min`:''}${depthText}</span>`,{permanent:true,direction:'right',offset:[8,0],className:'course-distance-label'}).addTo(state.forwardLayer)
 }
 $('navAhead').textContent=parts.join(' · ')
}


function checkNavigationAlarms(xte){
 const notes=[];
 const d=state.gps?depthAtLatLng(state.gps):NaN;
 const min=state.currentRoute?.mode==='free'?Number(state.currentRoute.minDepth||state.currentRoute.depth||0):Number(state.currentRoute?.depth||selectedDepth());
 if(state.depthAlarm&&Number.isFinite(d)&&Number.isFinite(min)&&d<min)notes.push(`ADVARSEL: DDM-dybde ${d.toFixed(1)} m er under valgt ${min.toFixed(1)} m`);
 if(state.offRouteAlarm&&Number.isFinite(xte)&&xte>0.08)notes.push(`ADVARSEL: ${xte.toFixed(2)} NM fra ruten`);
 if(notes.length)setStatus(notes.join(' · '));
}

function updateInfoBox(){
 const heading=Number.isFinite(state.lastCog)?`${Math.round(state.lastCog)}° COG`:'—';
 const sog=Number.isFinite(state.lastSogKn)?state.lastSogKn:NaN;
 const speed=Number.isFinite(sog)?`${sog.toFixed(1)} kn`:'—';
 let eta='—';
 if(state.gps&&state.currentRoute?.points?.length&&Number.isFinite(sog)&&sog>0.3){
  const remaining=remainingRouteNm(state.currentRoute.points,state.gps);
  eta=`${formatEta(remaining,sog)}`;
 }else if(state.currentRoute?.points?.length){
  eta='venter på fart';
 }else{
  eta='ingen rute';
 }
 if($('infoHeading'))$('infoHeading').textContent=heading;
 if($('infoSpeed'))$('infoSpeed').textContent=speed;
 if($('infoEta'))$('infoEta').textContent=eta;
}
function remainingRouteNm(points,pos){
 if(!points?.length||!pos)return 0;
 const near=nearestIndex(points,pos);
 let rem=0;
 if(near.i>=points.length-1)return directNm(pos,points[points.length-1]);
 rem+=directNm(pos,points[near.i+1]);
 for(let i=near.i+2;i<points.length;i++)rem+=directNm(points[i-1],points[i]);
 return rem;
}
function formatEta(nm,sogKn){
 if(!Number.isFinite(nm)||!Number.isFinite(sogKn)||sogKn<=0.3)return '—';
 const totalMin=Math.max(0,Math.round((nm/sogKn)*60));
 if(totalMin<60)return `${totalMin} min`;
 const h=Math.floor(totalMin/60),m=totalMin%60;
 return `${h}t ${String(m).padStart(2,'0')}m`;
}

function defaultRouteName(route){return route?.mode==='free'?`Fri navigationsrute ${route.depth}m`:`${route?.depth??selectedDepth()}m DDM trollingrute`}
function saveCurrentRoute(){if(!state.currentRoute)return setStatus('Ingen rute at gemme.');openRouteNameDialog(defaultRouteName(state.currentRoute))}
function openRouteNameDialog(defaultName){
 state.pendingRouteSave=state.currentRoute;
 const overlay=$('routeNameOverlay'),input=$('routeNameInput');
 if(!overlay||!input)return confirmRouteSave(defaultName);
 input.value=defaultName||'Rute';
 overlay.hidden=false;
 setTimeout(()=>{input.focus();input.select()},40);
}
function closeRouteNameDialog(){state.pendingRouteSave=null;if($('routeNameOverlay'))$('routeNameOverlay').hidden=true}
function confirmRouteSave(fallbackName){
 const route=state.pendingRouteSave||state.currentRoute;
 if(!route)return closeRouteNameDialog();
 const raw=$('routeNameInput')?.value||fallbackName||defaultRouteName(route);
 const name=String(raw).trim();
 if(!name){setStatus('Angiv et navn til ruten.');return;}
 route.name=name;
 state.currentRoute=route;
 state.savedRoutes.unshift({...route});
 localStorage.setItem(STORAGE_KEY,JSON.stringify(state.savedRoutes));
 renderSavedRoutes();
 closeRouteNameDialog();
 setStatus(`Rute gemt: ${route.name}`)
}
function loadSavedRoutes(){try{state.savedRoutes=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{state.savedRoutes=[]}}
function renderSavedRoutes(){
 $('savedCount').textContent=String(state.savedRoutes.length);
 $('savedRoutes').innerHTML='';
 for(const r of state.savedRoutes){
  const card=document.createElement('div');
  card.className='savedCard';
  card.innerHTML=savedRouteHtml(r,true);
  card.querySelector('[data-act=load]').onclick=()=>loadSavedRoute(r,false);
  card.querySelector('[data-act=nav]').onclick=()=>loadSavedRoute(r,true);
  card.querySelector('[data-act=del]').onclick=()=>deleteSavedRoute(r);
  $('savedRoutes').appendChild(card);
 }
 renderSavedTrollingRoutes();
}
function savedRouteHtml(r,allowDelete=false){
 const meta=r.mode==='free'?`Fri navigation · mål ${r.depth??'—'}m · min ${r.minDepth??'—'}m · ${Number(r.lengthNm||0).toFixed(2)} NM`:`TrollingMode · mål ${r.depth}m · DDM ${Number(r.actualDepth||r.depth).toFixed(1)}m · ${Number(r.lengthNm||0).toFixed(2)} NM`;
 return `<strong>${escapeHtml(r.name||'Rute')}</strong><small>${new Date(r.created).toLocaleString('da-DK')} · ${meta}</small><div class="savedActions"><button data-act="load">Vis</button><button data-act="nav">Navigér</button>${allowDelete?'<button data-act="del">Slet</button>':''}</div>`;
}
function loadSavedRoute(r,startNow=false){
 if(r.mode==='free')setTrollingMode(false,true);else setTrollingMode(true,true);
 state.currentRoute={...r};
 drawRoute(r.points,Number(r.actualDepth||r.depth),r.mode==='free'?`Fri navigationsrute · mål ${r.depth??'—'}m`:undefined);
 logRoutingSuccess(state.currentRoute,'saved');
 if(r.points?.length){setStart(r.points[0]);setEnd(r.points[r.points.length-1])}
 updateRouteActionButtons();
 if(startNow)startNavigation();else setStatus(`Viser gemt rute: ${r.name||'Rute'}`);
}
function deleteSavedRoute(r){state.savedRoutes=state.savedRoutes.filter(x=>x.id!==r.id);localStorage.setItem(STORAGE_KEY,JSON.stringify(state.savedRoutes));renderSavedRoutes()}
function toggleSavedTrollingRoutes(){const box=$('savedTrollingRoutes');if(!box)return;box.hidden=!box.hidden;renderSavedTrollingRoutes()}
function renderSavedTrollingRoutes(){
 const box=$('savedTrollingRoutes');
 if(!box)return;
 box.innerHTML='';
 const routes=state.savedRoutes.filter(r=>r.mode==='trolling');
 if($('chooseTrollingRoute'))$('chooseTrollingRoute').disabled=!routes.length;
 if(!routes.length){box.innerHTML='<div class="emptySaved">Ingen gemte trollingruter endnu.</div>';return;}
 for(const r of routes){
  const card=document.createElement('div');
  card.className='savedCard';
  card.innerHTML=savedRouteHtml(r,false);
  card.querySelector('[data-act=load]').onclick=()=>loadSavedRoute(r,false);
  card.querySelector('[data-act=nav]').onclick=()=>loadSavedRoute(r,true);
  box.appendChild(card);
 }
}
async function cleanupOldCaches(){if(!('caches' in window)) return;try{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('waternav-') && k!=='waternav-v45.4').map(k=>caches.delete(k)))}catch(e){console.warn('Cache cleanup failed',e)}}
function inferCogFromGps(prev,next){
 if(!prev||!next)return NaN;
 const dt=((next.time||Date.now())-(prev.time||Date.now()))/1000;
 const dist=directNm(prev,next);
 // Avoid noisy course changes when stationary or GPS barely moved.
 if(!Number.isFinite(dt)||dt<=0||dist<0.003)return NaN;
 return bearingDeg(prev,next);
}
function directNm(a,b){const R=6371000,φ1=a.lat*Math.PI/180,φ2=b.lat*Math.PI/180,dφ=(b.lat-a.lat)*Math.PI/180,dλ=(b.lng-a.lng)*Math.PI/180;const x=Math.sin(dφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;return (2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)))/1852}
function bearingDeg(a,b){const φ1=a.lat*Math.PI/180,φ2=b.lat*Math.PI/180,λ1=a.lng*Math.PI/180,λ2=b.lng*Math.PI/180;const y=Math.sin(λ2-λ1)*Math.cos(φ2);const x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);return (Math.atan2(y,x)*180/Math.PI+360)%360}
function destinationPoint(p,bearing,nm){const R=6371000,d=nm*1852,δ=d/R,θ=bearing*Math.PI/180,φ1=p.lat*Math.PI/180,λ1=p.lng*Math.PI/180;const φ2=Math.asin(Math.sin(φ1)*Math.cos(δ)+Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));const λ2=λ1+Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1),Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));return{lat:φ2*180/Math.PI,lng:((λ2*180/Math.PI+540)%360)-180}}
function pathNm(points){let s=0;for(let i=1;i<points.length;i++)s+=directNm(points[i-1],points[i]);return s}
function simplify(points,tol){if(points.length<3)return points;const out=[points[0]];let last=points[0];for(let i=1;i<points.length-1;i++){if(Math.abs(points[i].lat-last.lat)+Math.abs(points[i].lng-last.lng)>tol){out.push(points[i]);last=points[i]}}out.push(points[points.length-1]);return out}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
