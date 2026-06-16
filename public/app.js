'use strict';
const VERSION='v46.0';
const TILE_MANIFEST_PATH='./data/tiles/ddm-tile-manifest.json';
const MAX_DEPTH_TILES=180;
const MAX_CONTOUR_TILES=36;
const VIEW_TILE_PAD_DEG=0.08;
const ROUTE_ENDPOINT_MAX_NM=0.22;
const FINE_GRID_CLEARANCE_MAX_M=150;
const FOLLOW_GPS_Y_RATIO=0.62;
const AUTO_FOLLOW_GUARD_MS=1200;
const FINE_COLLISION_GRID_PATH='./data/depth-grid-ddm.json';
const ROUTE_SMOOTHING_ENABLED=true;
const ROUTE_SMOOTHING_VALUES=new Set(['off','normal','high']);
const SEA_TROUT_MISSING_DATA_MESSAGE='Kan ikke beregne sikker trollingrute – mangler dybdedata for området.';
const LYNAES_HARBOUR={lat:55.94,lng:11.875};
const LYNAES_SEA_TROUT_PROFILE={
 id:'lynaes-summer-25',
 name:'Lynæs Sommerhavørred 2,5 timer',
 startLabel:'Lynæs Havn',
 harbor:LYNAES_HARBOUR,
 targetNm:7.4,
 speedKn:2.4,
 expectedHours:2.5,
 depthRange:[3,10],
 boatMinDepth:2,
 targetDepth:6.5,
 tolerance:1.8,
 searchBounds:{latMin:55.925,latMax:55.985,lngMin:11.805,lngMax:11.915},
 focusAreas:[
  {id:'hundested-slope',name:'Hundested-skrænten',priority:4.8,bounds:{latMin:55.944,latMax:55.968,lngMin:11.825,lngMax:11.862},axis:{lat:1,lng:-0.28},note:'Fisker langs den nærmeste sejlbare del af skrænten på Hundested-siden.'},
  {id:'hundested-light',name:'Hundested Fyr',priority:4.1,bounds:{latMin:55.945,latMax:55.965,lngMin:11.830,lngMax:11.884},axis:{lat:0.72,lng:-1},note:'Vender mod Hundested Fyr-kanten uden at gå ind på lavt plateau.'},
  {id:'skansehage',name:'Skansehage',priority:3.1,bounds:{latMin:55.935,latMax:55.958,lngMin:11.815,lngMax:11.845},axis:{lat:0.25,lng:1},note:'Holder Skansehage som ydre reference uden at tvinge en lang krydsning.'},
  {id:'isefjord-mouth',name:'Isefjord-mundingen',priority:4.4,bounds:{latMin:55.930,latMax:55.960,lngMin:11.825,lngMax:11.910},axis:{lat:1,lng:0.12},note:'S-kurver over de nærmeste dybdekanter i mundingen.'}
 ]
};
const CATCH_LOG_KEY='waternav.catchLog.v1';
const TRACK_LOG_KEY='waternav.trackLog.v1';
const TRACK_PREF_KEY='waternav.trackPrefs.v1';
const TRACK_DRAFT_KEY='waternav.trackDraft.v1';
const STORAGE_KEY='waternav.routes.v1';
const ORIENTATION_KEY='waternav.orientation.v1';
const HOME_KEY='waternav.homePort.v1';
const USER_SETTINGS_KEY='waternav.userSettings.v1';
const OLD_ROUTE_KEYS=['waternav.routes.v34','waternav.routes.v33','waternav.routes.v32','waternav.routes.v31','waternav.routes.v30'];
const OLD_ORIENTATION_KEYS=['waternav.orientation.v34','waternav.orientation.v33','waternav.orientation.v32','waternav.orientation.v31'];
const OLD_HOME_KEYS=['waternav.homePort.v34','waternav.homePort.v33','waternav.homePort.v32','waternav.homePort.v31'];
const state={pickMode:null,start:null,end:null,gps:null,lastSogKn:null,lastCog:null,prevGps:null,contours:[],activeContours:[],routeLayer:null,routeLine:null,routeBounds:null,startMarker:null,endMarker:null,currentRoute:null,pendingRouteSave:null,savedRoutes:[],catchLogs:[],depthGrid:null,localDepthGrid:null,denmarkDepthGrid:null,depthGridSource:'tiles',collisionGrid:null,collisionGridStatus:'idle',collisionGridError:null,tileManifest:null,manifestStatus:'idle',manifestError:null,tileById:new Map(),loadedDepthTiles:new Map(),loadingDepthTiles:new Map(),loadedContourTiles:new Map(),loadingContourTiles:new Map(),visibleTileIds:new Set(),routingTileIds:new Set(),tileUpdateTimer:null,tileProgress:null,tileProgressSeq:0,lastTileLoadError:null,tileErrors:[],failedTileCount:0,lastTileError:null,lastDepthProbe:null,routeSmoothing:'off',routeSmoothingUserSelected:false,routeDebug:{lastStatus:'Ingen rute beregnet endnu',lastError:null,pointCount:0,distanceNm:0,layerVisible:false,routingMode:'-',routingSource:'-',gridResolutionM:0,visitedCells:0,routingTileCount:0,fallbackUsed:false,reachedDestination:false,routeComplete:false,lastDistanceNm:0,startNode:null,destinationNode:null,lastPoint:null,originalPointCount:0,smoothedPointCount:0,smoothingReductionPct:0,smoothingMode:'off',smoothingSplineUsed:false,smoothingFallback:false,invalidSegmentIndex:null,invalidSegmentStart:null,invalidSegmentEnd:null,invalidPoint:null,invalidDepth:null,invalidReason:null},contourLayerGroup:L.layerGroup(),catchLayerGroup:L.layerGroup(),hotspotLayerGroup:L.layerGroup(),trackLayerGroup:L.layerGroup(),boatMarker:null,homeMarker:null,forwardLayer:L.layerGroup(),navActive:false,trollingEnabled:true,depthAlarm:true,offRouteAlarm:true,keepAwakeDuringNavigation:true,wakeLock:null,wakeLockStatus:'Ikke aktiv',fullscreenStatus:'Ikke aktiv',orientationMode:'north',mapRotationDeg:0,homePort:null,trollingDirection:1,lastSeaTroutPlan:null,gpsUpdateCount:0,followGpsActive:false,followGpsPausedByUser:false,lastAutoPanText:'-',autoPanGuardUntil:0,longPressTimer:null,longPressStart:null,suppressNextMapClickUntil:0,trackActive:false,trackAutoResume:true,trackAutoPaused:false,trackPoints:[],trackStartedAt:null,trackStoppedAt:null,savedTracks:[]};
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
state.contourLayerGroup.addTo(map);state.hotspotLayerGroup.addTo(map);state.catchLayerGroup.addTo(map);state.trackLayerGroup.addTo(map);state.forwardLayer.addTo(map);
init();
function init(){migrateUserData();bindUI();loadUserSettings();loadSavedRoutes();renderSavedRoutes();loadCatchLogs();renderCatchLogs();loadTrackPrefs();loadSavedTracks();loadTrackDraft();renderTrackLayer();loadHomePort();loadOrientationPreference();updateManifestDependentControls();updateWakeLockStatusUi();updateFullscreenStatus();updateTrollingSpeedAssistant();updateFollowGpsUi();updateTrackUi();updateDepthDebugUi();loadTileManifest().then(()=>updateVisibleMapTiles({initial:true})).then(()=>setStatus('v46.0 klar. DDM tiles loader dynamisk for synligt kortområde og Lynæs Sommerhavørred.')).catch(e=>{console.error(e);setStatus(manifestErrorMessage(e));});updateInfoBox();cleanupOldCaches();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=46.0').then(r=>r.update()).catch(()=>{});setTimeout(()=>{map.invalidateSize(true);applyMapOrientation(true);scheduleVisibleTileUpdate();},300)}
function bindUI(){
 $('collapsePanel').onclick=()=>{const panel=$('panel');panel.classList.add('hidden');panel.classList.remove('nav-panel-visible');};$('showPanel').onclick=toggleNavigationPanel;$('openSettings').onclick=openSettings;$('closeSettings').onclick=closeSettings;$('openTrolling').onclick=openTrolling;$('closeTrolling').onclick=closeTrolling;$('settingsOverlay').onclick=e=>{if(e.target.id==='settingsOverlay')closeSettings()};$('exportUserData').onclick=exportUserData;$('importUserDataBtn').onclick=()=>$('userDataImport').click();$('userDataImport').onchange=importUserData;if($('navHomeMain'))$('navHomeMain').onclick=()=>navigateHome(true);if($('sendSuggestion'))$('sendSuggestion').onclick=sendSuggestion;
 $('modeFree').onclick=()=>setTrollingMode(false);$('modeTrolling').onclick=()=>setTrollingMode(true);$('orientationNorth').onclick=()=>setMapOrientation('north');$('orientationCourse').onclick=()=>setMapOrientation('course');$('pickStart').onclick=()=>beginMapPick('start');$('pickEnd').onclick=()=>beginMapPick('end');if($('navPickStart'))$('navPickStart').onclick=()=>beginMapPick('start');if($('navPickEnd'))$('navPickEnd').onclick=()=>beginMapPick('end');$('useGps').onclick=useGpsAsStart;if($('centerGps'))$('centerGps').onclick=centerOnGps;if($('followGps'))$('followGps').onclick=followGpsNow;$('centerArea').onclick=()=>map.setView([55.955,11.83],12);$('saveHomeGps').onclick=saveHomeFromGps;$('pickHome').onclick=()=>beginMapPick('home');$('navHome').onclick=()=>navigateHome(true);
 if($('loadLocalContours'))$('loadLocalContours').onclick=reloadVisibleTiles;if($('refreshMapTiles'))$('refreshMapTiles').onclick=reloadVisibleTiles;$('makeRoute').onclick=makeTrollingRouteFromMenu;if($('makeRouteMain'))$('makeRouteMain').onclick=makeRoute;if($('findSeaTroutRoute'))$('findSeaTroutRoute').onclick=findSeaTroutRoute;if($('logCatch'))$('logCatch').onclick=logCatchFromGps;$('saveRoute').onclick=saveCurrentRoute;if($('saveRouteMain'))$('saveRouteMain').onclick=saveCurrentRoute;if($('chooseTrollingRoute'))$('chooseTrollingRoute').onclick=toggleSavedTrollingRoutes;if($('confirmRouteSave'))$('confirmRouteSave').onclick=confirmRouteSave;if($('cancelRouteSave'))$('cancelRouteSave').onclick=closeRouteNameDialog;if($('routeNameOverlay'))$('routeNameOverlay').onclick=e=>{if(e.target.id==='routeNameOverlay')closeRouteNameDialog()};if($('routeNameInput'))$('routeNameInput').onkeydown=e=>{if(e.key==='Enter')confirmRouteSave();if(e.key==='Escape')closeRouteNameDialog()};$('clearRoute').onclick=clearRoute;$('reverseRoute').onclick=reverseCurrentRoute;$('fileImport').onchange=importGeoJsonFile;
 $('startNav').onclick=startNavigation;$('stopNav').onclick=()=>stopNavigation();if($('startTrolling'))$('startTrolling').onclick=startTrolling;if($('stopTrolling'))$('stopTrolling').onclick=()=>stopNavigation();if($('startTrack'))$('startTrack').onclick=()=>startTrackLog({manual:true});if($('stopTrack'))$('stopTrack').onclick=stopTrackLog;if($('clearTrack'))$('clearTrack').onclick=clearTrackLog;if($('saveTrack'))$('saveTrack').onclick=saveTrackLog;if($('toggleAutoTrack'))$('toggleAutoTrack').onchange=e=>setTrackAutoResume(e.target.checked);
 $('targetDepth').onchange=()=>{renderContours();updateDepthLabels();};$('depthTolerance').onchange=()=>{renderContours();updateDepthLabels();};if($('freeMinDepth'))$('freeMinDepth').onchange=updateDepthLabels;setTrollingMode(true);
 document.querySelectorAll('input[name=routeSmoothing]').forEach(el=>{el.onchange=e=>setRouteSmoothing(e.target.value)});
 $('toggleSea').onchange=e=>toggleLayers(e.target.checked,[seaMarks]);$('toggleContours').onchange=e=>toggleLayers(e.target.checked,[state.contourLayerGroup]);$('toggleDepthAlarm').onchange=e=>{state.depthAlarm=e.target.checked;saveUserSettings();};$('toggleOffRouteAlarm').onchange=e=>{state.offRouteAlarm=e.target.checked;saveUserSettings();};if($('toggleWakeLock'))$('toggleWakeLock').onchange=e=>{state.keepAwakeDuringNavigation=e.target.checked;saveUserSettings();state.navActive?syncWakeLock():releaseWakeLock();updateWakeLockStatusUi();};if($('enterFullscreen'))$('enterFullscreen').onclick=toggleFullscreen;if($('togglePlotterUi'))$('togglePlotterUi').onclick=toggleNavigationPanel;
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.navActive)syncWakeLock();});
 document.addEventListener('fullscreenchange',updateFullscreenStatus);
 map.on('click',e=>{if(Date.now()<state.suppressNextMapClickUntil)return;const p={lat:e.latlng.lat,lng:e.latlng.lng};if(state.pickMode){const mode=state.pickMode;state.pickMode=null;if(mode==='start')setStart(p);if(mode==='end')setEnd(p);if(mode==='home')saveHomePort(p);return;}if(state.navActive){toggleNavigationPanel();return;}});
 map.on('contextmenu',e=>{e.originalEvent?.preventDefault?.();if(state.pickMode)return;showMapActionMenu({lat:e.latlng.lat,lng:e.latlng.lng})});
 map.on('dragstart zoomstart',()=>{cancelLongPress();handleManualMapMove();});
 map.on('move zoom resize',()=>applyMapOrientation(false));
 map.on('moveend zoomend resize',()=>{applyMapOrientation(false);scheduleVisibleTileUpdate();});
 bindLongPressMenu();
 if(navigator.geolocation){navigator.geolocation.watchPosition(onGps,()=>{$('gpsStatus').textContent='GPS: ingen adgang'},{enableHighAccuracy:true,maximumAge:2000,timeout:10000})}
}
function onGps(pos){
 const nextGps={lat:pos.coords.latitude,lng:pos.coords.longitude,speed:pos.coords.speed,heading:pos.coords.heading,accuracy:pos.coords.accuracy,time:pos.timestamp||Date.now()};
 const inferredCog=inferCogFromGps(state.gps,nextGps);
 state.prevGps=state.gps;
 state.gps=nextGps;
 state.gpsUpdateCount++;
 state.lastSogKn=Number.isFinite(pos.coords.speed)?pos.coords.speed*1.94384:state.lastSogKn;
 updateSmoothedCog(pos.coords.heading,inferredCog);
 if(!state.followGpsActive&&!state.followGpsPausedByUser)enableFollowGps('GPS aktiv');
 $('gpsStatus').textContent='GPS: klar';
 if($('centerGps'))$('centerGps').disabled=false;
 if($('followGps'))$('followGps').disabled=false;
 $('posText').textContent=`Position: ${state.gps.lat.toFixed(5)}, ${state.gps.lng.toFixed(5)}`;
 $('sogText').textContent=`SOG: ${state.lastSogKn?state.lastSogKn.toFixed(1):'—'} kn`;
 $('cogText').textContent=`COG: ${Number.isFinite(state.lastCog)?Math.round(state.lastCog):'—'}°`;
 ensureDepthTileForPoint(state.gps);
 maybeAutoStartTrack();
 updateBoatMarker();
 recordTrackPointFromGps();
  updateInfoBox();
  updateTrollingSpeedAssistant();
 updateFollowGpsUi();
 applyMapOrientation(false);
 drawForwardLine(Number.isFinite(state.lastCog)?state.lastCog:NaN);
 if(state.navActive)updateNavigation();
 else followBoat(true);
}
function updateSmoothedCog(gpsHeading,inferredCog){
 const sog=Number.isFinite(state.lastSogKn)?state.lastSogKn:0;
 let candidate=NaN;
 if(Number.isFinite(inferredCog)&&sog>=0.4)candidate=inferredCog;
 else if(Number.isFinite(gpsHeading)&&sog>=0.8)candidate=gpsHeading;
 if(!Number.isFinite(candidate))return;
 state.lastCog=Number.isFinite(state.lastCog)?smoothAngleDeg(state.lastCog,candidate,sog>=2?0.34:0.22):normalizeDeg(candidate);
}
function normalizeDeg(v){return ((Number(v)%360)+360)%360}
function angleDeltaDeg(from,to){let d=normalizeDeg(to)-normalizeDeg(from);if(d>180)d-=360;if(d<-180)d+=360;return d}
function smoothAngleDeg(from,to,alpha){return normalizeDeg(normalizeDeg(from)+angleDeltaDeg(from,to)*alpha)}
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

