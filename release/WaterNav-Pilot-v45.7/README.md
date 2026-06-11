# WaterNav Pilot v45.7

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

## Ã†ndringer i v45.6

Denne version tilfÃ¸jer sikker route smoothing oven pÃ¥ den eksisterende DDM/A*-routing uden at Ã¦ndre routingmotorens water-only regler.

### Rettet
- A* og DDM-grid bruges uÃ¦ndret som cost graph; smoothing kÃ¸res fÃ¸rst efter en komplet rute er fundet og valideret.
- Ny indstilling `RuteudjÃ¦vning`: `Fra`, `Normal`, `HÃ¸j`.
- `Normal` bruger line-of-sight simplification: et mellem-punkt fjernes kun, hvis segmentet mellem nabopunkter er valideret som sejlbart DDM-vand.
- `HÃ¸j` bruger line-of-sight simplification plus valideret spline interpolation. Kurvesegmenter accepteres kun, hvis de stadig holder sig i sejlbare DDM-celler.
- Smoothing falder tilbage til en sikker rute, hvis et segment ville krydse land, for lav dybde eller manglende DDM-data.
- Debug viser `Original route points`, `Smoothed route points` og `Reduction`.
- Version/cache-busting er opdateret til v45.6 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- HolbÃ¦k â†’ Isefjord
- Hundested â†’ RÃ¸rvig
- LynÃ¦s â†’ HolbÃ¦k
- Alle smoothing-resultater valideres med samme DDM water-only segment-check som ruten.

## Ã†ndringer i v45.5

Denne version retter routingmotoren, sÃ¥ ruten vises fra den faktiske A*-sti gennem DDM-gridcellerne og ikke kollapses til lange rette segmenter.

### Rettet
- `simplifyWaterSafe()` bruges ikke lÃ¦ngere til aktiv routing-output; ruten tegnes fra den fulde A*-cellekÃ¦de.
- A* logger og debugviser route point count, visited grid cells, routing tiles, routing mode, routing source, grid resolution og fallback-status.
- Efter A* valideres at ruten faktisk nÃ¥r destination-node, har mere end 2 punkter, er sammenhÃ¦ngende og slutter tÃ¦t pÃ¥ destinationen.
- Delvise ruter tegnes ikke som gyldige aktive ruter. Ved ufuldstÃ¦ndig routing vises `Ruten kunne ikke fÃ¸res helt til destinationen`, og navigation kan ikke starte.
- Coarse Danmark-tiles bruger DDM-vandcellen som graph node, mens fine grids stadig kan bruge 3x3-clearance. Det undgÃ¥r at HolbÃ¦k og smalle fjorde blokeres kunstigt pÃ¥ 416 m Danmark-gridet.
- Version/cache-busting er opdateret til v45.5 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- HolbÃ¦k â†’ Isefjord: DDM grid, fallback false, 4 routing tiles, 252 visited cells, 59 route points, route complete true.
- Hundested â†’ RÃ¸rvig: DDM grid, fallback false, 4 routing tiles, 57 visited cells, 15 route points, route complete true.
- LynÃ¦s â†’ Hundested: DDM grid, fallback false, 4 routing tiles, 31 visited cells, 13 route points, route complete true.
- NavigÃ©r hjem test: DDM grid, fallback false, 4 routing tiles, 960 visited cells, 59 route points, route complete true.

## Ã†ndringer i v45.4

Denne version retter rutevisningen, sÃ¥ en beregnet rute ikke kan forsvinde visuelt bag DDM-kurver eller ende uden synlig debugstatus.

### Rettet
- Aktiv rute tegnes nu i et dedikeret Leaflet route-pane over DDM-kurverne.
- Ruten tegnes med rÃ¸d halo og tydelig cyan linje, og appen zoomer til route bounds efter beregning.
- Start- og slutmarkÃ¸rer fÃ¥r hÃ¸jere z-index og bringes foran, nÃ¥r de vÃ¦lges.
- Routing logger success/failure med route point count, distance og layer visible.
- Navigation-panelet viser `Aktiv rute`, `Route points`, `Distance`, `Layer visible` og konkret routing-status.
- Routingfejl viser nu konkret status som `Ingen vandrute fundet` eller `Manglende DDM tile...` i stedet for stilhed.
- Version/cache-busting er opdateret til v45.4 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

