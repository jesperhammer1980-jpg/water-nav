# WaterNav Pilot v46.2

## Ændringer i v46.2

Denne bugfix-release retter ruteoprettelse på tablet uden nye featureområder.

### Rettet
- Hovedkortet viser nu tydelig rute-debug: startpunkt, slutpunkt, GPS, DDM manifest, synlige DDM tiles og routing status.
- `Lav rute` er klikbar nok til at vise konkret fejl i stedet for at være tavst disabled, når manifest/start/slut mangler.
- Hovedpanelets `Vælg start`, `Vælg slut` og `GPS som start` planlægger almindelig fri rute; Trolling-menuens egne knapper bevarer trolling-flowet.
- Ruteoprettelse viser konkrete fejl for `Mangler startpunkt`, `Mangler slutpunkt`, `Mangler GPS-position`, `DDM manifest ikke klar`, `Mangler DDM tiles` og `Ingen sikker vandrute fundet`.

### Testet fokus
- Start-/slutmarkører via kortvalg.
- Manuel fri DDM-rute uden GPS.
- `Navigér hertil` guard uden GPS.
- TrollingMode `Find Lynæs-rute`.

# WaterNav Pilot v46.1

## Ændringer i v46.1

Denne bugfix-release fokuserer på praktisk tabletbrug uden nye featureområder.

### Rettet
- Fast `Følg GPS`-knap ligger direkte på hovedkortet og viser `Aktiv`, `Pauset` eller `Venter på GPS`.
- Manuel pan/zoom pauser follow-state, og `Følg GPS` aktiverer igen auto-follow uden at nulstille aktiv rute, TrollingMode, hjemhavn, tracklog eller DDM tile-cache.
- Kortklik, long press og rutevalg bruger korrekt kortpunkt i både Nord op og Sejlretning op.
- `Navigér hertil` kræver rigtig GPS-position og viser `Mangler GPS-position` i stedet for skjult fallback fra kortcentrum.
- `Lav rute` validerer start/slut før eksisterende rute ryddes og viser konkrete fejl som `Mangler startpunkt`, `Mangler slutpunkt`, `Mangler DDM-data` og `Ingen sikker vandrute fundet`.

### Testet fokus
- DDM manifest og synlige DDM tiles.
- Fast `Følg GPS`-knap uden GPS og route-flow uden skjult reset.
- Lokal Vercel build med public DDM manifest og tile-filer.

# WaterNav Pilot v46.0

## Ændringer i v46.0

Denne release erstatter de tidligere generiske Havørred-forslag med én DDM-beregnet profil: `Lynæs Sommerhavørred 2,5 timer`.

### Nyt
- TrollingMode har nu profilen `Lynæs Sommerhavørred 2,5 timer` med start/slut i Lynæs Havn, target distance ca. 6.0 NM, standardfart 2,4 knob og forventet tid ca. 2,5 timer.
- Profilen prioriterer Hundested-skrænten, Hundested Fyr, Skansehage og Isefjord-mundingen ud fra eksisterende DDM depth/routing tiles.
- Bådruten beregnes og valideres mod DDM-data; ingen screenshots eller hardcodede pæne rute-streger bruges som routingdata.
- Havørred-ruten afvises, hvis der mangler DDM-data, hvis et segment rammer land/ukendt data, eller hvis ruten går under 2 m DDM-dybde.
- Trollingfartsassistent viser aktuel fart mod målfart 2,4 knob: for langsomt under 2,2 knob, perfekt ved 2,2-2,6 knob og for hurtigt over 2,6 knob.
- Fangstlog kan gemme fangster på GPS-position med dato/tid, fart, DDM-dybde, stangnummer, agn/farve og note.
- Fangster vises som stjerner på kortet, og flere fangster tæt på hinanden vises som hotspots.

### Testet fokus
- DDM manifest og synlige DDM depth/contour/routing tiles.
- `Lynæs Sommerhavørred 2,5 timer`: route source `DDM grid`, komplet rute, 6.00 NM, minimum DDM-dybde over 2 m og ingen failed tiles i standardområdet.
- Trollingfartsassistent uden GPS og fangstlog-guard uden GPS.
- Lokal Vercel build med DDM manifest og referenced tile-filer.

# WaterNav Pilot v45.9

## Ændringer i v45.9