function setWakeLockStatus(status){
 state.wakeLockStatus=status;
 updateWakeLockStatusUi();
}
function updateWakeLockStatusUi(){
 if($('wakeLockStatus'))$('wakeLockStatus').textContent=state.wakeLockStatus||'Ikke aktiv';
 if($('toggleWakeLock'))$('toggleWakeLock').checked=state.keepAwakeDuringNavigation!==false;
}
async function syncWakeLock(){
 if(!state.navActive||!state.keepAwakeDuringNavigation)return releaseWakeLock();
 if(!('wakeLock' in navigator)){setWakeLockStatus('Ikke understøttet');return;}
 if(state.wakeLock){setWakeLockStatus('Aktiv');return;}
 try{
  state.wakeLock=await navigator.wakeLock.request('screen');
  state.wakeLock.addEventListener('release',()=>{state.wakeLock=null;if(state.navActive&&state.keepAwakeDuringNavigation)setWakeLockStatus('Ikke aktiv');});
  setWakeLockStatus('Aktiv');
 }catch(e){
  console.warn('Wake Lock failed',e);
  state.wakeLock=null;
  setWakeLockStatus('Fejl');
 }
}
async function releaseWakeLock(){
 const lock=state.wakeLock;
 state.wakeLock=null;
 if(lock){try{await lock.release()}catch{}}
 setWakeLockStatus('Ikke aktiv');
}
function updateFullscreenStatus(){
 const supported=!!document.documentElement.requestFullscreen;
 const active=!!document.fullscreenElement;
 state.fullscreenStatus=supported?(active?'Aktiv':'Ikke aktiv'):'Ikke understøttet';
 if($('fullscreenStatus'))$('fullscreenStatus').textContent=state.fullscreenStatus;
}
async function toggleFullscreen(){
 if(!document.documentElement.requestFullscreen){updateFullscreenStatus();setStatus('Fuld skærm er ikke understøttet i denne browser.');return;}
 try{
  if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
  updateFullscreenStatus();
  setStatus(document.fullscreenElement?'Fuld skærm aktiv.':'Fuld skærm slået fra.');
 }catch(e){
  console.warn('Fullscreen failed',e);
  updateFullscreenStatus();
  setStatus('Fuld skærm kunne ikke aktiveres.');
 }
}
function setNavigationLayout(active){
 document.body.classList.toggle('navigation-active',!!active);
 const panel=$('panel');
 if(active){closeSettings();closeTrolling();panel?.classList.add('hidden');panel?.classList.remove('nav-panel-visible');}
 else panel?.classList.remove('nav-panel-visible');
 setTimeout(()=>map.invalidateSize(false),120);
}
function toggleNavigationPanel(){
 const panel=$('panel');
 if(!panel)return;
 if(state.navActive||document.body.classList.contains('navigation-active')){
  const show=!panel.classList.contains('nav-panel-visible');
  panel.classList.toggle('nav-panel-visible',show);
  panel.classList.toggle('hidden',!show);
 }else{
  panel.classList.toggle('hidden');
  panel.classList.remove('nav-panel-visible');
 }
 setTimeout(()=>map.invalidateSize(false),120);
}
function loadUserSettings(){
 const defaultSmoothing=ROUTE_SMOOTHING_ENABLED?'normal':'off';
 try{const s=JSON.parse(localStorage.getItem(USER_SETTINGS_KEY)||'{}');state.depthAlarm=s.depthAlarm!==false;state.offRouteAlarm=s.offRouteAlarm!==false;state.keepAwakeDuringNavigation=s.keepAwakeDuringNavigation!==false;state.routeSmoothingUserSelected=s.routeSmoothingUserSelected===true;state.routeSmoothing=state.routeSmoothingUserSelected&&ROUTE_SMOOTHING_ENABLED&&ROUTE_SMOOTHING_VALUES.has(s.routeSmoothing)?s.routeSmoothing:defaultSmoothing;}catch{state.depthAlarm=true;state.offRouteAlarm=true;state.keepAwakeDuringNavigation=true;state.routeSmoothingUserSelected=false;state.routeSmoothing=defaultSmoothing}
 if($('toggleDepthAlarm'))$('toggleDepthAlarm').checked=state.depthAlarm;
 if($('toggleOffRouteAlarm'))$('toggleOffRouteAlarm').checked=state.offRouteAlarm;
 if($('toggleWakeLock'))$('toggleWakeLock').checked=state.keepAwakeDuringNavigation;
  updateRouteSmoothingUi();
 updateWakeLockStatusUi();
}
function saveUserSettings(){
 localStorage.setItem(USER_SETTINGS_KEY,JSON.stringify({depthAlarm:state.depthAlarm,offRouteAlarm:state.offRouteAlarm,keepAwakeDuringNavigation:state.keepAwakeDuringNavigation,routeSmoothing:state.routeSmoothing,routeSmoothingUserSelected:state.routeSmoothingUserSelected===true,updated:new Date().toISOString()}));
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
 const payload={version:VERSION,exported:new Date().toISOString(),homePort:state.homePort,routes:state.savedRoutes,catches:state.catchLogs,tracks:state.savedTracks,orientationMode:state.orientationMode,userSettings:{depthAlarm:state.depthAlarm,offRouteAlarm:state.offRouteAlarm,keepAwakeDuringNavigation:state.keepAwakeDuringNavigation,routeSmoothing:state.routeSmoothing,routeSmoothingUserSelected:state.routeSmoothingUserSelected===true}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='waternav-userdata-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 setStatus('Brugerdata eksporteret.');
}
function importUserData(evt){
 const f=evt.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(String(r.result));if(data.homePort){localStorage.setItem(HOME_KEY,JSON.stringify(data.homePort));state.homePort=data.homePort;renderHomePort();updateHomeUi();}
 if(Array.isArray(data.routes)){state.savedRoutes=data.routes;localStorage.setItem(STORAGE_KEY,JSON.stringify(state.savedRoutes));renderSavedRoutes();}
 if(Array.isArray(data.catches)){state.catchLogs=data.catches;localStorage.setItem(CATCH_LOG_KEY,JSON.stringify(state.catchLogs));renderCatchLogs();}
 if(Array.isArray(data.tracks)){state.savedTracks=data.tracks;saveSavedTracks();renderTrackLayer();updateTrackUi();}
 if(data.orientationMode)setMapOrientation(data.orientationMode,true);
 if(data.userSettings){state.depthAlarm=data.userSettings.depthAlarm!==false;state.offRouteAlarm=data.userSettings.offRouteAlarm!==false;state.keepAwakeDuringNavigation=data.userSettings.keepAwakeDuringNavigation!==false;state.routeSmoothingUserSelected=data.userSettings.routeSmoothingUserSelected===true;state.routeSmoothing=state.routeSmoothingUserSelected&&ROUTE_SMOOTHING_ENABLED&&ROUTE_SMOOTHING_VALUES.has(data.userSettings.routeSmoothing)?data.userSettings.routeSmoothing:(ROUTE_SMOOTHING_ENABLED?'normal':'off');saveUserSettings();loadUserSettings();}
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
 const panes=['tilePane','overlayPane','routePane','shadowPane','markerPane','tooltipPane'];
 const rotate=state.orientationMode==='course'&&Number.isFinite(state.lastCog);
 let target=rotate?-state.lastCog:0;
 target=((target%360)+360)%360;
 if(target>180)target-=360;
 if(rotate&&Number.isFinite(state.mapRotationDeg))target=state.mapRotationDeg+angleDeltaDeg(state.mapRotationDeg,target);
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
 const popupPane=map.getPane('popupPane');
 if(popupPane){
  popupPane.classList.remove('course-up-rotating');
  popupPane.style.transformOrigin='';
  popupPane.style.transform='';
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
function setRouteSmoothing(mode,silent=false){
 state.routeSmoothingUserSelected=true;
 state.routeSmoothing=ROUTE_SMOOTHING_ENABLED&&ROUTE_SMOOTHING_VALUES.has(mode)?mode:'off';
 updateRouteSmoothingUi();
 saveUserSettings();
 if(!silent)setStatus(`Ruteudjævning: ${routeSmoothingLabel(state.routeSmoothing)}.`);
}
function updateRouteSmoothingUi(){
 document.querySelectorAll('input[name=routeSmoothing]').forEach(el=>{el.checked=el.value===state.routeSmoothing;el.disabled=!ROUTE_SMOOTHING_ENABLED&&el.value!=='off'});
}
function routeSmoothingLabel(mode){return mode==='off'?'Fra':mode==='high'?'Høj':'Normal'}
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
function useGpsAsStart(){if(!state.gps)return setStatus('GPS er ikke klar endnu.');setStart(state.gps);panMapTo([state.gps.lat,state.gps.lng],'GPS som start')}
function centerOnGps(){if(!state.gps)return setStatus('GPS er ikke klar endnu.');panMapTo([state.gps.lat,state.gps.lng],'Centrér GPS');setStatus('Kortet er centreret på aktuel GPS-position.');applyMapOrientation(true)}
function followGpsNow(){if(!state.gps)return setStatus('GPS er ikke klar endnu.');enableFollowGps('Følg GPS');followBoat(true);setStatus('Følg GPS er aktiv. Kortet følger bådens GPS-position.')}
function enableFollowGps(reason=''){
 state.followGpsActive=true;
 state.followGpsPausedByUser=false;
 updateFollowGpsUi();
 console.info('WaterNav follow GPS active',{reason,gpsUpdates:state.gpsUpdateCount});
}
function pauseFollowGps(reason='Manuel panorering'){
 if(!state.followGpsActive)return;
 state.followGpsActive=false;
 state.followGpsPausedByUser=true;
 updateFollowGpsUi();
 console.info('WaterNav follow GPS paused',{reason,gpsUpdates:state.gpsUpdateCount});
 setStatus('Følg GPS sat på pause efter manuel kortbevægelse. Tryk Følg GPS for at aktivere igen.');
}
function handleManualMapMove(){
 if(Date.now()<state.autoPanGuardUntil)return;
 pauseFollowGps();
}
function panMapTo(latlng,label,opts={}){
 state.autoPanGuardUntil=Date.now()+(opts.guardMs||AUTO_FOLLOW_GUARD_MS);
 const duration=opts.duration??.35;
 const ll=Array.isArray(latlng)?{lat:latlng[0],lng:latlng[1]}:latlng;
 const target=[Number(ll.lat),Number(ll.lng)];
 if(opts.immediate)map.setView(target,map.getZoom(),{animate:false});
 else map.panTo(target,{animate:opts.animate!==false,duration});
 state.lastAutoPanText=`${label}: ${Number(ll.lat).toFixed(5)}, ${Number(ll.lng).toFixed(5)}${opts.immediate?' · setView':''}`;
 updateFollowGpsUi();
}
function followBoat(force=false){
 if(!state.gps||!state.followGpsActive)return;
 const size=map.getSize();
 if(!size?.x||!size?.y)return;
 const boatPoint=map.latLngToContainerPoint(state.gps);
 const desired=followGpsTargetPoint(size);
 if(!force&&boatPoint.distanceTo(desired)<8)return;
 const zoom=map.getZoom();
 const projectedBoat=map.project([state.gps.lat,state.gps.lng],zoom);
 const centerPoint=projectedBoat.subtract(desired.subtract(L.point(size.x/2,size.y/2)));
 const center=map.unproject(centerPoint,zoom);
 panMapTo(center,'auto-follow',{immediate:true,guardMs:900});
}
function followGpsTargetPoint(size){
 const center=L.point(size.x/2,size.y/2);
 const desired=L.point(size.x*.5,size.y*FOLLOW_GPS_Y_RATIO);
 const shouldCounterRotate=state.orientationMode==='course'&&Number.isFinite(state.lastCog)&&Number.isFinite(state.mapRotationDeg)&&Math.abs(state.mapRotationDeg)>0.001;
 if(!shouldCounterRotate)return desired;
 const angle=-state.mapRotationDeg*Math.PI/180;
 const dx=desired.x-center.x,dy=desired.y-center.y;
 return L.point(center.x+dx*Math.cos(angle)-dy*Math.sin(angle),center.y+dx*Math.sin(angle)+dy*Math.cos(angle));
}
function updateFollowGpsUi(){
 if($('followGpsState'))$('followGpsState').textContent=state.followGpsActive?'Aktiv':'Ikke aktiv';
 if($('gpsUpdateCount'))$('gpsUpdateCount').textContent=String(state.gpsUpdateCount||0);
 if($('lastAutoPan'))$('lastAutoPan').textContent=state.lastAutoPanText||'-';
 if($('followGps'))$('followGps').disabled=!state.gps;
}
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
 if(!state.gps)return setStatus('GPS er ikke klar, så Navigér hjem kan ikke beregne fra aktuel position.');
 if(!state.tileManifest||state.manifestStatus!=='ready')return setStatus(`DDM manifest er ikke klar. Forventet sti: ${TILE_MANIFEST_PATH}`);
 setTrollingMode(false,true);
 setStart({lat:state.gps.lat,lng:state.gps.lng});
 setEnd(state.homePort);
 map.closePopup();
 enableFollowGps('Navigér hjem');
 panMapTo([state.gps.lat,state.gps.lng],'Navigér hjem start');
 setStatus('Navigér hjem: beregner vandrute fra aktuel GPS-position til gemt hjemhavn...');
 if(autoRoute)setTimeout(()=>makeRoute(),80);
}
function navigateToDestination(dest,{label='valgt punkt',autoRoute=true,mode='free'}={}){
 if(!dest||!Number.isFinite(Number(dest.lat))||!Number.isFinite(Number(dest.lng)))return setStatus('Destinationen er ugyldig.');
 if(mode==='free')setTrollingMode(false,true);
 const start=getBestStartPoint();
 if(!start)return setStatus('GPS er ikke klar, og kortcentrum kunne ikke bruges som start.');
 setStart(start);
 setEnd(dest);
 map.closePopup();
 panMapTo(dest,`Destination ${label}`);
 setStatus(`${label[0]?.toUpperCase()||'P'}${label.slice(1)} valgt. Beregner DDM-water-only rute...`);
 if(autoRoute)setTimeout(()=>makeRoute(),80);
}
function getBestStartPoint(){
 if(state.gps&&Number.isFinite(state.gps.lat)&&Number.isFinite(state.gps.lng))return{lat:state.gps.lat,lng:state.gps.lng};
 const c=map.getCenter();
 return{lat:c.lat,lng:c.lng};
}
function showMapActionMenu(p){
 const probe=depthProbeAtLatLng(p);
 const depthText=probe.ok?`${probe.depth.toFixed(1)} m`:probe.error;
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
function bindLongPressMenu(){
 const el=map.getContainer();
 const cancel=()=>cancelLongPress();
 el.addEventListener('pointerdown',ev=>{
  if(ev.pointerType!=='touch'||state.pickMode)return;
  state.longPressStart={x:ev.clientX,y:ev.clientY,latlng:map.mouseEventToLatLng(ev)};
  clearTimeout(state.longPressTimer);
  state.longPressTimer=setTimeout(()=>{
   const start=state.longPressStart;
   state.longPressTimer=null;
   state.longPressStart=null;
   if(!start||state.pickMode)return;
   state.suppressNextMapClickUntil=Date.now()+500;
   showMapActionMenu({lat:start.latlng.lat,lng:start.latlng.lng});
  },700);
 },{passive:true});
 el.addEventListener('pointermove',ev=>{
  const start=state.longPressStart;
  if(!start)return;
  if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)>10)cancelLongPress();
 },{passive:true});
 el.addEventListener('pointerup',cancel,{passive:true});
 el.addEventListener('pointercancel',cancel,{passive:true});
 el.addEventListener('pointerleave',cancel,{passive:true});
}
function cancelLongPress(){
 clearTimeout(state.longPressTimer);
 state.longPressTimer=null;
 state.longPressStart=null;
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
function tileForPoint(p){
 if(!state.tileManifest||!p)return null;
 return state.tileManifest.tiles.find(tile=>p.lat>=tile.bounds.latMin&&p.lat<=tile.bounds.latMax&&p.lng>=tile.bounds.lngMin&&p.lng<=tile.bounds.lngMax)||null;
}
function expectedTileIdForPoint(p,grid=state.depthGrid){
 if(!p||!grid?.bounds||!Number.isFinite(Number(grid.step)))return null;
 const cell=latLngToCell(p,grid);
 if(!cell)return null;
 const tileSize=state.tileManifest?.grid?.tileSize||grid.tileSize;
 const id=tileSize?tileIdForCell(cell.r,cell.c,tileSize):null;
 if(id&&state.tileById.has(id))return id;
 if(grid.mode==='tiles'){
  const meta=tileForPoint(p);
  if(meta?.id)return meta.id;
 }
 return id;
}
function ensureDepthTileForPoint(p){
 if(!state.tileManifest||!p)return;
 const id=expectedTileIdForPoint(p);
 const meta=id?state.tileById.get(id):tileForPoint(p);
 if(!meta?.depthFile)return;
 if(state.loadedDepthTiles.has(meta.id)||state.loadingDepthTiles.has(meta.id))return;
 loadDepthTile(meta.id).then(()=>{
  const probe=depthProbeAtLatLng(state.gps||p);
  state.lastDepthProbe=probe;
  updateInfoBox();
  updateDepthDebugUi(probe);
  fillLastTrackPointDepth(probe);
 }).catch(e=>console.warn('GPS DDM depth tile load failed',e));
}

async function loadCollisionGrid(){
 if(state.collisionGrid||state.collisionGridStatus==='loading')return state.collisionGrid;
 state.collisionGridStatus='loading';
 const url=`${FINE_COLLISION_GRID_PATH}?v=${encodeURIComponent(VERSION)}`;
 try{
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw new Error(`${res.status} ${res.statusText||'HTTP fejl'}`);
  const grid=await res.json();
  if(!grid?.bounds||!Array.isArray(grid.data)||!Number.isFinite(Number(grid.step)))throw new Error('forkert format');
  state.collisionGrid={...grid,sourceLabel:'DDM fine collision grid'};
  state.collisionGridStatus='ready';
  state.collisionGridError=null;
  return state.collisionGrid;
 }catch(e){
  state.collisionGridStatus='error';
  state.collisionGridError=`DDM collision-grid kunne ikke indlæses (${FINE_COLLISION_GRID_PATH}): ${e?.message||e}`;
  console.warn(state.collisionGridError);
  return null;
 }
}

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
 if(!await loadCollisionGrid()){state.lastTileLoadError=state.collisionGridError||'Manglende DDM collision-grid.';return false;}
 state.lastTileLoadError=null;
 state.routingTileIds=new Set();
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

function updateDepthDebugUi(probe=state.lastDepthProbe){
 const p=probe?.gps||state.gps||null;
 if($('ddmCurrentTile'))$('ddmCurrentTile').textContent=probe?.tileId||expectedTileIdForPoint(p)||'-';
 if($('ddmGpsPosition'))$('ddmGpsPosition').textContent=p?formatLatLng(p):'-';
 if($('ddmCurrentDepth'))$('ddmCurrentDepth').textContent=probe?.ok&&Number.isFinite(probe.depth)?`${probe.depth.toFixed(2)} m`:(probe?.error||'Venter på GPS/DDM');
 if($('ddmInterpolated'))$('ddmInterpolated').textContent=probe?.ok?(probe.interpolated?'Ja':'Nej'):'-';
 if($('ddmDepthCell'))$('ddmDepthCell').textContent=probe?.cell?`r${probe.cell.r} c${probe.cell.c}`:'-';
 if($('ddmDepthSource'))$('ddmDepthSource').textContent=probe?.source||'-';
 if($('ddmRouteMinDepth'))$('ddmRouteMinDepth').textContent=Number.isFinite(Number(state.currentRoute?.stats?.minDepth))?`${Number(state.currentRoute.stats.minDepth).toFixed(2)} m`:'-';
 if($('ddmDepthError'))$('ddmDepthError').textContent=probe?.error||'Ingen';
}

function fillLastTrackPointDepth(probe=state.lastDepthProbe){
 if(!state.trackActive||!probe?.ok||!state.trackPoints.length)return;
 const last=state.trackPoints.at(-1);
 if(!last||Number.isFinite(Number(last.depth)))return;
 if(state.gps&&last.time===state.gps.time){
  last.depth=Number(probe.depth.toFixed(2));
  persistTrackDraft();
  updateTrackUi();
 }
}

function importGeoJsonFile(evt){const f=evt.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const geo=JSON.parse(String(r.result));const contours=parseContours(geo);if(!contours.length)return setStatus('GeoJSON indeholder ingen læsbare dybdekurver.');setContours(contours,`importeret: ${f.name}`);setStatus(`Importeret ${contours.length} dybdekurver fra ${f.name}.`)}catch(e){setStatus('Kunne ikke læse GeoJSON.')}};r.readAsText(f)}
function pointInsideGrid(p,grid){
 if(!p||!grid||!grid.bounds)return false;const b=grid.bounds;
 return p.lat>=b.latMin&&p.lat<=b.latMax&&p.lng>=b.lngMin&&p.lng<=b.lngMax;
}
function bestDepthGridForPoint(){return state.depthGrid||(state.tileManifest?buildVirtualTileGrid(state.tileManifest):null)}

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
function makeRoute(){if(!requireTileManifest('Lav rute'))return;clearComputedRouteOnly();setStatus('Henter DDM tiles og beregner vandrute...');setRouteBusy(true);setRoutingDebug('Beregner rute',null,0,0,{routingMode:state.trollingEnabled?'trolling':'free',routingSource:'DDM grid',fallbackUsed:false,routeComplete:false,originalPointCount:0,smoothedPointCount:0,smoothingReductionPct:0,smoothingMode:'off',smoothingSplineUsed:false,smoothingFallback:false,...clearInvalidSegmentStats()});setTimeout(async()=>{try{state.trollingEnabled?await makeTrollingRoute():await makeFreeRoute()}catch(e){console.error(e);handleRoutingFailure('Ruteberegning fejlede: '+(e?.message||e))}finally{setRouteBusy(false);updateRouteActionButtons()}},30)}
function setRouteBusy(busy){for(const id of ['makeRoute','makeRouteMain','findSeaTroutRoute']){const el=$(id);if(el)el.disabled=!!busy||!state.tileManifest||state.manifestStatus!=='ready'}}