## Ã†ndringer i v45.3

Denne version retter den konkrete tile-fejl efter manifest-load: manifestet kunne hentes, men Vercel deployede ikke de referenced depth/contour tile-filer pÃ¥ `/data/tiles/...`.

### Rettet
- Tile-loaderen logger nu hver fejlet DDM tile med filnavn, fetch-URL og konkret HTTP-/parse-status.
- Progress/status viser konkret `Tile fejl: <fil> Â· <status>` i stedet for kun en generisk warning.
- Settings viser DDM debugstatus: manifest OK, depth/contour antal, loaded, failed og sidste fejl.
- Vercel build-step kopierer app shell og hele `data/` til `public/`, sÃ¥ `data/tiles/ddm-tile-manifest.json`, depth tiles og contour tiles deployes pÃ¥ den sti appen faktisk bruger.
- Version/cache-busting er opdateret til v45.3 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Testet fokus
- Lokalt manifest refererer 89 depth tiles og 88 contour tiles, og alle referenced filer findes fysisk.
- `public/data/tiles` indeholder manifest, depth tiles og contour tiles fÃ¸r deploy.
- Direkte Vercel URL'er for manifest og referenced tile-filer returnerer JSON/GeoJSON.
- `Opdater synligt omrÃ¥de` skal ende med Loaded > 0 og Failed = 0 pÃ¥ standardomrÃ¥det.

## Ã†ndringer i v45.2

Denne version sikrer, at DDM tile-manifestet fysisk ligger pÃ¥ den sti appen forventer, og at releasepakken indeholder manifest, depth tiles og contour tiles.

### Rettet
- Appen forventer fortsat manifest pÃ¥ `./data/tiles/ddm-tile-manifest.json`.
- `tools/generate-ddm-tiles.js` regenererer manifestet direkte til `data/tiles/ddm-tile-manifest.json`.
- Manifest-fejl viser nu bÃ¥de forventet sti og konkret fetch-URL, sÃ¥ 404 kan skelnes fra parse-/formatfejl.
- Version/cache-busting er opdateret til v45.2 for `index.html`, `app.js`, `manifest.json`, `sw.js` og DDM tile-manifestet.

### Flowstatus
- `VÃ¦lg start` og `VÃ¦lg slut` lukker menu/modal og sÃ¦tter appen i kortvalg-mode.
- `Ryd rute` rydder aktiv rute, start/slut og navigation uden at slette hjemhavn, settings, gemte ruter eller DDM tile-cache.
- Trolling-menuen er fortsat fokuseret pÃ¥ trollingdybde, tolerance, gem/vÃ¦lg trollingrute, vend retning og start/stop trolling.
- Gem rute bruger nu en in-app dialog i stedet for browserens native `prompt()`, sÃ¥ PWA-flowet kan bruges og testes stabilt.
- Stop-knapperne kalder nu `stopNavigation()` eksplicit, sÃ¥ statuslinjen viser `Navigation stoppet.` efter stop.

### Testet fokus
- Manifest fetch fra `http://127.0.0.1:5173/data/tiles/ddm-tile-manifest.json`.
- Hard refresh efter cache/service worker-rydning.
- Settings viser `DDM manifest: indlÃ¦st`, `Depth tiles 89`, `Contour tiles 88`.
- `Opdater synligt omrÃ¥de` loader faktiske DDM tiles og opdaterer tile-cache.
- `Opdater synligt omrÃ¥de` viste reel progress fra `IndlÃ¦ser DDM-kortdata: 0%` til `DDM-kortdata klar`.
- TrollingMode: vÃ¦lg start/slut pÃ¥ kort uden GPS, lav 3.65 NM DDM-rute, vend retning, start/stop trolling, gem/vÃ¦lg gemt trollingrute og ryd rute.
- Fri navigation: vÃ¦lg start/slut pÃ¥ kort uden GPS, lav 3.47 NM water-only rute, start/stop navigation, `NavigÃ©r hertil` og `NavigÃ©r hjem`.
- `Ryd rute` blev testet med gemt trollingrute, hjemhavn og DDM tile-cache aktiv; kun aktiv rute/navigation blev ryddet.