Denne release gør WaterNav mere brugbar som Android-tablet/plotter og tilføjer DDM-beregnet Havørred Trolling Mode uden hardcodede ruter eller placeholder-data.

### Nyt
- Settings har nu `Hold skærmen tændt under navigation`, som bruger Screen Wake Lock API under aktiv navigation og viser `Wake Lock: Aktiv / Ikke understøttet / Fejl`.
- Settings har nu `Fuld skærm`, som kalder browserens fullscreen API og viser `Fuld skærm: Aktiv / Ikke aktiv / Ikke understøttet`.
- Aktiv navigation skifter til et mere plotter-agtigt layout, hvor kortet får mere plads, vigtig fart/kurs/ETA/afstand/dybde/ruteinfo bliver synlig, og et korttryk kan vise/skjule menuen.
- PWA-manifestet er opdateret til fullscreen/standalone, korrekt start/scope, theme/background og 192x192/512x512 ikoner.
- TrollingMode har nu Havørred-valg for måned, tidspunkt og fiskemetode samt en `Find rute`-funktion for Lynæs/Hundested/Isefjord-mundingen.

### Havørred-routing
- Havørred-ruter bygges oven på den eksisterende DDM water-only A*-routing og bruger kun indlæste DDM depth/contour/routing-data.
- Ruteforslag vælger DDM-baserede ankerpunkter i zonerne Skansehage/Hundested, Isefjord-mundingen, Rørvig/Korshage og Nakkehage og beregner zig-zag/S-forløb over dybdekanter.
- Bådruten afvises, hvis nødvendige DDM-data mangler, eller hvis segmentvalidering finder land, ukendt DDM-data eller vand under sikker dybde.
- Output viser anbefalet fart, vanddybde, agndybde, setup, retning og vendepunkter.

### Testet fokus
- Wake Lock-status, fullscreen-status, PWA-manifest/ikoner og service worker cache-version.
- DDM manifest, synlig tile-loading, route-layer, hjemhavn, Centrér GPS og eksisterende TrollingMode.
- Havørred Trolling Mode med DDM-data og afvisning ved manglende DDM-data.

## Ændringer i v45.8

Denne bugfix-release retter UTF-8-visning, popup-rotation i sejlretning-op og Vercel build-output uden nye UI-features.

### Rettet
- App shell, app-kode, README og DDM tile-generator er gemt som UTF-8, og UI-tekst med `æ`, `ø`, `å` og `é` vises korrekt igen.
- Kortklik-popup ligger ikke længere i et roteret Leaflet-pane, så popup-menuen står vandret i både nord-op og sejlretning-op.
- 1/2/3 NM kurslinje-labels bliver fortsat modroteret via `--waternav-counter-rotation`, så de er vandrette, mens kort-/route-/tooltip-lag roterer.
- Vercel build-scriptet `tools/prepare-vercel-public.js` er genskabt/strammet op og validerer, at `public/data/tiles/ddm-tile-manifest.json` samt referenced depth/contour tiles er med i build-output.
- Version/cache-busting er opdateret til v45.8 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- Lokal `npm run vercel-build` kopierer og validerer DDM manifest, depth tiles og contour tiles.
- App-start med DDM manifest, synlige DDM tiles, popup, kurslinje-labels, hjemhavn, Centrér GPS og rute-flow er regressionstestet.

## Ændringer i v45.7

Denne version stopper route smoothing midlertidigt og strammer land/ukendt DDM-collision, så et ruteben ikke kan godkendes, hvis det krydser land, manglende DDM-data eller valgt minimumsdybde.

### Rettet
- `Ruteudjævning` tvinges til `Fra`; tidligere gemte `Normal`/`Høj` settings ignoreres, indtil land-collision er færdigvalideret.
- Efter A* valideres hvert ruteben med tæt sampling og DDM depth-test.
- Segment-sampling bruger den eksisterende fine DDM-gridfil `data/depth-grid-ddm.json` som ekstra collision-grid i Isefjord/Hundested/Lynæs/Rørvig-området.
- Hvis et ruteben fejler, godkendes eller tegnes ruten ikke som aktiv rute.
- Routingfejl viser `Rute krydser land/ukendt DDM-data` og debug viser invalid segment index, segment start/slut, første ugyldige koordinat og depth/årsag.
- Gemte ruter valideres med samme land/depth-test før de kan vises eller startes.
- Version/cache-busting er opdateret til v45.7 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- Holbæk/Isefjord-området
- Hundested/Rørvig
- Lynæs/Holbæk
- Smoothing er slået fra, og `Original route points` = `Smoothed route points` i testede gyldige ruter.