async function findSeaTroutRoute(){
 if(!requireTileManifest('Find Lynæs Sommerhavørred-rute'))return;
 clearComputedRouteOnly();
 setTrollingMode(true,true);
 setRouteBusy(true);
 setDisabled('findSeaTroutRoute',true);
 setSeaTroutPlanUi(null,[`Beregner Lynæs Sommerhavørred-rute fra DDM-data...`]);
 setRoutingDebug('Beregner havørredrute',null,0,0,{routingMode:'sea-trout',routingSource:'DDM grid',fallbackUsed:false,routeComplete:false,...clearInvalidSegmentStats()});
 try{
  const profile=seaTroutProfileFromUi();
  const result=await tryBuildLynaesSeaTroutRoute(profile);
  if(result.ok){applySeaTroutRoute(result);return;}
  const message=result.message||SEA_TROUT_MISSING_DATA_MESSAGE;
  setSeaTroutPlanUi(null,[message]);
  handleRoutingFailure(message,{routingMode:'sea-trout',routingSource:'DDM grid',gridResolutionM:gridResolutionMeters(),routingTileCount:state.routingTileIds.size,fallbackUsed:false});
 }catch(e){
  console.error(e);
  const message=e?.message||SEA_TROUT_MISSING_DATA_MESSAGE;
  setSeaTroutPlanUi(null,[message]);
  handleRoutingFailure(message,{routingMode:'sea-trout',routingSource:'DDM grid',fallbackUsed:false});
 }finally{
  setRouteBusy(false);
  setDisabled('findSeaTroutRoute',false);
  updateRouteActionButtons();
 }
}