## Ã†ndringer i v44.0

Denne version retter manifest-flowet, sÃ¥ appen ikke kan forsÃ¸ge at loade tiles eller lave rute, fÃ¸r DDM tile-manifestet er validt indlÃ¦st.

### Rettet
- Manifestfilen forventes pÃ¥ `./data/tiles/ddm-tile-manifest.json`.
- Opstart viser `DDM manifest: indlÃ¦ser...`, `DDM manifest: indlÃ¦st` eller en konkret fejl med forventet sti, HTTP-status, parse error, tomt manifest eller forkert format.
- Settings â†’ KortomrÃ¥der viser manifeststatus, forventet sti, `Depth tiles: X`, `Contour tiles: Y` og tile-cache.
- `GenindlÃ¦s synlige DDM tiles`, `Opdater synligt omrÃ¥de` og `Lav rute` er disabled, indtil manifestet er klar.
- Hvis en handling kaldes fÃ¸r manifestet er klar, vises en konkret fejlbesked med forventet manifeststi.
- `Opdater synligt omrÃ¥de` finder tiles fra aktuelle map bounds, henter depth/contour tiles, opdaterer cachetÃ¦ller og bruger den reelle tile-loader progress.

### Testet fokus
- Manifest fetch/parse/format mod `data/tiles/ddm-tile-manifest.json`.
- Hard refresh efter service worker/cache-rydning.
- Opdater synligt omrÃ¥de fra `0 depth / 0 contour` til faktiske cachetal.
- Rute, GPS-status, hjemhavn og TrollingMode bevares ved tile-refresh.

## Ã†ndringer i v43.0

Denne version retter DDM progress, sÃ¥ procenten kommer fra de faktiske tile-loaderfunktioner, ikke kun fra en statisk batch-besked.

### Rettet
- `loadDepthTile()` og `loadContourTile()` registrerer nu progress, nÃ¥r en reel tile fetch starter eller en allerede igangvÃ¦rende tile-load tilkobles.
- `loadedTiles` Ã¸ges fÃ¸rst, nÃ¥r tile-filen er fetched, JSON-parsed og lagt i den relevante loaded tile-cache.
- Depth/routing tiles og contour tiles tÃ¦lles i samme progress-session, nÃ¥r de loader for synligt kortomrÃ¥de.
- Routing grid/depth tiles tÃ¦lles ogsÃ¥ i samme progress-system ved ruteberegning.
- Ved fejl tÃ¦lles tile som fÃ¦rdig, procenten gÃ¥r videre, og UI viser `Nogle DDM-kortdata kunne ikke indlÃ¦ses`.

### UI
- Progress vises som overlay med `IndlÃ¦ser DDM-kortdata: 0%` ved start.
- Ved 100% vises `DDM-kortdata klar`, og overlay skjules efter et kort delay.

### Bevaret
- Progress pÃ¥virker ikke rute, navigation, GPS, hjemhavn, gemte ruter eller TrollingMode.

## Ã†ndringer i v42.0

Denne version tilfÃ¸jer synlig progress/status under dynamisk DDM tile-loading, sÃ¥ brugeren kan se, at kortdata hentes for synligt kortomrÃ¥de eller ruteberegning.