## Ændringer i v45.6

Denne version tilføjer sikker route smoothing oven på den eksisterende DDM/A*-routing uden at ændre routingmotorens water-only regler.

### Rettet
- A* og DDM-grid bruges uændret som cost graph; smoothing køres først efter en komplet rute er fundet og valideret.
- Ny indstilling `Ruteudjævning`: `Fra`, `Normal`, `Høj`.
- `Normal` bruger line-of-sight simplification: et mellem-punkt fjernes kun, hvis segmentet mellem nabopunkter er valideret som sejlbart DDM-vand.
- `Høj` bruger line-of-sight simplification plus valideret spline interpolation. Kurvesegmenter accepteres kun, hvis de stadig holder sig i sejlbare DDM-celler.
- Smoothing falder tilbage til en sikker rute, hvis et segment ville krydse land, for lav dybde eller manglende DDM-data.
- Debug viser `Original route points`, `Smoothed route points` og `Reduction`.
- Version/cache-busting er opdateret til v45.6 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- Holbæk → Isefjord
- Hundested → Rørvig
- Lynæs → Holbæk
- Alle smoothing-resultater valideres med samme DDM water-only segment-check som ruten.

## Ændringer i v45.5

Denne version retter routingmotoren, så ruten vises fra den faktiske A*-sti gennem DDM-gridcellerne og ikke kollapses til lange rette segmenter.

### Rettet
- `simplifyWaterSafe()` bruges ikke længere til aktiv routing-output; ruten tegnes fra den fulde A*-cellekæde.
- A* logger og debugviser route point count, visited grid cells, routing tiles, routing mode, routing source, grid resolution og fallback-status.
- Efter A* valideres at ruten faktisk når destination-node, har mere end 2 punkter, er sammenhængende og slutter tæt på destinationen.
- Delvise ruter tegnes ikke som gyldige aktive ruter. Ved ufuldstændig routing vises `Ruten kunne ikke føres helt til destinationen`, og navigation kan ikke starte.
- Coarse Danmark-tiles bruger DDM-vandcellen som graph node, mens fine grids stadig kan bruge 3x3-clearance. Det undgår at Holbæk og smalle fjorde blokeres kunstigt på 416 m Danmark-gridet.
- Version/cache-busting er opdateret til v45.5 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- Holbæk → Isefjord: DDM grid, fallback false, 4 routing tiles, 252 visited cells, 59 route points, route complete true.
- Hundested → Rørvig: DDM grid, fallback false, 4 routing tiles, 57 visited cells, 15 route points, route complete true.
- Lynæs → Hundested: DDM grid, fallback false, 4 routing tiles, 31 visited cells, 13 route points, route complete true.
- Navigér hjem test: DDM grid, fallback false, 4 routing tiles, 960 visited cells, 59 route points, route complete true.

## Ændringer i v45.4

Denne version retter rutevisningen, så en beregnet rute ikke kan forsvinde visuelt bag DDM-kurver eller ende uden synlig debugstatus.

### Rettet
- Aktiv rute tegnes nu i et dedikeret Leaflet route-pane over DDM-kurverne.
- Ruten tegnes med rød halo og tydelig cyan linje, og appen zoomer til route bounds efter beregning.
- Start- og slutmarkører får højere z-index og bringes foran, når de vælges.
- Routing logger success/failure med route point count, distance og layer visible.
- Navigation-panelet viser `Aktiv rute`, `Route points`, `Distance`, `Layer visible` og konkret routing-status.
- Routingfejl viser nu konkret status som `Ingen vandrute fundet` eller `Manglende DDM tile...` i stedet for stilhed.
- Version/cache-busting er opdateret til v45.4 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

## Ændringer i v45.3

Denne version retter den konkrete tile-fejl efter manifest-load: manifestet kunne hentes, men Vercel deployede ikke de referenced depth/contour tile-filer på `/data/tiles/...`.