function seaTroutProfileFromUi(){
 const method=$('seaTroutMethod')?.value||'planer';
 const base=LYNAES_SEA_TROUT_PROFILE;
 const depthRange=[...base.depthRange];
 const speed='2,4 knob';
 let lureDepth='0,5-2 m under overfladen';
 if(method==='diver')lureDepth='2-5 m nede på én stang, kun når fisken skal findes dybere';
 const setup=seaTroutSetupText(method);
 return{...base,method,depthRange,targetDepth:base.targetDepth,boatMinDepth:base.boatMinDepth,tolerance:base.tolerance,speed,lureDepth,setup,notes:[`Target distance ca. ${base.targetNm.toFixed(1)} NM · forventet tid ca. ${String(base.expectedHours).replace('.',',')} timer ved ${String(base.speedKn).replace('.',',')} knob.`]};
}
function seaTroutSetupText(method){
 if(method==='planer')return'Paravaner: gennemløbere 18-22 g, 25-45 m line bag paravanen';
 if(method==='flatline')return'Fladline: gennemløber 18-22 g, 40-60 m bag båden';
 if(method==='diver')return'Diver: én stang 2-5 m nede, kun hvis der skal fiskes dybere';
 return'Blandet: paravaner 25-45 m, fladline 40-60 m og eventuelt én diver 2-5 m nede';
}
async function tryBuildLynaesSeaTroutRoute(profile){
 const ids=await ensureSeaTroutProfileTiles(profile);
 if(!ids?.size)return{ok:false,message:SEA_TROUT_MISSING_DATA_MESSAGE};
 state.routingTileIds=ids;
 state.depthGrid=buildVirtualTileGrid(state.tileManifest);
 state.depthGridSource=`${ids.size} DDM tile${ids.size===1?'':'s'} · Lynæs Sommerhavørred`;
 const opts={mode:'seaTrout',targetDepth:profile.targetDepth,tolerance:profile.tolerance,minDepth:profile.boatMinDepth,depthRange:profile.depthRange};
 const start=nearestProfileWaterPoint(profile.harbor,opts);
 if(!start)return{ok:false,message:SEA_TROUT_MISSING_DATA_MESSAGE};
 const areaCandidates=new Map();
 for(const area of profile.focusAreas){
  const candidates=selectSeaTroutAreaCandidates(area,profile,start,6);
  if(candidates.length)areaCandidates.set(area.id,{area,candidates});
 }
 const chains=buildLynaesSeaTroutChains(profile,start,areaCandidates);
 if(!chains.length)return{ok:false,message:SEA_TROUT_MISSING_DATA_MESSAGE};
 let best=null,lastMessage=SEA_TROUT_MISSING_DATA_MESSAGE;
 for(const chain of chains.slice(0,140)){
  let route=buildChainedSeaTroutRoute(chain.points,profile,{start,focusAreas:chain.areas});
  if(!route.ok){lastMessage=route.message||lastMessage;continue;}
  let length=pathNm(route.points);
  if(length>7.7){lastMessage=`Gyldig rute blev for lang (${length.toFixed(2)} NM). Søger kortere Lynæs-loop.`;continue;}
  if(length<4.6){lastMessage=`Gyldig rute blev for kort (${length.toFixed(2)} NM). Søger længere Lynæs-loop.`;continue;}
  const timeBreakdown=seaTroutTimeBreakdown(route.points);
  const lengthPenalty=Math.abs(length-profile.targetNm)*0.45;
  const timeHours=timeBreakdown.totalHours;
  const timePenalty=Math.abs(timeHours-profile.expectedHours)*2.2;
  const fishingPenalty=Math.max(0,4.7-timeBreakdown.fishingNm)*1.6;
  const transportPenalty=Math.max(0,timeBreakdown.transportNm-2.8)*0.8;
  const areaIds=new Set(chain.areas.map(a=>a.id));
  const coveragePenalty=Math.max(0,3-areaIds.size)*0.55;
  const missingSlopePenalty=areaIds.has('hundested-slope')?0:1.2;
  const trimPenalty=route.trimmedOutAndBack?2.5:0;
  const score=lengthPenalty+timePenalty+fishingPenalty+transportPenalty+coveragePenalty+missingSlopePenalty+trimPenalty-(chain.edgeScore||0)*0.04;
  const candidate={...route,profile,start,anchors:chain.points,focusAreas:chain.areas,score,length,timeHours};
  if(!best||candidate.score<best.score)best=candidate;
 }
 if(!best)return{ok:false,message:lastMessage};
 return{ok:true,...best};
}
async function ensureSeaTroutProfileTiles(profile){
 if(!state.tileManifest)await loadTileManifest();
 if(!await loadCollisionGrid())return null;
 const tiles=tilesForBounds(expandBounds(profile.searchBounds,0.035));
 if(!tiles.length)return null;
 const ids=new Set(tiles.map(tile=>tile.id));
 const tracker=hasPendingTileLoads(ids,{depth:true,contours:true})?beginTileProgress():null;
 await waitForProgressPaint(tracker);
 try{
  await Promise.all([ensureDepthTiles(ids,tracker),ensureContourTiles(ids,tracker)]);
 }catch(e){
  console.error(e);
  if(tracker)finishTileProgress(tracker);
  state.lastTileLoadError=tileFailureMessage();
  return null;
 }
 if(tracker)finishTileProgress(tracker);
 state.visibleTileIds=new Set([...state.visibleTileIds,...ids]);
 renderContours();
 updateMapRegionsUi();
 return ids;
}
function nearestProfileWaterPoint(p,opts){
 const base=latLngToCell(p);if(!base)return null;
 let best=null;
 for(let radius=0;radius<=42;radius++){
  for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
   if(Math.max(Math.abs(dr),Math.abs(dc))!==radius)continue;
   const r=base.r+dr,c=base.c+dc;
   if(!cellNavigable(r,c,opts))continue;
   const geo=cellToLatLng({r,c});
   const probe=probeRoutePointWater(geo,opts);
   if(!probe.ok)continue;
   const d=depthAtCell(r,c);
   const score=directNm(p,geo)+Math.abs(d-opts.targetDepth)*0.18;
   if(!best||score<best.score)best={...geo,r,c,depth:d,score,areaId:'lynaes-harbour',areaName:'Lynæs Havn'};
  }
  if(best&&radius>10)return best;
 }
 return best;
}
function selectSeaTroutAreaCandidates(area,profile,start,maxCount=6){
 const cells=cellsForBounds(area.bounds);
 if(!cells)return[];
 const axis=normaliseAxis(area.axis||{lat:1,lng:0});
 const perp={lat:-axis.lng,lng:axis.lat};
 const center={lat:(area.bounds.latMin+area.bounds.latMax)/2,lng:(area.bounds.lngMin+area.bounds.lngMax)/2};
 const candidates=[];
 for(let r=cells.rMin;r<=cells.rMax;r++)for(let c=cells.cMin;c<=cells.cMax;c++){
  const p=cellToLatLng({r,c});
  if(!pointInBounds(p,area.bounds))continue;
  const d=depthAtCell(r,c);
  if(!Number.isFinite(d)||d<profile.boatMinDepth)continue;
  const probe=probeRoutePointWater(p,{mode:'seaTrout',targetDepth:profile.targetDepth,tolerance:profile.tolerance,minDepth:profile.boatMinDepth,depthRange:profile.depthRange});
  if(!probe.ok)continue;
  const gradient=depthGradientAtCell(r,c);
  const rangePenalty=depthRangePenalty(d,profile.depthRange);
  if(d<profile.depthRange[0]-0.3||d>profile.depthRange[1]+1.8)continue;
  if(gradient<0.25)continue;
  const rel={lat:p.lat-center.lat,lng:p.lng-center.lng};
  const projection=rel.lat*axis.lat+rel.lng*axis.lng;
  const cross=rel.lat*perp.lat+rel.lng*perp.lng;
  const edgeBonus=Math.min(4,gradient);
  const distStart=directNm(start,p);
  if(distStart<0.18)continue;
  if(distStart>1.65)continue;
  const score=area.priority*1.6+edgeBonus*1.8-rangePenalty*1.35-Math.abs(distStart-0.85)*0.72;
  candidates.push({...p,r,c,depth:d,gradient,projection,cross,score,areaId:area.id,areaName:area.name});
 }
 if(!candidates.length)return[];
 candidates.sort((a,b)=>seaTroutAnchorScore(b,profile.targetDepth,Math.sign(b.cross||1))-seaTroutAnchorScore(a,profile.targetDepth,Math.sign(a.cross||1)));
 const out=[];
 for(const c of candidates){
  if(out.every(p=>directNm(p,c)>0.16)){
   out.push(c);
   if(out.length>=maxCount)break;
  }
 }
 return out;
}
function seaTroutAnchorScore(c,desiredDepth,desiredSide){
 return c.score-Math.abs(c.depth-desiredDepth)*0.8+(Math.sign(c.cross||0)===desiredSide?0.45:0);
}
function buildLynaesSeaTroutChains(profile,start,areaCandidates){
 const byId=id=>areaCandidates.get(id)?.candidates||[];
 const areaById=id=>profile.focusAreas.find(a=>a.id===id);
 const combos=[
  ['hundested-slope'],
  ['hundested-light'],
  ['isefjord-mouth'],
  ['skansehage'],
  ['hundested-slope','hundested-slope'],
  ['hundested-light','hundested-slope'],
  ['hundested-slope','isefjord-mouth'],
  ['hundested-light','isefjord-mouth'],
  ['skansehage','isefjord-mouth'],
  ['hundested-slope','skansehage','isefjord-mouth'],
  ['hundested-light','skansehage','isefjord-mouth'],
  ['hundested-slope','hundested-light','skansehage'],
  ['hundested-slope','isefjord-mouth','skansehage'],
  ['hundested-light','isefjord-mouth','skansehage'],
  ['skansehage','hundested-slope','isefjord-mouth'],
  ['hundested-slope','skansehage'],
  ['hundested-light','skansehage'],
  ['isefjord-mouth','skansehage'],
  ['hundested-slope','isefjord-mouth']
 ];
 const chains=[];
 for(const combo of combos){
  const groups=combo.map(id=>byId(id).slice(0,4));
  if(groups.some(g=>!g.length))continue;
  const chosen=[];
  const walk=(idx)=>{
   if(idx===groups.length){
    const points=[start,...chosen,start];
    const approx=chainDirectNm(points);
    if(approx<1.2||approx>7.9)return;
    const areas=chosen.map(p=>areaById(p.areaId)).filter(Boolean);
    const edgeScore=chosen.reduce((sum,p)=>sum+(p.gradient||0),0);
    chains.push({points,areas,approx,edgeScore,score:Math.abs(approx-profile.targetNm)-new Set(chosen.map(p=>p.areaId)).size*0.25-edgeScore*0.03});
    return;
   }
   for(const p of groups[idx]){
    if(chosen.every(prev=>directNm(prev,p)>0.18)){
     chosen.push(p);walk(idx+1);chosen.pop();
    }
   }
  };
  walk(0);
 }
 return chains.sort((a,b)=>a.score-b.score);
}
function chainDirectNm(points){let n=0;for(let i=1;i<points.length;i++)n+=directNm(points[i-1],points[i]);return n}
function buildChainedSeaTroutRoute(anchors,profile,meta={}){
 let points=[],visitedCells=0,routingTileCount=state.routingTileIds.size,legStats=[];
 const baseOpts={mode:'seaTrout',targetDepth:profile.targetDepth,tolerance:profile.tolerance,minDepth:profile.boatMinDepth,depthRange:profile.depthRange};
 for(let i=1;i<anchors.length;i++){
  const a=anchors[i-1],b=anchors[i];
  const legTarget=(a.depth+b.depth)/2;
  const result=buildWaterRoute(a,b,{...baseOpts,targetDepth:legTarget});
  if(!result.ok)return{ok:false,message:result.message||SEA_TROUT_MISSING_DATA_MESSAGE,stats:result.stats||{}};
  const legPoints=i===1?result.points:result.points.slice(1);
  points.push(...legPoints);
  visitedCells+=result.stats?.visitedCells||0;
  legStats.push(result.stats);
 }
 points=dedupeRoutePoints(points);
 const validation=validateWaterPathDetailed(points,baseOpts);
 if(!validation.ok)return{ok:false,message:'Advarsel: ruten krydser land eller meget lavt vand.',stats:validation.stats};
 const depths=samplePathDepths(points,baseOpts);
 if(!depths.length)return{ok:false,message:SEA_TROUT_MISSING_DATA_MESSAGE};
 const minDepth=Math.min(...depths),maxDepth=Math.max(...depths),avgDepth=depths.reduce((a,b)=>a+b,0)/depths.length;
 if(minDepth<profile.boatMinDepth)return{ok:false,message:'Advarsel: ruten går over vand under 2 m.',stats:{...validation.stats,minDepth,maxDepth,avgDepth}};
 const stats={routingSource:'DDM grid',routingMode:'sea-trout',fallbackUsed:false,routeComplete:true,reachedDestination:true,gridResolutionM:gridResolutionMeters(),routingTileCount,visitedCells,startNode:legStats[0]?.startNode||null,destinationNode:legStats.at(-1)?.destinationNode||null,lastDistanceNm:0,lastPoint:points.at(-1)||null,originalPointCount:points.length,smoothedPointCount:points.length,smoothingReductionPct:0,smoothingMode:'off',minDepth,maxDepth,avgDepth};
 return{ok:true,points,avgDepth,stats,warnings:seaTroutWarnings(minDepth,profile,meta.focusAreas||[])};
}
function trimSeaTroutOutAndBack(route,profile,focusAreas=[]){
 const half=profile.targetNm/2;
 const outbound=routePrefixAtDistance(route.points,half);
 if(outbound.length<3)return{ok:false};
 const points=dedupeRoutePoints([...outbound,...outbound.slice(0,-1).reverse()]);
 const opts={mode:'seaTrout',targetDepth:profile.targetDepth,tolerance:profile.tolerance,minDepth:profile.boatMinDepth,depthRange:profile.depthRange};
 const validation=validateWaterPathDetailed(points,opts);
 if(!validation.ok)return{ok:false};
 const depths=samplePathDepths(points,opts);
 if(!depths.length)return{ok:false};
 const minDepth=Math.min(...depths),maxDepth=Math.max(...depths),avgDepth=depths.reduce((a,b)=>a+b,0)/depths.length;
 if(minDepth<profile.boatMinDepth)return{ok:false};
 const stats={...route.stats,...validation.stats,minDepth,maxDepth,avgDepth,routeComplete:true,reachedDestination:true,lastPoint:points.at(-1),lastDistanceNm:0,originalPointCount:points.length,smoothedPointCount:points.length,smoothingReductionPct:0,smoothingMode:'off',trimmedOutAndBack:true};
 return{...route,ok:true,points,avgDepth,stats,warnings:[...seaTroutWarnings(minDepth,profile,focusAreas),'Vender hjem på samme DDM-validerede spor for at holde turen omkring 2,5 timer.'],trimmedOutAndBack:true};
}
function routePrefixAtDistance(points,targetNm){
 if(!Array.isArray(points)||points.length<2)return points||[];
 const out=[points[0]];
 let acc=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],seg=directNm(a,b);
  if(acc+seg>=targetNm){
   const t=seg?Math.max(0,Math.min(1,(targetNm-acc)/seg)):0;
   out.push({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
   return out;
  }
  out.push(b);acc+=seg;
 }
 return out;
}
function applySeaTroutRoute(result){
 const {points,profile,anchors,stats,avgDepth,warnings,focusAreas,length,timeHours}=result;
 const actualFocusAreas=routeFocusAreas(points,profile);
 const displayWarnings=seaTroutWarnings(stats.minDepth,profile,actualFocusAreas);
 const focusNames=[...new Set(actualFocusAreas.map(a=>a.name))];
 state.lastSeaTroutPlan={zone:profile.name,profile,warnings:displayWarnings};
 state.start=points[0];state.end=points.at(-1);
 setStart(points[0]);setEnd(points.at(-1));
 state.currentRoute={id:'r_'+Date.now(),name:profile.name,mode:'sea-trout',depth:profile.targetDepth,minDepth:profile.boatMinDepth,actualDepth:avgDepth,points,created:new Date().toISOString(),lengthNm:pathNm(points),source:'Danmarks Dybdemodel 2024 ddm_50m.dybde · Lynæs Sommerhavørred DDM water-only A* routing',stats,seaTrout:{zone:profile.name,profileId:profile.id,startLabel:profile.startLabel,targetDistanceNm:profile.targetNm,expectedHours:profile.expectedHours,standardSpeedKn:profile.speedKn,method:profile.method,depthRange:profile.depthRange,speed:profile.speed,lureDepth:profile.lureDepth,setup:profile.setup,focusAreas:focusNames,warnings:displayWarnings}};
 drawRoute(points,profile.targetDepth,`${profile.name} · ${profile.depthRange[0]}-${profile.depthRange[1]} m`,{turnPoints:anchors,direction:true});
 logRoutingSuccess(state.currentRoute,'sea-trout');
 updateRouteActionButtons();$('routeLength').textContent=`${state.currentRoute.lengthNm.toFixed(2)} NM`;
 const timeBreakdown=seaTroutTimeBreakdown(state.currentRoute.points);
 const timeWarnings=seaTroutTimeWarnings(state.currentRoute.points);
 setSeaTroutPlanUi(state.currentRoute.seaTrout,[...displayWarnings,...timeWarnings]);
 setStatus(`${profile.name} beregnet. ${state.currentRoute.lengthNm.toFixed(2)} NM · ca. ${formatDurationHours(timeBreakdown.totalHours)} samlet · min DDM ${stats.minDepth.toFixed(1)} m.`);
}
function routeFocusAreas(points,profile){
 return (profile.focusAreas||[]).filter(area=>points.some(p=>pointInBounds(p,area.bounds)));
}
function seaTroutTimeWarnings(points){
 const fmt=n=>String(n.toFixed(1)).replace('.',',');
 const breakdown=seaTroutTimeBreakdown(points);
 return[
  `Distance: ${fmt(breakdown.totalNm)} NM`,
  `Transporttid ved 5,0 knob: ${formatDurationHours(breakdown.transportHours)} (${fmt(breakdown.transportNm)} NM)`,
  `Fisketid ved 2,4 knob: ${formatDurationHours(breakdown.fishingHours)} (${fmt(breakdown.fishingNm)} NM)`,
  `Samlet estimeret tid: ${formatDurationHours(breakdown.totalHours)}`
 ];
}
function seaTroutTimeBreakdown(points){
 const totalNm=pathNm(points);
 const fishingNm=seaTroutSegmentNm(points,p=>p.lat>=55.925&&p.lat<=55.965&&p.lng<=11.845);
 const transportNm=Math.max(0,totalNm-fishingNm);
 const transportHours=transportNm/5.0;
 const fishingHours=fishingNm/2.4;
 return{totalNm,transportNm,fishingNm,transportHours,fishingHours,totalHours:transportHours+fishingHours};
}
function seaTroutSegmentNm(points,predicate){
 let nm=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],seg=directNm(a,b);
  const steps=Math.max(2,Math.ceil(seg*1852/25));
  let inside=0;
  for(let k=0;k<steps;k++){
   const t=(k+.5)/steps;
   const p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
   if(predicate(p))inside++;
  }
  nm+=seg*(inside/steps);
 }
 return nm;
}
function formatDurationHours(hours){
 const minutes=Math.max(0,Math.round(hours*60));
 const h=Math.floor(minutes/60),m=minutes%60;
 return h?`${h} t ${String(m).padStart(2,'0')} min`:`${m} min`;
}
function setSeaTroutPlanUi(plan,warnings=[]){
 if($('seaTroutZone'))$('seaTroutZone').textContent=plan?.zone||'Ikke beregnet';
 if($('seaTroutSpeed'))$('seaTroutSpeed').textContent=plan?.speed||'—';
 if($('seaTroutWaterDepth'))$('seaTroutWaterDepth').textContent=plan?.depthRange?`${plan.depthRange[0]}-${plan.depthRange[1]} m`:'—';
 if($('seaTroutLureDepth'))$('seaTroutLureDepth').textContent=plan?.lureDepth||'—';
 if($('seaTroutSetup'))$('seaTroutSetup').textContent=plan?.setup||'—';
 if($('seaTroutWarning'))$('seaTroutWarning').textContent=warnings.length?warnings.join(' · '):(plan?'Ingen advarsler: ruten er DDM-valideret over sikker båddybde.':'Ingen havørred-rute beregnet endnu.');
}
function seaTroutWarnings(minDepth,profile,focusAreas=[]){
 const profileAreaText='Profilprioritet: Hundested-skrænten, Hundested Fyr, Skansehage og Isefjord-mundingen.';
 const chosenAreaText=focusAreas.length?`Valgt DDM-spor: ${[...new Set(focusAreas.map(a=>a.name))].join(', ')}.`:'Valgt DDM-spor: ingen fokuspunkter markeret endnu.';
 const warnings=[profileAreaText,chosenAreaText,`Minimum DDM-dybde på ruten: ${minDepth.toFixed(1)} m`];
 const length=state.currentRoute?.lengthNm;
 if(Number.isFinite(length))warnings.push(`Mål: ca. ${profile.targetNm.toFixed(1)} NM ved ${String(profile.speedKn).replace('.',',')} knob.`);
 if(minDepth<2.05)warnings.push('Advarsel: ruten ligger tæt på 2 m minimum. Sejl med ekstra margin.');
 if(profile.notes?.length)warnings.push(...profile.notes);
 return warnings;
}
function cellsForBounds(bounds){
 const a=latLngToCell({lat:bounds.latMin,lng:bounds.lngMin}),b=latLngToCell({lat:bounds.latMax,lng:bounds.lngMax});
 if(!a||!b)return null;
 return{rMin:Math.max(0,Math.min(a.r,b.r)),rMax:Math.min(state.depthGrid.rows-1,Math.max(a.r,b.r)),cMin:Math.max(0,Math.min(a.c,b.c)),cMax:Math.min(state.depthGrid.cols-1,Math.max(a.c,b.c))};
}
function expandBounds(bounds,pad){return{latMin:bounds.latMin-pad,latMax:bounds.latMax+pad,lngMin:bounds.lngMin-pad,lngMax:bounds.lngMax+pad}}
function pointInBounds(p,b){return p&&b&&p.lat>=b.latMin&&p.lat<=b.latMax&&p.lng>=b.lngMin&&p.lng<=b.lngMax}
function normaliseAxis(axis){const n=Math.hypot(axis.lat||0,axis.lng||0)||1;return{lat:(axis.lat||0)/n,lng:(axis.lng||0)/n}}
function depthRangePenalty(depth,range){return depth<range[0]?range[0]-depth:depth>range[1]?depth-range[1]:0}

async function makeTrollingRoute(){
 if(!state.start||!state.end)return handleRoutingFailure('Vælg start og slut først.');
 if(!requireTileManifest('Lav trollingrute'))return;
 if(!await prepareRoutingGrid(state.start,state.end))return handleRoutingFailure(state.lastTileLoadError||'Manglende DDM tile eller start/slut uden for installeret DDM-område.',{routingMode:'trolling',routingSource:'DDM grid',gridResolutionM:gridResolutionMeters(),routingTileCount:state.routingTileIds.size,fallbackUsed:false});
 const target=selectedDepth();
 const tolerance=selectedTolerance();
 const result=buildWaterRoute(state.start,state.end,{mode:'trolling',targetDepth:target,tolerance,minDepth:0.4});
 if(!result.ok)return handleRoutingFailure(result.message,result.stats||{});
 state.currentRoute={id:'r_'+Date.now(),name:'',mode:'trolling',depth:target,actualDepth:result.avgDepth,points:result.points,created:new Date().toISOString(),lengthNm:pathNm(result.points),source:'Danmarks Dybdemodel 2024 ddm_50m.dybde · water-only A* routing',stats:result.stats};
 drawRoute(result.points,target,`TrollingMode · DDM vandrute omkring ${target.toFixed(1)} m`);
 logRoutingSuccess(state.currentRoute,'trolling');
 updateRouteActionButtons();$('routeLength').textContent=`${state.currentRoute.lengthNm.toFixed(2)} NM`;
 setStatus(`DDM-vandrute fundet. ${smoothingStatusText(result.stats)} Gennemsnitsdybde ${result.avgDepth.toFixed(1)} m, min ${result.stats.minDepth.toFixed(1)} m. Ingen landceller i ruten. Grid: ${routingGridLabel()}.`)
}
async function makeFreeRoute(){
 if(!state.start||!state.end)return handleRoutingFailure('Vælg start og slut først.');
 if(!requireTileManifest('Lav fri rute'))return;
 if(!await prepareRoutingGrid(state.start,state.end))return handleRoutingFailure(state.lastTileLoadError||'Manglende DDM tile eller start/slut uden for installeret DDM-område.',{routingMode:'free',routingSource:'DDM grid',gridResolutionM:gridResolutionMeters(),routingTileCount:state.routingTileIds.size,fallbackUsed:false});
 const target=selectedFreeMinDepth();
 const tolerance=selectedTolerance();
 const minDepth=freeMinDepth();
 const result=buildWaterRoute(state.start,state.end,{mode:'free',targetDepth:target,tolerance,minDepth});
 if(!result.ok)return handleRoutingFailure(result.message,result.stats||{});
 state.currentRoute={id:'r_'+Date.now(),name:'',mode:'free',depth:target,minDepth,actualDepth:result.avgDepth,points:result.points,created:new Date().toISOString(),lengthNm:pathNm(result.points),source:'Danmarks Dybdemodel 2024 ddm_50m.dybde · depth-aware water-only A* routing',stats:result.stats};
 drawRoute(result.points,target,`Fri navigation · DDM vandrute ≥${minDepth.toFixed(1)} m / mål ${target.toFixed(1)} m`);
 logRoutingSuccess(state.currentRoute,'free');
 updateRouteActionButtons();$('routeLength').textContent=`${state.currentRoute.lengthNm.toFixed(2)} NM`;
 setStatus(`Fri DDM-vandrute fundet. ${smoothingStatusText(result.stats)} Valgt minimumsdybde ${minDepth.toFixed(1)} m. Verificeret minimum på ruten ${result.stats.minDepth.toFixed(1)} m. Ruten krydser ikke land/for lavt vand. Grid: ${routingGridLabel()}.`)
}