### TilfÃ¸jet
- Topstatus viser `IndlÃ¦ser DDM-kortdata: XX%`, mens nÃ¸dvendige depth/routing/contour tiles hentes.
- Progressbar opdateres lÃ¸bende ud fra `loadedTiles / totalTiles`.
- Allerede indlÃ¦ste tiles tÃ¦ller med i procenten, og baren skjules fÃ¸rst, nÃ¥r alle nÃ¸dvendige tiles enten er loaded eller fejlet.
- Hvis en eller flere tiles fejler, vises `Nogle kortdata kunne ikke indlÃ¦ses`.

### Bevaret
- Progress-state Ã¦ndrer ikke rute, navigation, GPS, hjemhavn, gemte ruter eller TrollingMode.
- DDM tile-arkitektur, water-only routing og TrollingMode fra v41 er bevaret.

### Testet fokus
- Synligt kortomrÃ¥de med flere depth/contour tiles.
- Ruteberegning med flere route/depth tiles.
- `Ryd rute` og eksisterende brugerdata-state pÃ¥virkes ikke af tile-progress.

## Ã†ndringer i v41.0

Denne version skifter Danmark-dÃ¦kningen fra store runtime-filer til DDM tiles, sÃ¥ browseren ikke indlÃ¦ser Ã©n samlet Denmark GeoJSON eller decoder hele Denmark routing-grid ved app-start.

### TilfÃ¸jet
- `data/tiles/ddm-tile-manifest.json` med installerede DDM depth/routing-tiles og contour-tiles.
- Dynamisk loading af tiles for synligt kortomrÃ¥de via Leaflet `moveend/zoomend`.
- Multi-tile water-only routing: fÃ¸r A* starter, hentes DDM depth-tiles for ruteomrÃ¥det, sÃ¥ lÃ¦ngere ture kan gÃ¥ pÃ¥ tvÃ¦rs af tiles.
- `Settings â†’ KortomrÃ¥der` viser installerede regioner, loaded tile-cache og forberedt â€œDownload senereâ€-flow.
- Regioner i manifestet: Isefjord/Hundested/LynÃ¦s/RÃ¸rvig, Kattegat, Ã˜resund, StorebÃ¦lt, LillebÃ¦lt, Limfjorden og Bornholm.

### Datagrundlag
- Tiles er genereret med `tools/generate-ddm-tiles.js`.
- Kildeartefakterne er de eksisterende DDM-afledte filer fra `ddm_50m.dybde.tiff`: `data/depth-grid-ddm-denmark-rle.json`, `data/contours-local.geojson` og `data/contours-denmark-coarse.geojson`.
- Ingen placeholder-/demo-dybder er brugt i v41.
- Service worker precacher kun app-shell, manifest og verifikationsfiler; depth/contour tiles caches on-demand.

### Testet fokus
- App-start loader kun tile-manifest + synlige tiles.
- Fri navigation og TrollingMode bevarer DDM water-only routing.
- Ruter uden for det gamle lokalomrÃ¥de kan beregnes ved at hente flere DDM tiles.

## Ã†ndringer i v40.0

Denne version retter ruteplanlÃ¦gningsflowet, sÃ¥ kortvalg og menu-flow fungerer uden GPS, og sÃ¥ Trolling-menuen kun viser trollingrelevante valg.

### Rettet
- `VÃ¦lg start` og `VÃ¦lg slut` lukker popup/modal, sÃ¦tter appen i kortvalg-mode og lader brugeren klikke punktet direkte pÃ¥ kortet.
- Manuel start/slut fungerer uden GPS og bevarer DDM water-only routing.
- `NavigÃ©r hertil` og `NavigÃ©r hjem` bruger fri navigation med DDM water-only routing i stedet for utilsigtet TrollingMode.
- `Ryd rute` rydder kun aktiv rute, start/slut og navigation. Hjemhavn, settings og gemte ruter bevares.

### TilfÃ¸jet
- Fri navigation er flyttet til Navigation-sektionen med egen minimumsdybde.
- Trolling-menuen er forenklet til trollingdybde, tolerance, start/slut for trollingstrÃ¦k, gem/vÃ¦lg trollingrute, vend retning og start/stop trolling.
- Trolling-menuen viser en filtreret liste over gemte trollingruter.