### Rettet
- Tile-loaderen logger nu hver fejlet DDM tile med filnavn, fetch-URL og konkret HTTP-/parse-status.
- Progress/status viser konkret `Tile fejl: <fil> · <status>` i stedet for kun en generisk warning.
- Settings viser DDM debugstatus: manifest OK, depth/contour antal, loaded, failed og sidste fejl.
- Vercel build-step kopierer app shell og hele `data/` til `public/`, så `data/tiles/ddm-tile-manifest.json`, depth tiles og contour tiles deployes på den sti appen faktisk bruger.
- Version/cache-busting er opdateret til v45.3 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- Lokalt manifest refererer 89 depth tiles og 88 contour tiles, og alle referenced filer findes fysisk.
- `public/data/tiles` indeholder manifest, depth tiles og contour tiles før deploy.
- Direkte Vercel URL'er for manifest og referenced tile-filer returnerer JSON/GeoJSON.
- `Opdater synligt område` skal ende med Loaded > 0 og Failed = 0 på standardområdet.

## Ændringer i v45.2

Denne version sikrer, at DDM tile-manifestet fysisk ligger på den sti appen forventer, og at releasepakken indeholder manifest, depth tiles og contour tiles.

### Rettet
- Appen forventer fortsat manifest på `./data/tiles/ddm-tile-manifest.json`.
- `tools/generate-ddm-tiles.js` regenererer manifestet direkte til `data/tiles/ddm-tile-manifest.json`.
- Manifest-fejl viser nu både forventet sti og konkret fetch-URL, så 404 kan skelnes fra parse-/formatfejl.
- Version/cache-busting er opdateret til v45.2 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Flowstatus
- `Vælg start` og `Vælg slut` lukker menu/modal og sætter appen i kortvalg-mode.
- `Ryd rute` rydder aktiv rute, start/slut og navigation uden at slette hjemhavn, settings, gemte ruter eller DDM tile-cache.
- Trolling-menuen er fortsat fokuseret på trollingdybde, tolerance, gem/vælg trollingrute, vend retning og start/stop trolling.
- Gem rute bruger nu en in-app dialog i stedet for browserens native `prompt()`, så PWA-flowet kan bruges og testes stabilt.
- Stop-knapperne kalder nu `stopNavigation()` eksplicit, så statuslinjen viser `Navigation stoppet.` efter stop.

### Testet fokus
- Manifest fetch fra `http://127.0.0.1:5173/data/tiles/ddm-tile-manifest.json`.
- Hard refresh efter cache/service worker-rydning.
- Settings viser `DDM manifest: indlæst`, `Depth tiles 89`, `Contour tiles 88`.
- `Opdater synligt område` loader faktiske DDM tiles og opdaterer tile-cache.
- `Opdater synligt område` viste reel progress fra `Indlæser DDM-kortdata: 0%` til `DDM-kortdata klar`.
- TrollingMode: vælg start/slut på kort uden GPS, lav 3.65 NM DDM-rute, vend retning, start/stop trolling, gem/vælg gemt trollingrute og ryd rute.
- Fri navigation: vælg start/slut på kort uden GPS, lav 3.47 NM water-only rute, start/stop navigation, `Navigér hertil` og `Navigér hjem`.
- `Ryd rute` blev testet med gemt trollingrute, hjemhavn og DDM tile-cache aktiv; kun aktiv rute/navigation blev ryddet.

## Ændringer i v44.0

Denne version retter manifest-flowet, så appen ikke kan forsøge at loade tiles eller lave rute, før DDM tile-manifestet er validt indlæst.

### Rettet
- Manifestfilen forventes på `./data/tiles/ddm-tile-manifest.json`.
- Opstart viser `DDM manifest: indlæser...`, `DDM manifest: indlæst` eller en konkret fejl med forventet sti, HTTP-status, parse error, tomt manifest eller forkert format.
- Settings → Kortområder viser manifeststatus, forventet sti, `Depth tiles: X`, `Contour tiles: Y` og tile-cache.
- `Genindlæs synlige DDM tiles`, `Opdater synligt område` og `Lav rute` er disabled, indtil manifestet er klar.
- Hvis en handling kaldes før manifestet er klar, vises en konkret fejlbesked med forventet manifeststi.
- `Opdater synligt område` finder tiles fra aktuelle map bounds, henter depth/contour tiles, opdaterer cachetæller og bruger den reelle tile-loader progress.