function routingGridLabel(){return state.depthGridSource||'DDM tiles'}
function smoothingStatusText(stats){return `Ruteudjævning ${routeSmoothingLabel(stats?.smoothingMode||state.routeSmoothing)}: ${stats?.originalPointCount||0} → ${stats?.smoothedPointCount||0} punkter (${Math.round(stats?.smoothingReductionPct||0)}%).`}

function setRoutingDebug(status,error=null,pointCount=null,distanceNm=null,extra={}){
 state.routeDebug.lastStatus=status;
 state.routeDebug.lastError=error;
 if(pointCount!==null)state.routeDebug.pointCount=Number(pointCount)||0;
 if(distanceNm!==null)state.routeDebug.distanceNm=Number(distanceNm)||0;
 Object.assign(state.routeDebug,extra);
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
 if($('routeDebugOriginalPoints'))$('routeDebugOriginalPoints').textContent=String(state.routeDebug.originalPointCount||count);
 if($('routeDebugSmoothedPoints'))$('routeDebugSmoothedPoints').textContent=String(state.routeDebug.smoothedPointCount||count);
 if($('routeDebugReduction'))$('routeDebugReduction').textContent=`${Math.round(state.routeDebug.smoothingReductionPct||0)}%`;
 if($('routeDebugDistance'))$('routeDebugDistance').textContent=distance?`${distance.toFixed(2)} NM`:'0.00 NM';
 if($('routeDebugMode'))$('routeDebugMode').textContent=state.routeDebug.routingMode||state.currentRoute?.mode||'-';
 if($('routeDebugSource'))$('routeDebugSource').textContent=state.routeDebug.routingSource||'-';
 if($('routeDebugResolution'))$('routeDebugResolution').textContent=state.routeDebug.gridResolutionM?`${Math.round(state.routeDebug.gridResolutionM)} m`:'-';
 if($('routeDebugVisited'))$('routeDebugVisited').textContent=String(state.routeDebug.visitedCells||0);
 if($('routeDebugTiles'))$('routeDebugTiles').textContent=String(state.routeDebug.routingTileCount||0);
 if($('routeDebugComplete'))$('routeDebugComplete').textContent=state.routeDebug.routeComplete?'Ja':'Nej';
 if($('routeDebugFallback'))$('routeDebugFallback').textContent=state.routeDebug.fallbackUsed?'Ja':'Nej';
 if($('routeDebugLayer'))$('routeDebugLayer').textContent=state.routeDebug.layerVisible?'Ja':'Nej';
 if($('routeDebugInvalidSegment'))$('routeDebugInvalidSegment').textContent=state.routeDebug.invalidSegmentIndex===null||state.routeDebug.invalidSegmentIndex===undefined?'-':String(state.routeDebug.invalidSegmentIndex);
 if($('routeDebugInvalidStart'))$('routeDebugInvalidStart').textContent=state.routeDebug.invalidSegmentStart?formatLatLng(state.routeDebug.invalidSegmentStart):'-';
 if($('routeDebugInvalidEnd'))$('routeDebugInvalidEnd').textContent=state.routeDebug.invalidSegmentEnd?formatLatLng(state.routeDebug.invalidSegmentEnd):'-';
 if($('routeDebugInvalidPoint'))$('routeDebugInvalidPoint').textContent=state.routeDebug.invalidPoint?formatLatLng(state.routeDebug.invalidPoint):'-';
 if($('routeDebugInvalidDepth'))$('routeDebugInvalidDepth').textContent=Number.isFinite(state.routeDebug.invalidDepth)?`${state.routeDebug.invalidDepth.toFixed(1)} m`:(state.routeDebug.invalidReason||'-');
 if($('routeDebugStatus'))$('routeDebugStatus').textContent=state.routeDebug.lastError||state.routeDebug.lastStatus||'Ingen';
 updateDepthDebugUi();
}

function logRoutingSuccess(route,mode){
 const routeComplete=route.stats?.routeComplete===true||(!route.stats&&route.points.length>2);
 setRoutingDebug('Rute beregnet',null,route.points.length,route.lengthNm,{routingMode:mode,routingSource:route.stats?.routingSource||'DDM grid',gridResolutionM:route.stats?.gridResolutionM||0,visitedCells:route.stats?.visitedCells||0,routingTileCount:route.stats?.routingTileCount||0,fallbackUsed:route.stats?.fallbackUsed===true,reachedDestination:route.stats?.reachedDestination===true||routeComplete,routeComplete,lastDistanceNm:route.stats?.lastDistanceNm||0,startNode:route.stats?.startNode||null,destinationNode:route.stats?.destinationNode||null,lastPoint:route.points.at(-1)||null,originalPointCount:route.stats?.originalPointCount||route.points.length,smoothedPointCount:route.stats?.smoothedPointCount||route.points.length,smoothingReductionPct:route.stats?.smoothingReductionPct||0,smoothingMode:route.stats?.smoothingMode||state.routeSmoothing,smoothingSplineUsed:route.stats?.smoothingSplineUsed===true,smoothingFallback:route.stats?.smoothingFallback===true,...clearInvalidSegmentStats()});
 console.info('WaterNav routing success',{mode,routingSource:route.stats?.routingSource||'DDM grid',fallbackUsed:route.stats?.fallbackUsed===true,routePointCount:route.points.length,routeDistanceNm:Number(route.lengthNm.toFixed(3)),visitedCells:route.stats?.visitedCells||0,routingTiles:route.stats?.routingTileCount||0,gridResolutionM:route.stats?.gridResolutionM||0,reachedDestination:route.stats?.reachedDestination===true||routeComplete,routeComplete,lastDistanceNm:route.stats?.lastDistanceNm,originalRoutePoints:route.stats?.originalPointCount||route.points.length,smoothedRoutePoints:route.stats?.smoothedPointCount||route.points.length,smoothingReductionPct:route.stats?.smoothingReductionPct||0,smoothingMode:route.stats?.smoothingMode||state.routeSmoothing,smoothingSplineUsed:route.stats?.smoothingSplineUsed===true,smoothingFallback:route.stats?.smoothingFallback===true,layerVisible:routeLayerVisible(),bounds:state.routeBounds});
}

function handleRoutingFailure(message,extra={}){
 const concrete=message||'Ingen vandrute fundet';
 setRoutingDebug('Routing fejlede',concrete,0,0,{routingSource:extra.routingSource||'DDM grid',fallbackUsed:extra.fallbackUsed===true,routeComplete:false,originalPointCount:0,smoothedPointCount:0,smoothingReductionPct:0,smoothingMode:'off',smoothingSplineUsed:false,smoothingFallback:false,...clearInvalidSegmentStats(),...extra});
 console.warn('WaterNav routing failure',{message:concrete,start:state.start,end:state.end,startNode:state.routeDebug.startNode,destinationNode:state.routeDebug.destinationNode,reachedDestination:state.routeDebug.reachedDestination,lastPoint:state.routeDebug.lastPoint,lastDistanceNm:state.routeDebug.lastDistanceNm,routePointCount:state.routeDebug.pointCount,visitedCells:state.routeDebug.visitedCells,routingTiles:state.routeDebug.routingTileCount,fallbackUsed:state.routeDebug.fallbackUsed,invalidSegmentIndex:state.routeDebug.invalidSegmentIndex,invalidSegmentStart:state.routeDebug.invalidSegmentStart,invalidSegmentEnd:state.routeDebug.invalidSegmentEnd,invalidPoint:state.routeDebug.invalidPoint,invalidDepth:state.routeDebug.invalidDepth,invalidReason:state.routeDebug.invalidReason,loadedDepthTiles:state.loadedDepthTiles.size,failedTiles:state.failedTileCount});
 setStatus(concrete);
 return false;
}

function buildWaterRoute(start,end,opts){
 const grid=state.depthGrid;
 const sCell=nearestNavigableCell(start,opts);
 const eCell=nearestNavigableCell(end,opts);
 if(!sCell)return{ok:false,message:'Startpunktet ligger ikke tæt på sejlbart DDM-vand i gridområdet.'};
 if(!eCell)return{ok:false,message:'Slutpunktet ligger ikke tæt på sejlbart DDM-vand i gridområdet.'};
 const search=aStarGrid(sCell,eCell,opts);
 const baseStats=routingBaseStats(opts,sCell,eCell,search);
 if(!search.reached||!search.path||search.path.length<2)return{ok:false,message:`Ingen vandrute fundet med minimum ${Number(opts.minDepth||0).toFixed(1)} m. Prøv lavere minimumsdybde eller flyt start/slut til dybere vand.`,stats:baseStats};
 const path=search.path;
 const rawPts=path.map(cellToLatLng);
 const validation=validateCompleteRouteOutput(start,end,path,rawPts,opts,search);
 if(!validation.ok)return{ok:false,message:validation.message,stats:{...baseStats,...validation.stats}};
 const rawPathValidation=validateWaterPathDetailed(rawPts,opts);
 if(!rawPathValidation.ok)return{ok:false,message:'Rute krydser land/ukendt DDM-data',stats:{...baseStats,...rawPathValidation.stats}};
 const smoothing=applyRouteSmoothing(rawPts,opts);
 const pts=smoothing.points;
 const smoothedValidation=validateSmoothedRouteOutput(start,end,pts,opts);
 if(!smoothedValidation.ok)return{ok:false,message:smoothedValidation.message,stats:{...baseStats,...validation.stats,...smoothing.stats,...smoothedValidation.stats}};
 const depths=samplePathDepths(pts,opts);
 const minDepth=Math.min(...depths),maxDepth=Math.max(...depths),avgDepth=depths.reduce((a,b)=>a+b,0)/Math.max(1,depths.length);
 return{ok:true,points:pts,avgDepth,stats:{...baseStats,...validation.stats,...smoothing.stats,...smoothedValidation.stats,minDepth,maxDepth,avgDepth,gridSteps:path.length,startDepth:depthAtCell(sCell.r,sCell.c),endDepth:depthAtCell(eCell.r,eCell.c)}};
}

function applyRouteSmoothing(points,opts){
 const mode=ROUTE_SMOOTHING_ENABLED?(state.routeSmoothing||'normal'):'off';
 const originalPointCount=points.length;
 let smoothed=[...points],splineUsed=false,smoothingFallback=false,splineRejectedSegments=0;
 if(mode==='normal'||mode==='high'){
  smoothed=lineOfSightSmooth(points,opts);
  if(mode==='high'){
   const spline=splineSmoothSafe(smoothed,opts);
   splineUsed=spline.usedSpline;
   splineRejectedSegments=spline.rejectedSegments;
   if(spline.points.length>2&&validateWaterPath(spline.points,opts))smoothed=spline.points;
   else smoothingFallback=true;
  }
 }
 if(smoothed.length<=2&&points.length>2){
  smoothed=[points[0],points[Math.floor(points.length/2)],points[points.length-1]];
  if(!validateWaterPath(smoothed,opts)){smoothed=[...points];smoothingFallback=true;}
 }
 if(!validateWaterPath(smoothed,opts)){smoothed=[...points];smoothingFallback=true;}
 const smoothedPointCount=smoothed.length;
 const smoothingReductionPct=originalPointCount?Math.max(0,Math.round((1-smoothedPointCount/originalPointCount)*100)):0;
 return{points:smoothed,stats:{smoothingMode:mode,originalPointCount,smoothedPointCount,smoothingReductionPct,smoothingSplineUsed:splineUsed,smoothingFallback,splineRejectedSegments}};
}

function lineOfSightSmooth(points,opts){
 if(points.length<3)return points;
 const out=[points[0]];
 let i=0;
 while(i<points.length-1){
  let j=points.length-1;
  while(j>i+1&&!segmentWaterClear(points[i],points[j],opts))j--;
  out.push(points[j]);
  i=j;
 }
 return out;
}

function splineSmoothSafe(points,opts){
 if(points.length<4)return{points,usedSpline:false,rejectedSegments:0};
 const out=[points[0]];
 let usedSpline=false,rejectedSegments=0;
 for(let i=0;i<points.length-1;i++){
  const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
  const segNm=directNm(p1,p2);
  const steps=Math.max(2,Math.min(10,Math.ceil(segNm*5)));
  const candidate=[];
  for(let s=1;s<=steps;s++){
   const t=s/steps;
   candidate.push(catmullRomPoint(p0,p1,p2,p3,t));
  }
  const segment=[out[out.length-1],...candidate];
  if(validateWaterPath(segment,opts)){
   out.push(...candidate);
   usedSpline=true;
  }else{
   out.push(p2);
   rejectedSegments++;
  }
 }
 return{points:dedupeRoutePoints(out),usedSpline,rejectedSegments};
}

function catmullRomPoint(p0,p1,p2,p3,t){
 const t2=t*t,t3=t2*t;
 return{
  lat:0.5*((2*p1.lat)+(-p0.lat+p2.lat)*t+(2*p0.lat-5*p1.lat+4*p2.lat-p3.lat)*t2+(-p0.lat+3*p1.lat-3*p2.lat+p3.lat)*t3),
  lng:0.5*((2*p1.lng)+(-p0.lng+p2.lng)*t+(2*p0.lng-5*p1.lng+4*p2.lng-p3.lng)*t2+(-p0.lng+3*p1.lng-3*p2.lng+p3.lng)*t3)
 };
}

function dedupeRoutePoints(points){
 const out=[];
 for(const p of points){
  const prev=out[out.length-1];
  if(!prev||directNm(prev,p)>0.002)out.push(p);
 }
 return out;
}

function validateSmoothedRouteOutput(start,end,points,opts){
 const stats={routeComplete:false,lastPoint:points.at(-1)||null,lastDistanceNm:Infinity};
 if(!Array.isArray(points)||points.length<=2)return{ok:false,message:'Ruteudjævning blev afvist: for få route points.',stats};
 const first=points[0],last=points[points.length-1];
 const startDist=directNm(start,first),endDist=directNm(end,last);
 stats.startDistanceNm=startDist;stats.lastDistanceNm=endDist;stats.lastPoint=last;
 if(startDist>routeEndpointMaxNm()||endDist>routeEndpointMaxNm())return{ok:false,message:'Ruteudjævning blev afvist: ruten når ikke destinationen.',stats};
 const pathValidation=validateWaterPathDetailed(points,opts);
 if(!pathValidation.ok)return{ok:false,message:'Rute krydser land/ukendt DDM-data',stats:{...stats,...pathValidation.stats}};
 stats.routeComplete=true;
 return{ok:true,stats};
}

function routingBaseStats(opts,startCell,endCell,search=null){
 return{routingSource:'DDM grid',fallbackUsed:false,routingMode:opts.mode||'unknown',gridResolutionM:gridResolutionMeters(),routingTileCount:state.routingTileIds.size,visitedCells:search?.visitedCount||0,startNode:{r:startCell.r,c:startCell.c},destinationNode:{r:endCell.r,c:endCell.c},reachedDestination:search?.reached===true,routeComplete:false,lastDistanceNm:Infinity};
}