### Datagrundlag
- v40 bruger samme faktiske DDM 2024-data som v38/v39.
- Ingen placeholder-/demo-dybder er brugt i v40.

## Ã†ndringer i v39.0

Denne version retter lÃ¦sbarhed i sejlretning-op og tilfÃ¸jer en ren GPS-centrering uden at nulstille rute, navigation, TrollingMode eller hjemhavn.

### Rettet
- 1/2/3 NM kurslinje-labels modroteres i sejlretning-op, sÃ¥ de altid stÃ¥r vandret.
- Kortklik-popupens menu modroteres i sejlretning-op, sÃ¥ popup-UI forbliver lÃ¦sbar.
- Skift til sejlretning-op hÃ¥ndterer ogsÃ¥ COG 0Â° uden at springe rotationsstatus over.

### TilfÃ¸jet
- `CentrÃ©r GPS` i hovedpanelet. Knappen panorerer kun kortet til aktuel GPS-position og Ã¦ndrer ikke brugerdata, rutevalg, navigationstilstand eller hjemhavn.

### Datagrundlag
- v39 bruger samme faktiske DDM 2024-data som v38.
- Ingen placeholder-/demo-dybder er brugt i v39.

## Ã†ndringer i v38.0

Denne version er fÃ¸rste rigtige skridt mod lÃ¦ngere ture og Danmark-dÃ¦kning baseret pÃ¥ de faktiske DDM-data, som brugeren uploadede.

### TilfÃ¸jet
- Danmark-dÃ¦kkende DDM coarse routing-grid genereret fra `ddm_50m.dybde.tiff`.
- Eksisterende Hundested/LynÃ¦s/RÃ¸rvig omrÃ¥de bevares som hÃ¸jere oplÃ¸st lokalt grid.
- Appen vÃ¦lger automatisk lokalt grid, nÃ¥r start/slut ligger i lokalomrÃ¥det.
- Appen falder tilbage til Danmark-grid, nÃ¥r man planlÃ¦gger lÃ¦ngere ruter uden for lokalomrÃ¥det.
- Coarse Danmark-dybdekurver til oversigtsvisning.
- Kort-klik, NavigÃ©r hjem, Trolling-menu, gemte ruter, hjemhavn, kurslinje og ETA bevares.

### Datagrundlag
- Kilde: Danmarks Dybdemodel 2024, `ddm_50m.dybde.tiff`.
- Lokalt grid: ca. 0.001Â° for Hundested/LynÃ¦s/RÃ¸rvig.
- Danmark-grid: ca. 0.005Â° til lÃ¦ngere ture og bredere dÃ¦kning.
- Ingen placeholder-/demo-dybder er brugt i v38.

### Vigtigt
DDM-data er bathymetrisk modeldata og mÃ¥ ikke bruges som eneste sikkerhedsnavigation. Brug altid officielle sÃ¸kort, lokalkendskab og almindeligt sÃ¸mandskab.

## Filer
- `data/depth-grid-ddm.json` â€” lokalt hÃ¸jere oplÃ¸st DDM-grid.
- `data/depth-grid-ddm-denmark-rle.json` â€” Danmark-dÃ¦kkende coarse DDM-grid, RLE-komprimeret.
- `data/contours-local.geojson` â€” lokale DDM-contours.
- `data/contours-denmark-coarse.geojson` â€” coarse DDM-contours til stÃ¸rre omrÃ¥de.
- `data/tiles/ddm-tile-manifest.json` â€” runtime manifest for DDM tiles.
- `data/tiles/depth/*.json` â€” RLE-komprimerede DDM depth/routing-tiles.
- `data/tiles/contours/*.geojson` â€” geografisk klippede DDM contour-tiles.
- `data/ddm-tile-verification.json` â€” tile-counts, regionstatus og celle-counts.
- `tools/generate-ddm-tiles.js` â€” generator for DDM tile-arkitekturen.
