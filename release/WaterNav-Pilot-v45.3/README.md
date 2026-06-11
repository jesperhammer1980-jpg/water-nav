# WaterNav Pilot v45.3

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