function gridResolutionMeters(){
 const step=Number(state.depthGrid?.step||state.tileManifest?.grid?.step||0);
 const lat=state.start&&state.end?(state.start.lat+state.end.lat)/2:(state.depthGrid?.bounds?(state.depthGrid.bounds.latMin+state.depthGrid.bounds.latMax)/2:56);
 if(!Number.isFinite(step)||step<=0)return 0;
 const latMeters=step*111320;
 const lngMeters=step*111320*Math.cos(lat*Math.PI/180);
 return Math.sqrt(Math.max(1,latMeters)*Math.max(1,Math.abs(lngMeters)));
}

function validateCompleteRouteOutput(start,end,path,points,opts,search){
 const stats={reachedDestination:search?.reached===true,routeComplete:false,lastDistanceNm:Infinity,lastPoint:points.at(-1)||null};
 if(!Array.isArray(path)||!Array.isArray(points)||points.length!==path.length||points.length<=2)return{ok:false,message:'Ruten kunne ikke føres helt til destinationen',stats:{...stats,pointCount:points?.length||0}};
 const first=points[0],last=points[points.length-1];
 const startDist=directNm(start,first),endDist=directNm(end,last);
 stats.startDistanceNm=startDist;
 stats.lastDistanceNm=endDist;
 stats.lastPoint=last;
 if(!search?.reached)return{ok:false,message:'Ruten kunne ikke føres helt til destinationen',stats};
 const expectedEnd=search.endCell;
 const actualEnd=path[path.length-1];
 if(!expectedEnd||!actualEnd||actualEnd.r!==expectedEnd.r||actualEnd.c!==expectedEnd.c)return{ok:false,message:'Ruten kunne ikke føres helt til destinationen',stats};
 const endpointMaxNm=routeEndpointMaxNm();
 if(startDist>endpointMaxNm||endDist>endpointMaxNm)return{ok:false,message:'Ruten kunne ikke føres helt til destinationen',stats};
 for(let i=1;i<path.length;i++){
  const dr=Math.abs(path[i].r-path[i-1].r),dc=Math.abs(path[i].c-path[i-1].c);
  if(dr>1||dc>1||(!dr&&!dc))return{ok:false,message:'Ruten blev afvist: route point-kæden er ikke sammenhængende.',stats};
  if(!cellNavigable(path[i].r,path[i].c,opts))return{ok:false,message:'Ruten blev afvist: validering fandt land/ukendt eller for lav dybde på ruten.',stats};
 }
 stats.routeComplete=true;
 return{ok:true,stats};
}
function nearestNavigableCell(p,opts){
 const base=latLngToCell(p);if(!base)return null;
 if(opts?.mode==='seaTrout'&&Number.isInteger(p?.r)&&Number.isInteger(p?.c)&&cellNavigable(p.r,p.c,opts))return{r:p.r,c:p.c,score:0};
 let best=null;
 const maxR=34;
 for(let radius=0;radius<=maxR;radius++){
  for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
   if(Math.max(Math.abs(dr),Math.abs(dc))!==radius)continue;
   const r=base.r+dr,c=base.c+dc,d=depthAtCell(r,c);
   if(!cellNavigable(r,c,opts))continue;
   const cell={r,c};const geo=cellToLatLng(cell);const dist=directNm(p,geo);
    const depthPenalty=(opts.mode==='trolling'||opts.mode==='seaTrout')&&Number.isFinite(opts.targetDepth)?Math.abs(d-opts.targetDepth)*0.85:0;
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
  if(cur.key===endKey)return{reached:true,path:reconstructPath(came,cur),visitedCount:closed.size+1,iterations:iter,startCell:start,endCell:end,lastNode:{r:cur.r,c:cur.c}};
  closed.add(cur.key);
  for(const nb of neighbors(cur.r,cur.c,rows,cols)){
   const nKey=nb.r+','+nb.c;if(closed.has(nKey))continue;
   const d=depthAtCell(nb.r,nb.c);
   if(!cellNavigable(nb.r,nb.c,opts))continue;
   // Prevent diagonal squeezing through land, unknown depth, or too-shallow cells.
    if(nb.diag){
     if(!cellNavigable(cur.r,nb.c,opts)||!cellNavigable(nb.r,cur.c,opts))continue;
    }
    if(opts.mode==='seaTrout'&&!transitionWaterClear({r:cur.r,c:cur.c},{r:nb.r,c:nb.c},opts))continue;
    let step=nb.diag?1.414:1;
   let cost=step;
    if(opts.mode==='trolling'){
     const diff=Math.abs(d-targetDepth);
     cost += diff*diff*3.2 + diff*0.85;
     if(diff<=opts.tolerance)cost *= 0.55;
    }else if(opts.mode==='seaTrout'){
     const range=opts.depthRange||[3,8],low=range[0],high=range[1],mid=Number.isFinite(targetDepth)?targetDepth:(low+high)/2;
     const outside=d<low?low-d:d>high?d-high:0;
     const gradient=depthGradientAtCell(nb.r,nb.c);
     cost += outside*outside*2.8 + Math.abs(d-mid)*0.32;
     cost += Math.max(0,1.1-gradient)*0.65;
     if(d>=low&&d<=high)cost *= 0.72;
     if(gradient>=1.8)cost *= 0.78;
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
 return{reached:false,path:null,visitedCount:closed.size,iterations:iter,startCell:start,endCell:end,lastNode:null};
}
function depthGradientAtCell(r,c){
 let min=Infinity,max=-Infinity,count=0;
 for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
  const d=depthAtCell(r+dr,c+dc);
  if(!Number.isFinite(d))continue;
  min=Math.min(min,d);max=Math.max(max,d);count++;
 }
 return count>=3?Math.max(0,max-min):0;
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
function latLngToCell(p,grid=state.depthGrid){if(!grid)return null;const b=grid.bounds,step=grid.step;if(p.lat<b.latMin||p.lat>b.latMax||p.lng<b.lngMin||p.lng>b.lngMax)return null;return{r:Math.round((p.lat-b.latMin)/step),c:Math.round((p.lng-b.lngMin)/step)}}
function latLngToFloatCell(p,grid=state.depthGrid){if(!grid)return null;const b=grid.bounds,step=Number(grid.step);if(!Number.isFinite(step)||step<=0||p.lat<b.latMin||p.lat>b.latMax||p.lng<b.lngMin||p.lng>b.lngMax)return null;return{r:(p.lat-b.latMin)/step,c:(p.lng-b.lngMin)/step}}
function cellToLatLng(cell){const grid=state.depthGrid,b=grid.bounds,step=grid.step;return{lat:b.latMin+cell.r*step,lng:b.lngMin+cell.c*step}}
function depthAtLatLng(p){return depthProbeAtLatLng(p).depth}
function depthProbeAtLatLng(p,{interpolate=true,grid=null}={}){
 const g=grid||bestDepthGridForPoint(p)||(state.tileManifest?buildVirtualTileGrid(state.tileManifest):null);
 const empty={ok:false,depth:NaN,interpolated:false,tileId:'-',cell:null,gps:p||null,source:'-',error:'DDM manifest/grid er ikke indlæst'};
 if(!p||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))return{...empty,error:'GPS-position er ugyldig'};
 if(!g)return empty;
 const frac=latLngToFloatCell(p,g);
 if(!frac)return{...empty,gps:p,source:gridSourceLabel(g),error:'Mangler DDM-data uden for installeret DDM-område'};
 const nearest={r:Math.round(frac.r),c:Math.round(frac.c)};
 const tileId=g.mode==='tiles'?expectedTileIdForPoint(p,g):gridSourceLabel(g);
 const tileMeta=tileId&&state.tileById.get(tileId);
 const nearestDepth=depthAtGridCell(g,nearest.r,nearest.c);
 if(g.mode==='tiles'&&tileId&&!state.loadedDepthTiles.has(tileId)){
  return{...empty,gps:p,tileId,cell:nearest,source:gridSourceLabel(g),error:`Mangler DDM-data i tile ${tileId}`};
 }
 if(g.mode==='tiles'&&!tileMeta){
  return{...empty,gps:p,tileId:tileId||'-',cell:nearest,source:gridSourceLabel(g),error:'Mangler DDM-data uden for installerede DDM tiles'};
 }
 const r0=Math.floor(frac.r),c0=Math.floor(frac.c),r1=Math.ceil(frac.r),c1=Math.ceil(frac.c);
 const corners=[
  {r:r0,c:c0,d:depthAtGridCell(g,r0,c0)},
  {r:r0,c:c1,d:depthAtGridCell(g,r0,c1)},
  {r:r1,c:c0,d:depthAtGridCell(g,r1,c0)},
  {r:r1,c:c1,d:depthAtGridCell(g,r1,c1)}
 ];
 const allCorners=corners.every(x=>Number.isFinite(x.d));
 if(interpolate&&allCorners){
  const tr=frac.r-r0,tc=frac.c-c0;
  const d00=corners[0].d,d01=corners[1].d,d10=corners[2].d,d11=corners[3].d;
  const depth=d00*(1-tr)*(1-tc)+d10*tr*(1-tc)+d01*(1-tr)*tc+d11*tr*tc;
  return{ok:true,depth,interpolated:Math.abs(tr)>1e-6||Math.abs(tc)>1e-6,tileId:tileId||'-',cell:nearest,floatCell:frac,corners,gps:p,source:gridSourceLabel(g),error:null};
 }
 if(Number.isFinite(nearestDepth)){
  return{ok:true,depth:nearestDepth,interpolated:false,tileId:tileId||'-',cell:nearest,floatCell:frac,corners,gps:p,source:gridSourceLabel(g),error:allCorners?null:'Interpolation ikke mulig: mangler DDM-hjørnedata'};
 }
 return{...empty,gps:p,tileId:tileId||'-',cell:nearest,floatCell:frac,corners,source:gridSourceLabel(g),error:`Mangler DDM-data i tile ${tileId||'-'}`};
}
function minNeighborhoodDepth(r,c,radius=1){let min=Infinity;for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){const d=depthAtCell(r+dr,c+dc);if(!Number.isFinite(d))return NaN;if(d<min)min=d}return min}
function cellNavigable(r,c,opts){
 const d=depthAtCell(r,c);if(!Number.isFinite(d)||d<opts.minDepth)return false;
 // Fine grids use 3x3 clearance; coarse Denmark tiles use the water cell itself so narrow fairways stay routable.
 if(opts.mode==='free'){
  const nd=minNeighborhoodDepth(r,c,freeNavigationClearanceRadius());
  if(!Number.isFinite(nd)||nd<opts.minDepth)return false;
 }
 return true;
}

function freeNavigationClearanceRadius(){
 return gridResolutionMeters()<=FINE_GRID_CLEARANCE_MAX_M?1:0;
}

function routeEndpointMaxNm(){
 const byGrid=(gridResolutionMeters()/1852)*2.5;
 return Math.max(ROUTE_ENDPOINT_MAX_NM,Number.isFinite(byGrid)?byGrid:0);
}
function validateWaterPath(points,opts){return validateWaterPathDetailed(points,opts).ok}
function validateWaterPathDetailed(points,opts){
 if(!Array.isArray(points)||points.length<2)return{ok:false,stats:invalidSegmentStats({index:null,a:null,b:null,point:null,depth:NaN,reason:'for få route points',gridSource:'-'})};
 for(let i=1;i<points.length;i++){
  const segment=segmentWaterClearDetailed(points[i-1],points[i],opts,i-1);
  if(!segment.ok)return{ok:false,stats:invalidSegmentStats(segment)};
 }
 return{ok:true,stats:clearInvalidSegmentStats()};
}
function segmentWaterClear(a,b,opts){return segmentWaterClearDetailed(a,b,opts).ok}
function segmentWaterClearDetailed(a,b,opts,index=null){
 const dist=directNm(a,b);
 const sampleMeters=12;
 const n=Math.max(2,Math.ceil(dist*1852/sampleMeters));
 for(let i=0;i<=n;i++){
  const t=i/n;
  const p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
  const probe=probeRoutePointWater(p,opts);
  if(!probe.ok)return{ok:false,index,a,b,point:p,depth:probe.depth,reason:probe.reason,gridSource:probe.gridSource};
 }
 return{ok:true};
}
function transitionWaterClear(aCell,bCell,opts){
 return segmentWaterClear(cellToLatLng(aCell),cellToLatLng(bCell),opts);
}
function probeRoutePointWater(p,opts){
 const grid=bestCollisionGridForPoint(p);
 if(!grid)return{ok:false,depth:NaN,reason:'manglende DDM-grid',gridSource:'-'};
 return probeRoutePointInGrid(grid,p,opts);
}
function bestCollisionGridForPoint(p){
 if(state.collisionGrid&&pointInsideGrid(p,state.collisionGrid))return state.collisionGrid;
 if(state.depthGrid&&pointInsideGrid(p,state.depthGrid))return state.depthGrid;
 return null;
}
function probeRoutePointInGrid(grid,p,opts){
 const cells=routePointCandidateCells(grid,p);
 if(!cells.length)return{ok:false,depth:NaN,reason:'punkt uden for DDM-grid',gridSource:gridSourceLabel(grid)};
 let min=Infinity;
 for(const cell of cells){
  const hit=probeGridCell(grid,cell.r,cell.c,opts);
  if(!hit.ok)return{ok:false,depth:hit.depth,reason:hit.reason,gridSource:gridSourceLabel(grid)};
  min=Math.min(min,hit.depth);
 }
 return{ok:true,depth:min,reason:null,gridSource:gridSourceLabel(grid)};
}
function routePointCandidateCells(grid,p){
 if(!grid?.bounds||!Number.isFinite(Number(grid.step)))return[];
 const b=grid.bounds,step=Number(grid.step);
 const fr=(p.lat-b.latMin)/step,fc=(p.lng-b.lngMin)/step;
 if(fr<0||fc<0||fr>grid.rows-1||fc>grid.cols-1)return[];
 const raw=[
  {r:Math.floor(fr),c:Math.floor(fc)},
  {r:Math.floor(fr),c:Math.ceil(fc)},
  {r:Math.ceil(fr),c:Math.floor(fc)},
  {r:Math.ceil(fr),c:Math.ceil(fc)},
  {r:Math.round(fr),c:Math.round(fc)}
 ];
 const seen=new Set(),out=[];
 for(const cell of raw){
  const key=`${cell.r},${cell.c}`;
  if(seen.has(key))continue;
  seen.add(key);
  out.push(cell);
 }
 return out;
}
function probeGridCell(grid,r,c,opts){
 const depth=depthAtGridCell(grid,r,c);
 if(!Number.isFinite(depth))return{ok:false,depth:NaN,reason:'land/ukendt DDM-data'};
 if(depth<Number(opts.minDepth||0))return{ok:false,depth,reason:'under minimumsdybde'};
 return{ok:true,depth,reason:null};
}
function depthAtGridCell(grid,r,c){
 if(!grid||r<0||c<0||r>=grid.rows||c>=grid.cols)return NaN;
 if(grid.mode==='tiles'){
  const tileSize=state.tileManifest?.grid?.tileSize||grid.tileSize;
  if(!tileSize)return NaN;
  const id=tileIdForCell(r,c,tileSize);
  const tile=state.loadedDepthTiles.get(id);
  if(!tile)return NaN;
  const localR=r-tile.row0,localC=c-tile.col0;
  const d=tile.data?.[localR]?.[localC];
  return typeof d==='number'?d:NaN;
 }
 const d=grid.data?.[r]?.[c];
 return typeof d==='number'?d:NaN;
}
function gridSourceLabel(grid){
 if(grid===state.collisionGrid)return'DDM fine collision grid';
 if(grid?.mode==='tiles')return'DDM routing tiles';
 return grid?.sourceLabel||grid?.source||'DDM grid';
}
function formatLatLng(p){
 return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`:'-';
}
function invalidSegmentStats(segment){
 return{invalidSegmentIndex:segment.index,invalidSegmentStart:segment.a||null,invalidSegmentEnd:segment.b||null,invalidPoint:segment.point||null,invalidDepth:Number.isFinite(segment.depth)?segment.depth:NaN,invalidReason:segment.reason||'land/ukendt DDM-data',invalidGridSource:segment.gridSource||'-'};
}
function clearInvalidSegmentStats(){
 return{invalidSegmentIndex:null,invalidSegmentStart:null,invalidSegmentEnd:null,invalidPoint:null,invalidDepth:null,invalidReason:null,invalidGridSource:null};
}
function samplePathDepths(points,opts){const out=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const dist=directNm(a,b);const n=Math.max(2,Math.ceil(dist*1852/12));for(let k=0;k<=n;k++){const t=k/n;const p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};const probe=probeRoutePointWater(p,opts);if(probe.ok&&Number.isFinite(probe.depth))out.push(probe.depth)}}return out.length?out:points.map(depthAtLatLng).filter(Number.isFinite)}
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
function drawRoute(points,depth,label,extras={}){
 if(state.routeLayer)map.removeLayer(state.routeLayer);
 state.routeLayer=null;state.routeLine=null;state.routeBounds=null;
 const latLngs=points.map(p=>[p.lat,p.lng]);
 const tip=label || (Number.isFinite(depth)?`Trollingrute · DDM ${depth.toFixed(1)}m`:'Fri navigationsrute');
 const halo=L.polyline(latLngs,{pane:'routePane',color:'#ff1f2d',weight:10,opacity:.72,lineCap:'round',lineJoin:'round'});
 const line=L.polyline(latLngs,{pane:'routePane',color:'#20d8ff',weight:6,opacity:1,lineCap:'round',lineJoin:'round'}).bindTooltip(tip,{sticky:true});
 const layers=[halo,line];
 if(extras.turnPoints?.length){
  extras.turnPoints.forEach((p,i)=>layers.push(L.circleMarker([p.lat,p.lng],{pane:'routePane',radius:i===0||i===extras.turnPoints.length-1?7:6,color:'#fff',weight:2,fillColor:i%2?'#ffcf54':'#24dc86',fillOpacity:.98}).bindTooltip(`${i===0?'Start':i===extras.turnPoints.length-1?'Slut':'Vendepunkt'} ${i+1} · ${Number(p.depth||0).toFixed(1)} m`,{sticky:true})));
 }
 if(extras.direction){
  for(const item of routeDirectionMarkers(points)){
   layers.push(L.marker([item.point.lat,item.point.lng],{pane:'routePane',interactive:false,icon:L.divIcon({className:'route-direction-marker',html:`<div style="transform:rotate(${item.bearing}deg)">➜</div>`,iconSize:[28,28],iconAnchor:[14,14]})}));
  }
 }
 state.routeLine=line;
 state.routeLayer=L.layerGroup(layers).addTo(map);
 state.routeBounds=line.getBounds();
 line.bringToFront?.();
 if(state.routeBounds?.isValid?.()){state.autoPanGuardUntil=Date.now()+1100;map.fitBounds(state.routeBounds,{padding:[70,70],maxZoom:15});}
 updateInfoBox();updateRouteActionButtons();updateRouteDebugUi();
 requestAnimationFrame(()=>{updateRouteDebugUi();console.info('WaterNav route layer drawn',{routePointCount:points.length,routeDistanceNm:Number(pathNm(points).toFixed(3)),layerVisible:routeLayerVisible()})});
}
function routeDirectionMarkers(points){
 const out=[];if(!Array.isArray(points)||points.length<3)return out;
 const total=pathNm(points);if(!Number.isFinite(total)||total<=0)return out;
 const targets=[.25,.5,.75].map(t=>total*t);
 let acc=0,next=0;
 for(let i=1;i<points.length&&next<targets.length;i++){
  const a=points[i-1],b=points[i],seg=directNm(a,b);
  while(next<targets.length&&acc+seg>=targets[next]){
   const t=seg?Math.max(0,Math.min(1,(targets[next]-acc)/seg)):0;
   const point={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
   out.push({point,bearing:Math.round(bearingDeg(a,b))});
   next++;
  }
  acc+=seg;
 }
 return out;
}

function clearComputedRouteOnly(){
 stopNavigation(true);
 if(state.routeLayer){map.removeLayer(state.routeLayer);state.routeLayer=null}
 state.routeLine=null;state.routeBounds=null;state.currentRoute=null;
 if($('routeLength'))$('routeLength').textContent='—';
 updateInfoBox();updateRouteActionButtons();updateRouteDebugUi();
}

function clearRoute(){
 stopNavigation(true);
 if(state.routeLayer){map.removeLayer(state.routeLayer);state.routeLayer=null}
 state.routeLine=null;state.routeBounds=null;
 if(state.startMarker){map.removeLayer(state.startMarker);state.startMarker=null}
 if(state.endMarker){map.removeLayer(state.endMarker);state.endMarker=null}
 state.start=null;state.end=null;state.currentRoute=null;state.pickMode=null;
 setRoutingDebug('Rute ryddet',null,0,0,{originalPointCount:0,smoothedPointCount:0,smoothingReductionPct:0,smoothingMode:'off',smoothingSplineUsed:false,smoothingFallback:false,...clearInvalidSegmentStats()});
 updateInfoBox();updateRouteActionButtons();
 $('routeLength').textContent='—';
 setStatus('Aktiv rute og navigation er ryddet. Hjemhavn, settings og gemte ruter er bevaret.');
}
function setDisabled(id,disabled){const el=$(id);if(el)el.disabled=!!disabled}
function updateRouteActionButtons(){
 const manifestReady=!!state.tileManifest&&state.manifestStatus==='ready';
 const has=!!state.currentRoute?.points?.length;
 const isTrolling=['trolling','sea-trout'].includes(state.currentRoute?.mode);
 setDisabled('makeRoute',!manifestReady);
 setDisabled('makeRouteMain',!manifestReady);
 setDisabled('findSeaTroutRoute',!manifestReady);
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
function reverseCurrentRoute(){if(!state.currentRoute?.points?.length)return setStatus('Ingen rute at vende.');if(!['trolling','sea-trout'].includes(state.currentRoute.mode))return setStatus('Vend retning bruges til trollingstrækninger.');state.currentRoute.points=[...state.currentRoute.points].reverse();state.currentRoute.reversed=!state.currentRoute.reversed;state.trollingDirection=state.currentRoute.reversed?-1:1;const first=state.currentRoute.points[0],last=state.currentRoute.points[state.currentRoute.points.length-1];setStart(first);setEnd(last);const label=state.currentRoute.mode==='sea-trout'?`Havørred · ${state.currentRoute.seaTrout?.zone||'DDM'} · ${state.currentRoute.reversed?'retur':'frem'}`:`Trollingstrækning · ${state.currentRoute.depth}m · ${state.currentRoute.reversed?'retur':'frem'}`;drawRoute(state.currentRoute.points,Number(state.currentRoute.actualDepth||state.currentRoute.depth),label);logRoutingSuccess(state.currentRoute,'reverse');if(state.navActive)updateNavigation();setStatus('Trollingretning vendt. Sejl samme strækning tilbage.')}
function startNavigation(){if(!state.currentRoute?.points?.length)return setStatus('Ingen rute at navigere efter.');state.navActive=true;enableFollowGps('navigation start');setNavigationLayout(true);updateRouteActionButtons();syncWakeLock();setStatus(state.currentRoute.mode==='trolling'||state.currentRoute.mode==='sea-trout'?'Trolling startet. Kurslinje 1/2/3 NM vises ved GPS/COG.':'Navigation startet. Kurslinje 1/2/3 NM vises ved GPS/COG.');updateNavigation();updateInfoBox();}
function startTrolling(){if(!['trolling','sea-trout'].includes(state.currentRoute?.mode))return setStatus('Vælg eller lav en trollingrute først.');startNavigation();}
function stopNavigation(silent=false){state.navActive=false;setNavigationLayout(false);releaseWakeLock();updateRouteActionButtons();$('navNext').textContent='—';$('navXte').textContent='—';updateInfoBox();updateFollowGpsUi();drawForwardLine(Number.isFinite(state.lastCog)?state.lastCog:NaN);if(!silent)setStatus('Navigation stoppet. Følg GPS fortsætter, hvis den er aktiv.')}
function updateNavigation(){if(!state.gps||!state.currentRoute?.points?.length)return;const pts=state.currentRoute.points;let near=nearestIndex(pts,state.gps);let nextIdx=Math.min(pts.length-1,near.i+Math.max(3,Math.round(pts.length/30)));let next=pts[nextIdx];const distNext=directNm(state.gps,next);const xte=near.d;const brg=bearingDeg(state.gps,next);$('navNext').textContent=`${distNext.toFixed(2)} NM · ${Math.round(brg)}°`;$('navXte').textContent=`${xte.toFixed(2)} NM`;checkNavigationAlarms(xte);updateInfoBox();drawForwardLine(Number.isFinite(state.lastCog)?state.lastCog:brg);followBoat(true);applyMapOrientation(false)}
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
  const probe=depthProbeAtLatLng(p);
  const depthText=probe.ok?` · ${probe.depth.toFixed(1)} m DDM`:'';
  parts.push(min?`${nm}NM ${min}m`:`${nm}NM`);
  L.circleMarker([p.lat,p.lng],{radius:5,color:'#ff1f2d',weight:3,fillColor:'#fff',fillOpacity:1}).bindTooltip(`<span class="course-label-text">${nm} NM${min?` · ca. ${min} min`:''}${depthText}</span>`,{permanent:true,direction:'right',offset:[8,0],className:'course-distance-label'}).addTo(state.forwardLayer)
 }
 $('navAhead').textContent=parts.join(' · ')
}


function checkNavigationAlarms(xte){
 const notes=[];
 const probe=state.gps?depthProbeAtLatLng(state.gps):null;
 const d=probe?.depth??NaN;
 const min=(state.currentRoute?.mode==='free'||state.currentRoute?.mode==='sea-trout')?Number(state.currentRoute.minDepth||state.currentRoute.depth||0):Number(state.currentRoute?.depth||selectedDepth());
 if(state.depthAlarm&&Number.isFinite(d)&&Number.isFinite(min)&&d<min)notes.push(`ADVARSEL: DDM-dybde ${d.toFixed(1)} m er under valgt ${min.toFixed(1)} m`);
 if(state.depthAlarm&&probe&&!probe.ok)notes.push(probe.error||'Mangler DDM-data ved GPS-position');
 if(state.offRouteAlarm&&Number.isFinite(xte)&&xte>0.08)notes.push(`ADVARSEL: ${xte.toFixed(2)} NM fra ruten`);
 if(notes.length)setStatus(notes.join(' · '));
}

function updateInfoBox(){
 const heading=Number.isFinite(state.lastCog)?`${Math.round(state.lastCog)}° COG`:'—';
 const sog=Number.isFinite(state.lastSogKn)?state.lastSogKn:NaN;
 const speed=Number.isFinite(sog)?`${sog.toFixed(1)} kn`:'—';
 const depthProbe=state.gps?depthProbeAtLatLng(state.gps):null;
 state.lastDepthProbe=depthProbe;
 const depth=depthProbe?.depth??NaN;
 const depthText=depthProbe?.ok?`${depth.toFixed(1)} m`:(depthProbe?.error||'—');
 const routeText=state.currentRoute?.points?.length?`${Number(state.currentRoute.lengthNm||0).toFixed(2)} NM${state.navActive?' aktiv':''}`:'—';
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
  if($('infoDepth'))$('infoDepth').textContent=depthText;
  if($('infoRoute'))$('infoRoute').textContent=routeText;
  updateDepthDebugUi(depthProbe);
  updateTrollingSpeedAssistant();
}
function updateTrollingSpeedAssistant(){
 const sog=Number.isFinite(state.lastSogKn)?state.lastSogKn:NaN;
 let text='Aktuel — · mål 2,4 kn',cls='speedNeutral';
 if(Number.isFinite(sog)){
  if(sog<2.2){text=`${sog.toFixed(1)} kn · For langsomt`;cls=sog>=2.1?'speedNear':'speedBad';}
  else if(sog<=2.6){text=`${sog.toFixed(1)} kn · Perfekt trollingfart`;cls='speedOk';}
  else{text=`${sog.toFixed(1)} kn · For hurtigt`;cls=sog<=2.7?'speedNear':'speedBad';}
 }
 for(const id of ['trollingSpeedAssist','trollingSpeedFooter']){
  const el=$(id);if(!el)continue;
  el.textContent=id==='trollingSpeedFooter'?`Trollingfart: ${text}`:text;
  el.classList.remove('speedNeutral','speedOk','speedNear','speedBad');
  el.classList.add(cls);
 }
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

function loadSavedTracks(){
 try{state.savedTracks=JSON.parse(localStorage.getItem(TRACK_LOG_KEY)||'[]')}catch{state.savedTracks=[]}
 if(!Array.isArray(state.savedTracks))state.savedTracks=[];
}
function loadTrackPrefs(){
 try{const p=JSON.parse(localStorage.getItem(TRACK_PREF_KEY)||'{}');state.trackAutoResume=p.autoResume!==false}catch{state.trackAutoResume=true}
 state.trackAutoPaused=false;
}
function saveTrackPrefs(){
 localStorage.setItem(TRACK_PREF_KEY,JSON.stringify({autoResume:state.trackAutoResume!==false,updated:new Date().toISOString()}));
}
function loadTrackDraft(){
 if(!state.trackAutoResume)return;
 try{
  const draft=JSON.parse(localStorage.getItem(TRACK_DRAFT_KEY)||'null');
  if(draft&&Array.isArray(draft.points)){
   state.trackPoints=draft.points.filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))).map(p=>({...p,lat:Number(p.lat),lng:Number(p.lng),time:Number(p.time)||Date.now()}));
   state.trackStartedAt=Number(draft.startedAt)||state.trackPoints[0]?.time||null;
   state.trackStoppedAt=null;
  }
 }catch{}
}
function saveSavedTracks(){
 localStorage.setItem(TRACK_LOG_KEY,JSON.stringify(state.savedTracks));
}
function persistTrackDraft(){
 if(!state.trackPoints.length){localStorage.removeItem(TRACK_DRAFT_KEY);return;}
 localStorage.setItem(TRACK_DRAFT_KEY,JSON.stringify({startedAt:state.trackStartedAt||state.trackPoints[0]?.time||Date.now(),updated:new Date().toISOString(),points:state.trackPoints.slice(-5000)}));
}
function maybeAutoStartTrack(){
 if(!state.gps||state.trackActive||state.trackAutoResume===false||state.trackAutoPaused)return;
 startTrackLog({auto:true,resume:state.trackPoints.length>0});
}
function setTrackAutoResume(on){
 state.trackAutoResume=!!on;
 state.trackAutoPaused=!state.trackAutoResume;
 saveTrackPrefs();
 updateTrackUi();
 if(state.trackAutoResume&&state.gps)maybeAutoStartTrack();
 setStatus(state.trackAutoResume?'Auto-spor er aktivt og starter ved GPS.':'Auto-spor er slået fra.');
}
function startTrackLog(opts={}){
 if(state.trackActive)return;
 if(opts.manual){state.trackAutoPaused=false;state.trackAutoResume=true;saveTrackPrefs();}
 state.trackActive=true;
 if(!opts.resume){state.trackPoints=[];state.trackStartedAt=Date.now();}
 else if(!state.trackStartedAt)state.trackStartedAt=Date.now();
 state.trackStoppedAt=null;
 recordTrackPointFromGps(true);
 renderTrackLayer();
 updateTrackUi();
 setStatus(opts.auto?'Sporlog startet automatisk ved GPS.':'Sporlog startet. Faktisk sejlet spor tegnes bag båden.');
}
function stopTrackLog(){
 if(!state.trackActive)return setStatus('Sporlog er ikke aktiv.');
 state.trackActive=false;
 state.trackAutoPaused=true;
 state.trackStoppedAt=Date.now();
 persistTrackDraft();
 updateTrackUi();
 setStatus('Sporlog stoppet. Sporet kan gemmes lokalt.');
}
function clearTrackLog(){
 const wasActive=state.trackActive;
 state.trackActive=false;
 state.trackPoints=[];
 state.trackStartedAt=null;
 state.trackStoppedAt=null;
 localStorage.removeItem(TRACK_DRAFT_KEY);
 if(wasActive&&state.trackAutoResume!==false&&!state.trackAutoPaused&&state.gps){
  state.trackActive=true;
  state.trackStartedAt=Date.now();
  recordTrackPointFromGps(true);
 }
 renderTrackLayer();
 updateTrackUi();
 setStatus('Aktivt spor ryddet. Gemte spor er bevaret.');
}
function saveTrackLog(){
 if(!state.trackPoints||state.trackPoints.length<2)return setStatus('Der skal være mindst to GPS-punkter før sporet kan gemmes.');
 const stats=trackStats();
 const item={id:'tr_'+Date.now(),created:new Date().toISOString(),name:`Spor ${new Date().toLocaleString('da-DK')}`,points:state.trackPoints.map(p=>({lat:p.lat,lng:p.lng,time:p.time,speedKn:p.speedKn??null,depth:p.depth??null})),distanceNm:Number(stats.distanceNm.toFixed(3)),durationMs:stats.durationMs,avgSpeedKn:Number(stats.avgSpeedKn.toFixed(2))};
 state.savedTracks.unshift(item);
 state.savedTracks=state.savedTracks.slice(0,20);
 saveSavedTracks();
 persistTrackDraft();
 renderTrackLayer();
 updateTrackUi();
 setStatus(`Spor gemt lokalt: ${item.distanceNm.toFixed(2)} NM · ${formatDuration(item.durationMs)}.`);
}
function recordTrackPointFromGps(force=false){
 if(!state.trackActive||!state.gps)return;
 const t=state.gps.time||Date.now();
 const last=state.trackPoints.at(-1);
 if(last&&!force){
  const d=directNm(last,state.gps);
  if(d<0.003&&t-last.time<5000)return;
 }
 const probe=depthProbeAtLatLng(state.gps);
 state.lastDepthProbe=probe;
 state.trackPoints.push({lat:Number(state.gps.lat),lng:Number(state.gps.lng),time:t,speedKn:Number.isFinite(state.lastSogKn)?Number(state.lastSogKn.toFixed(2)):null,depth:probe.ok&&Number.isFinite(probe.depth)?Number(probe.depth.toFixed(2)):null});
 persistTrackDraft();
 renderTrackLayer();
 updateTrackUi();
}
function renderTrackLayer(){
 state.trackLayerGroup.clearLayers();
 for(const tr of state.savedTracks.slice(0,8).reverse()){
  if(!Array.isArray(tr.points)||tr.points.length<2)continue;
  L.polyline(tr.points.map(p=>[p.lat,p.lng]),{pane:'routePane',color:'#ffcf54',weight:3,opacity:.48,lineCap:'round',lineJoin:'round'}).bindTooltip(`${escapeHtml(tr.name||'Gemt spor')} · ${Number(tr.distanceNm||pathNm(tr.points)).toFixed(2)} NM`,{sticky:true}).addTo(state.trackLayerGroup);
 }
 if(state.trackPoints.length>=2){
  L.polyline(state.trackPoints.map(p=>[p.lat,p.lng]),{pane:'routePane',color:'#24dc86',weight:4,opacity:.92,lineCap:'round',lineJoin:'round'}).bindTooltip(state.trackActive?'Aktivt spor':'Spor klar til genoptagelse',{sticky:true}).addTo(state.trackLayerGroup);
 }
}
function trackStats(points=state.trackPoints){
 const distanceNm=Array.isArray(points)&&points.length>1?pathNm(points):0;
 const first=points?.[0]?.time||state.trackStartedAt||Date.now();
 const last=points?.at?.(-1)?.time||(state.trackStoppedAt||Date.now());
 const durationMs=Math.max(0,last-first);
 const avgSpeedKn=durationMs>0?distanceNm/(durationMs/3600000):0;
 return{distanceNm,durationMs,avgSpeedKn};
}
function updateTrackUi(){
 const stats=trackStats();
 if($('trackDistance'))$('trackDistance').textContent=`${stats.distanceNm.toFixed(2)} NM`;
 if($('trackDuration'))$('trackDuration').textContent=formatDuration(stats.durationMs);
 if($('trackAvgSpeed'))$('trackAvgSpeed').textContent=stats.avgSpeedKn?`${stats.avgSpeedKn.toFixed(1)} kn`:'—';
 if($('trackStatus'))$('trackStatus').textContent=state.trackActive?(state.trackAutoResume?'Optager automatisk':'Optager'):(state.trackAutoResume?'Klar til GPS':'Stoppet');
 if($('toggleAutoTrack'))$('toggleAutoTrack').checked=state.trackAutoResume!==false;
 if($('startTrack'))$('startTrack').disabled=state.trackActive;
 if($('stopTrack'))$('stopTrack').disabled=!state.trackActive;
 if($('clearTrack'))$('clearTrack').disabled=!state.trackPoints.length;
 if($('saveTrack'))$('saveTrack').disabled=state.trackPoints.length<2;
}
function formatDuration(ms){
 const totalMin=Math.max(0,Math.round((Number(ms)||0)/60000));
 if(totalMin<60)return `${totalMin} min`;
 const h=Math.floor(totalMin/60),m=totalMin%60;
 return `${h}t ${String(m).padStart(2,'0')}m`;
}

function loadCatchLogs(){
 try{state.catchLogs=JSON.parse(localStorage.getItem(CATCH_LOG_KEY)||'[]')}catch{state.catchLogs=[]}
 if(!Array.isArray(state.catchLogs))state.catchLogs=[];
}
function saveCatchLogs(){
 localStorage.setItem(CATCH_LOG_KEY,JSON.stringify(state.catchLogs));
}
function logCatchFromGps(){
 if(!state.gps)return setStatus('GPS er ikke klar endnu, så fangsten kan ikke logges.');
 const pos={lat:Number(state.gps.lat),lng:Number(state.gps.lng)};
 const probe=depthProbeAtLatLng(pos);
 const speed=Number.isFinite(state.lastSogKn)?Number(state.lastSogKn):null;
 const rod=Math.max(1,Math.round(Number($('catchRod')?.value||1)));
 const lure=String($('catchLure')?.value||'').trim();
 const note=String($('catchNote')?.value||'').trim();
 const item={id:'c_'+Date.now(),created:new Date().toISOString(),lat:pos.lat,lng:pos.lng,depth:probe.ok&&Number.isFinite(probe.depth)?Number(probe.depth.toFixed(2)):null,depthTile:probe.tileId||null,depthError:probe.ok?null:probe.error,speedKn:Number.isFinite(speed)?Number(speed.toFixed(2)):null,rod,lure,note};
 state.catchLogs.unshift(item);
 saveCatchLogs();
 renderCatchLogs();
 if($('catchNote'))$('catchNote').value='';
 setStatus(`Fangst logget: stang ${rod}${Number.isFinite(item.depth)?` · ${item.depth.toFixed(1)} m DDM`:` · ${item.depthError||'mangler DDM-data'}`}${Number.isFinite(item.speedKn)?` · ${item.speedKn.toFixed(1)} kn`:''}.`);
}
function renderCatchLogs(){
 state.catchLayerGroup.clearLayers();
 state.hotspotLayerGroup.clearLayers();
 const catches=state.catchLogs.filter(c=>Number.isFinite(Number(c.lat))&&Number.isFinite(Number(c.lng)));
 if($('catchCount'))$('catchCount').textContent=String(catches.length);
 const clusters=clusterCatches(catches,0.08);
 const hotspotCount=clusters.filter(c=>c.items.length>1).length;
 if($('hotspotCount'))$('hotspotCount').textContent=String(hotspotCount);
 for(const cluster of clusters.filter(c=>c.items.length>1)){
  const radius=Math.min(34,12+cluster.items.length*3);
  L.circleMarker([cluster.lat,cluster.lng],{radius,pane:'routePane',color:'#ffcf54',weight:3,fillColor:'#ff5b6e',fillOpacity:.20,opacity:.9}).bindTooltip(`Hotspot · ${cluster.items.length} fangster`,{sticky:true}).addTo(state.hotspotLayerGroup);
 }
 for(const c of catches){
  L.marker([c.lat,c.lng],{zIndexOffset:760,icon:catchIcon(c)}).bindTooltip(catchTooltip(c),{sticky:true}).addTo(state.catchLayerGroup);
 }
 renderCatchList(catches);
}
function catchIcon(c){
 return L.divIcon({className:'catch-marker',html:`<div title="Fangst">★</div>`,iconSize:[26,26],iconAnchor:[13,13]});
}
function catchTooltip(c){
 const dt=c.created?new Date(c.created).toLocaleString('da-DK'):'ukendt tid';
 const depth=Number.isFinite(Number(c.depth))?`${Number(c.depth).toFixed(1)} m DDM`:'ukendt dybde';
 const speed=Number.isFinite(Number(c.speedKn))?`${Number(c.speedKn).toFixed(1)} kn`:'ukendt fart';
 const lure=c.lure?escapeHtml(c.lure):'agn ikke angivet';
 const note=c.note?`<br>${escapeHtml(c.note)}`:'';
 return `<strong>Fangst · stang ${escapeHtml(c.rod||'?')}</strong><br>${dt}<br>${depth} · ${speed}<br>${lure}${note}`;
}
function clusterCatches(catches,maxNm){
 const clusters=[];
 for(const c of catches){
  let hit=null;
  for(const cluster of clusters){
   if(directNm(c,cluster)<=maxNm){hit=cluster;break;}
  }
  if(hit){
   hit.items.push(c);
   hit.lat=hit.items.reduce((sum,x)=>sum+Number(x.lat),0)/hit.items.length;
   hit.lng=hit.items.reduce((sum,x)=>sum+Number(x.lng),0)/hit.items.length;
  }else clusters.push({lat:Number(c.lat),lng:Number(c.lng),items:[c]});
 }
 return clusters;
}
function renderCatchList(catches){
 const box=$('catchList');if(!box)return;
 box.innerHTML='';
 if(!catches.length){box.innerHTML='<div class="emptySaved">Ingen fangster logget endnu.</div>';return;}
 for(const c of catches.slice(0,6)){
  const card=document.createElement('div');
  card.className='savedCard catchCard';
  const depth=Number.isFinite(Number(c.depth))?`${Number(c.depth).toFixed(1)} m`:'ukendt dybde';
  const speed=Number.isFinite(Number(c.speedKn))?`${Number(c.speedKn).toFixed(1)} kn`:'ukendt fart';
  card.innerHTML=`<strong>★ Stang ${escapeHtml(c.rod||'?')}</strong><small>${new Date(c.created).toLocaleString('da-DK')} · ${depth} · ${speed}${c.lure?` · ${escapeHtml(c.lure)}`:''}</small><div class="savedActions"><button data-act="zoom">Vis</button><button data-act="del">Slet</button></div>`;
  card.querySelector('[data-act=zoom]').onclick=()=>map.setView([c.lat,c.lng],15);
  card.querySelector('[data-act=del]').onclick=()=>deleteCatchLog(c.id);
  box.appendChild(card);
 }
}
function deleteCatchLog(id){
 state.catchLogs=state.catchLogs.filter(c=>c.id!==id);
 saveCatchLogs();
 renderCatchLogs();
 setStatus('Fangst slettet.');
}

function defaultRouteName(route){return route?.mode==='free'?`Fri navigationsrute ${route.depth}m`:route?.mode==='sea-trout'?`Havørred · ${route.seaTrout?.zone||'DDM rute'}`:`${route?.depth??selectedDepth()}m DDM trollingrute`}
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
 const meta=r.mode==='free'?`Fri navigation · mål ${r.depth??'—'}m · min ${r.minDepth??'—'}m · ${Number(r.lengthNm||0).toFixed(2)} NM`:r.mode==='sea-trout'?`Havørred · ${r.seaTrout?.zone||'DDM'} · ${r.seaTrout?.speed||''} · ${Number(r.lengthNm||0).toFixed(2)} NM`:`TrollingMode · mål ${r.depth}m · DDM ${Number(r.actualDepth||r.depth).toFixed(1)}m · ${Number(r.lengthNm||0).toFixed(2)} NM`;
 return `<strong>${escapeHtml(r.name||'Rute')}</strong><small>${new Date(r.created).toLocaleString('da-DK')} · ${meta}</small><div class="savedActions"><button data-act="load">Vis</button><button data-act="nav">Navigér</button>${allowDelete?'<button data-act="del">Slet</button>':''}</div>`;
}
async function loadSavedRoute(r,startNow=false){
 if(r.mode==='free')setTrollingMode(false,true);else setTrollingMode(true,true);
 if(!Array.isArray(r.points)||r.points.length<2)return handleRoutingFailure('Gemt rute mangler route points.');
 const start=r.points[0],end=r.points[r.points.length-1];
 if(!await prepareRoutingGrid(start,end))return handleRoutingFailure(state.lastTileLoadError||'Manglende DDM tile-data på gemt rute.',{routingMode:r.mode||'saved',routingSource:'DDM grid',routingTileCount:state.routingTileIds.size,fallbackUsed:false});
 const opts=savedRouteValidationOptions(r);
 const validation=validateWaterPathDetailed(r.points,opts);
 if(!validation.ok)return handleRoutingFailure('Rute krydser land/ukendt DDM-data',{routingMode:r.mode||'saved',routingSource:'DDM grid',routingTileCount:state.routingTileIds.size,fallbackUsed:false,...validation.stats});
 state.currentRoute={...r};
 drawRoute(r.points,Number(r.actualDepth||r.depth),r.mode==='free'?`Fri navigationsrute · mål ${r.depth??'—'}m`:r.mode==='sea-trout'?`Havørred · ${r.seaTrout?.zone||'DDM rute'}`:undefined);
 logRoutingSuccess(state.currentRoute,'saved');
 if(r.points?.length){setStart(start);setEnd(end)}
 updateRouteActionButtons();
 if(startNow)startNavigation();else setStatus(`Viser gemt rute: ${r.name||'Rute'}`);
}
function savedRouteValidationOptions(r){
 const minDepth=Number.isFinite(Number(r.minDepth))?Number(r.minDepth):(r.mode==='free'?Number(r.depth||freeMinDepth()):(r.mode==='sea-trout'?2:0.4));
 return{mode:r.mode||'saved',targetDepth:Number(r.depth||minDepth),tolerance:Number(r.tolerance||selectedTolerance()),minDepth};
}
function deleteSavedRoute(r){state.savedRoutes=state.savedRoutes.filter(x=>x.id!==r.id);localStorage.setItem(STORAGE_KEY,JSON.stringify(state.savedRoutes));renderSavedRoutes()}
function toggleSavedTrollingRoutes(){const box=$('savedTrollingRoutes');if(!box)return;box.hidden=!box.hidden;renderSavedTrollingRoutes()}
function renderSavedTrollingRoutes(){
 const box=$('savedTrollingRoutes');
 if(!box)return;
 box.innerHTML='';
 const routes=state.savedRoutes.filter(r=>r.mode==='trolling'||r.mode==='sea-trout');
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
async function cleanupOldCaches(){if(!('caches' in window)) return;try{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('waternav-') && k!=='waternav-v46.0').map(k=>caches.delete(k)))}catch(e){console.warn('Cache cleanup failed',e)}}
function inferCogFromGps(prev,next){
 if(!prev||!next)return NaN;
 const dt=((next.time||Date.now())-(prev.time||Date.now()))/1000;
 const dist=directNm(prev,next);
 // Avoid noisy course changes when stationary or GPS barely moved.
 if(!Number.isFinite(dt)||dt<=0||dist<0.003)return NaN;
 return bearingDeg(prev,next);
}
function directNm(a,b){const R=6371000,lat1=a.lat*Math.PI/180,lat2=b.lat*Math.PI/180,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return (2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)))/1852}
function bearingDeg(a,b){const lat1=a.lat*Math.PI/180,lat2=b.lat*Math.PI/180,lng1=a.lng*Math.PI/180,lng2=b.lng*Math.PI/180;const y=Math.sin(lng2-lng1)*Math.cos(lat2);const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lng2-lng1);return (Math.atan2(y,x)*180/Math.PI+360)%360}
function destinationPoint(p,bearing,nm){const R=6371000,d=nm*1852,delta=d/R,theta=bearing*Math.PI/180,lat1=p.lat*Math.PI/180,lng1=p.lng*Math.PI/180;const lat2=Math.asin(Math.sin(lat1)*Math.cos(delta)+Math.cos(lat1)*Math.sin(delta)*Math.cos(theta));const lng2=lng1+Math.atan2(Math.sin(theta)*Math.sin(delta)*Math.cos(lat1),Math.cos(delta)-Math.sin(lat1)*Math.sin(lat2));return{lat:lat2*180/Math.PI,lng:((lng2*180/Math.PI+540)%360)-180}}
function pathNm(points){let s=0;for(let i=1;i<points.length;i++)s+=directNm(points[i-1],points[i]);return s}
function simplify(points,tol){if(points.length<3)return points;const out=[points[0]];let last=points[0];for(let i=1;i<points.length-1;i++){if(Math.abs(points[i].lat-last.lat)+Math.abs(points[i].lng-last.lng)>tol){out.push(points[i]);last=points[i]}}out.push(points[points.length-1]);return out}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