### Testet fokus
- Manifest fetch/parse/format mod `data/tiles/ddm-tile-manifest.json`.
- Hard refresh efter service worker/cache-rydning.
- Opdater synligt område fra `0 depth / 0 contour` til faktiske cachetal.
- Rute, GPS-status, hjemhavn og TrollingMode bevares ved tile-refresh.

## Ændringer i v43.0

Denne version retter DDM progress, så procenten kommer fra de faktiske tile-loaderfunktioner, ikke kun fra en statisk batch-besked.

### Rettet
- `loadDepthTile()` og `loadContourTile()` registrerer nu progress, når en reel tile fetch starter eller en allerede igangværende tile-load tilkobles.
- `loadedTiles` øges først, når tile-filen er fetched, JSON-parsed og lagt i den relevante loaded tile-cache.
- Depth/routing tiles og contour tiles tælles i samme progress-session, når de loader for synligt kortområde.
- Routing grid/depth tiles tælles også i samme progress-system ved ruteberegning.
- Ved fejl tælles tile som færdig, procenten går videre, og UI viser `Nogle DDM-kortdata kunne ikke indlæses`.

### UI
- Progress vises som overlay med `Indlæser DDM-kortdata: 0%` ved start.
- Ved 100% vises `DDM-kortdata klar`, og overlay skjules efter et kort delay.

### Bevaret
- Progress påvirker ikke rute, navigation, GPS, hjemhavn, gemte ruter eller TrollingMode.

## Ændringer i v42.0

Denne version tilføjer synlig progress/status under dynamisk DDM tile-loading, så brugeren kan se, at kortdata hentes for synligt kortområde eller ruteberegning.

### Tilføjet
- Topstatus viser `Indlæser DDM-kortdata: XX%`, mens nødvendige depth/routing/contour tiles hentes.
- Progressbar opdateres løbende ud fra `loadedTiles / totalTiles`.
- Allerede indlæste tiles tæller med i procenten, og baren skjules først, når alle nødvendige tiles enten er loaded eller fejlet.
- Hvis en eller flere tiles fejler, vises `Nogle kortdata kunne ikke indlæses`.

### Bevaret
- Progress-state ændrer ikke rute, navigation, GPS, hjemhavn, gemte ruter eller TrollingMode.
- DDM tile-arkitektur, water-only routing og TrollingMode fra v41 er bevaret.

### Testet fokus
- Synligt kortområde med flere depth/contour tiles.
- Ruteberegning med flere route/depth tiles.
- `Ryd rute` og eksisterende brugerdata-state påvirkes ikke af tile-progress.

## Ændringer i v41.0

Denne version skifter Danmark-dækningen fra store runtime-filer til DDM tiles, så browseren ikke indlæser én samlet Denmark GeoJSON eller decoder hele Denmark routing-grid ved app-start.

### Tilføjet
- `data/tiles/ddm-tile-manifest.json` med installerede DDM depth/routing-tiles og contour-tiles.
- Dynamisk loading af tiles for synligt kortområde via Leaflet `moveend/zoomend`.
- Multi-tile water-only routing: før A* starter, hentes DDM depth-tiles for ruteområdet, så længere ture kan gå på tværs af tiles.
- `Settings → Kortområder` viser installerede regioner, loaded tile-cache og forberedt “Download senere”-flow.
- Regioner i manifestet: Isefjord/Hundested/Lynæs/Rørvig, Kattegat, Øresund, Storebælt, Lillebælt, Limfjorden og Bornholm.

### Datagrundlag
- Tiles er genereret med `tools/generate-ddm-tiles.js`.
- Kildeartefakterne er de eksisterende DDM-afledte filer fra `ddm_50m.dybde.tiff`: `data/depth-grid-ddm-denmark-rle.json`, `data/contours-local.geojson` og `data/contours-denmark-coarse.geojson`.
- Ingen placeholder-/demo-dybder er brugt i v41.
- Service worker precacher kun app-shell, manifest og verifikationsfiler; depth/contour tiles caches on-demand.

### Testet fokus
- App-start loader kun tile-manifest + synlige tiles.
- Fri navigation og TrollingMode bevarer DDM water-only routing.
- Ruter uden for det gamle lokalområde kan beregnes ved at hente flere DDM tiles.

## Ændringer i v40.0

Denne version retter ruteplanlægningsflowet, så kortvalg og menu-flow fungerer uden GPS, og så Trolling-menuen kun viser trollingrelevante valg.

### Rettet
- `Vælg start` og `Vælg slut` lukker popup/modal, sætter appen i kortvalg-mode og lader brugeren klikke punktet direkte på kortet.
- Manuel start/slut fungerer uden GPS og bevarer DDM water-only routing.
- `Navigér hertil` og `Navigér hjem` bruger fri navigation med DDM water-only routing i stedet for utilsigtet TrollingMode.
- `Ryd rute` rydder kun aktiv rute, start/slut og navigation. Hjemhavn, settings og gemte ruter bevares.

### Tilføjet
- Fri navigation er flyttet til Navigation-sektionen med egen minimumsdybde.
- Trolling-menuen er forenklet til trollingdybde, tolerance, start/slut for trollingstræk, gem/vælg trollingrute, vend retning og start/stop trolling.
- Trolling-menuen viser en filtreret liste over gemte trollingruter.

### Datagrundlag
- v40 bruger samme faktiske DDM 2024-data som v38/v39.
- Ingen placeholder-/demo-dybder er brugt i v40.

## Ændringer i v39.0

Denne version retter læsbarhed i sejlretning-op og tilføjer en ren GPS-centrering uden at nulstille rute, navigation, TrollingMode eller hjemhavn.

### Rettet
- 1/2/3 NM kurslinje-labels modroteres i sejlretning-op, så de altid står vandret.
- Kortklik-popupens menu modroteres i sejlretning-op, så popup-UI forbliver læsbar.
- Skift til sejlretning-op håndterer også COG 0° uden at springe rotationsstatus over.

### Tilføjet
- `Centrér GPS` i hovedpanelet. Knappen panorerer kun kortet til aktuel GPS-position og ændrer ikke brugerdata, rutevalg, navigationstilstand eller hjemhavn.

### Datagrundlag
- v39 bruger samme faktiske DDM 2024-data som v38.
- Ingen placeholder-/demo-dybder er brugt i v39.

## Ændringer i v38.0

Denne version er første rigtige skridt mod længere ture og Danmark-dækning baseret på de faktiske DDM-data, som brugeren uploadede.

### Tilføjet
- Danmark-dækkende DDM coarse routing-grid genereret fra `ddm_50m.dybde.tiff`.
- Eksisterende Hundested/Lynæs/Rørvig område bevares som højere opløst lokalt grid.
- Appen vælger automatisk lokalt grid, når start/slut ligger i lokalområdet.
- Appen falder tilbage til Danmark-grid, når man planlægger længere ruter uden for lokalområdet.
- Coarse Danmark-dybdekurver til oversigtsvisning.
- Kort-klik, Navigér hjem, Trolling-menu, gemte ruter, hjemhavn, kurslinje og ETA bevares.

### Datagrundlag
- Kilde: Danmarks Dybdemodel 2024, `ddm_50m.dybde.tiff`.
- Lokalt grid: ca. 0.001° for Hundested/Lynæs/Rørvig.
- Danmark-grid: ca. 0.005° til længere ture og bredere dækning.
- Ingen placeholder-/demo-dybder er brugt i v38.

### Vigtigt
DDM-data er bathymetrisk modeldata og må ikke bruges som eneste sikkerhedsnavigation. Brug altid officielle søkort, lokalkendskab og almindeligt sømandskab.

## Filer
- `data/depth-grid-ddm.json` — lokalt højere opløst DDM-grid.
- `data/depth-grid-ddm-denmark-rle.json` — Danmark-dækkende coarse DDM-grid, RLE-komprimeret.
- `data/contours-local.geojson` — lokale DDM-contours.
- `data/contours-denmark-coarse.geojson` — coarse DDM-contours til større område.
- `data/tiles/ddm-tile-manifest.json` — runtime manifest for DDM tiles.
- `data/tiles/depth/*.json` — RLE-komprimerede DDM depth/routing-tiles.
- `data/tiles/contours/*.geojson` — geografisk klippede DDM contour-tiles.
- `data/ddm-tile-verification.json` — tile-counts, regionstatus og celle-counts.
- `tools/generate-ddm-tiles.js` — generator for DDM tile-arkitekturen.
