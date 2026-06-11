'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const TILE_DIR = path.join(DATA_DIR, 'tiles');
const DEPTH_DIR = path.join(TILE_DIR, 'depth');
const CONTOUR_DIR = path.join(TILE_DIR, 'contours');
const VERSION = 'v45.3';
const TILE_SIZE = 96;

const REGIONS = [
  {
    id: 'isefjord-hundested-lynaes-roervig',
    name: 'Isefjord/Hundested/Lynæs/Rørvig',
    bounds: { latMin: 55.78, latMax: 56.18, lngMin: 11.35, lngMax: 12.25 }
  },
  {
    id: 'kattegat',
    name: 'Kattegat',
    bounds: { latMin: 55.75, latMax: 58.0, lngMin: 9.7, lngMax: 13.1 }
  },
  {
    id: 'oeresund',
    name: 'Øresund',
    bounds: { latMin: 54.95, latMax: 56.35, lngMin: 12.0, lngMax: 13.35 }
  },
  {
    id: 'storebaelt',
    name: 'Storebælt',
    bounds: { latMin: 54.55, latMax: 56.35, lngMin: 10.35, lngMax: 11.55 }
  },
  {
    id: 'lillebaelt',
    name: 'Lillebælt',
    bounds: { latMin: 54.55, latMax: 55.9, lngMin: 9.25, lngMax: 10.35 }
  },
  {
    id: 'limfjorden',
    name: 'Limfjorden',
    bounds: { latMin: 56.45, latMax: 57.25, lngMin: 8.0, lngMax: 10.45 }
  },
  {
    id: 'bornholm',
    name: 'Bornholm',
    bounds: { latMin: 54.85, latMax: 55.45, lngMin: 14.45, lngMax: 15.45 }
  }
];

function main() {
  const rawGrid = readJson(path.join(DATA_DIR, 'depth-grid-ddm-denmark-rle.json'));
  if (!rawGrid || rawGrid.encoding !== 'row-rle-count-value') {
    throw new Error('Expected data/depth-grid-ddm-denmark-rle.json with row-rle-count-value encoding.');
  }

  const grid = decodeRleGrid(rawGrid);
  const contours = readContourSources();

  resetOutputDirectory();
  const tiles = [];

  for (let row0 = 0; row0 < grid.rows; row0 += TILE_SIZE) {
    for (let col0 = 0; col0 < grid.cols; col0 += TILE_SIZE) {
      const rows = Math.min(TILE_SIZE, grid.rows - row0);
      const cols = Math.min(TILE_SIZE, grid.cols - col0);
      const id = tileId(row0, col0);
      const bounds = tileBounds(rawGrid.bounds, rawGrid.step, row0, col0, rows, cols);
      const depthRows = [];
      let validCells = 0;
      let waterCells = 0;
      let minDepth = Infinity;
      let maxDepth = -Infinity;

      for (let r = 0; r < rows; r++) {
        const src = grid.data[row0 + r].slice(col0, col0 + cols);
        for (const value of src) {
          if (Number.isFinite(value)) {
            validCells++;
            if (value >= 0.4) waterCells++;
            if (value < minDepth) minDepth = value;
            if (value > maxDepth) maxDepth = value;
          }
        }
        depthRows.push(encodeRleRow(src));
      }

      if (!validCells) continue;

      const depthFile = `depth/${id}.json`;
      writeJson(path.join(DEPTH_DIR, `${id}.json`), {
        schema: 'waternav-ddm-depth-tile-rle-v1',
        version: VERSION,
        tileId: id,
        source: 'Danmarks Dybdemodel 2024 ddm_50m.dybde.tiff via bundled DDM Denmark RLE grid',
        runtimeSource: 'data/depth-grid-ddm-denmark-rle.json',
        crs: rawGrid.crs || 'EPSG:4326',
        bounds,
        step: rawGrid.step,
        row0,
        col0,
        rows,
        cols,
        depthUnit: rawGrid.depthUnit || 'm',
        nodata: rawGrid.nodata ?? null,
        validCells,
        waterCells,
        minDepth: finiteOrNull(minDepth),
        maxDepth: finiteOrNull(maxDepth),
        encoding: 'row-rle-count-value',
        dataRle: depthRows
      });

      const contourFeatures = contourFeaturesForTile(contours, bounds);
      const contourFile = contourFeatures.length ? `contours/${id}.geojson` : null;
      if (contourFile) {
        writeJson(path.join(CONTOUR_DIR, `${id}.geojson`), {
          type: 'FeatureCollection',
          name: `DDM contour tile ${id}`,
          bbox: [bounds.lngMin, bounds.latMin, bounds.lngMax, bounds.latMax],
          metadata: {
            schema: 'waternav-ddm-contour-tile-v1',
            version: VERSION,
            tileId: id,
            source: 'Danmarks Dybdemodel 2024 ddm_50m.dybde.tiff via bundled DDM contour GeoJSON files'
          },
          features: contourFeatures
        });
      }

      const regionIds = REGIONS
        .filter(region => boundsIntersect(bounds, region.bounds))
        .map(region => region.id);

      tiles.push({
        id,
        row0,
        col0,
        rows,
        cols,
        bounds,
        depthFile,
        contourFile,
        validCells,
        waterCells,
        minDepth: finiteOrNull(minDepth),
        maxDepth: finiteOrNull(maxDepth),
        regions: regionIds
      });
    }
  }

  const regions = REGIONS.map(region => {
    const tileIds = tiles
      .filter(tile => tile.regions.includes(region.id))
      .map(tile => tile.id);
    return {
      ...region,
      installed: tileIds.length > 0,
      downloadPrepared: true,
      tileIds
    };
  });

  const manifest = {
    schema: 'waternav-ddm-tile-manifest-v1',
    version: VERSION,
    generated: new Date().toISOString(),
    source: {
      name: 'Danmarks Dybdemodel 2024',
      raster: 'ddm_50m.dybde.tiff',
      runtimeSource: 'data/depth-grid-ddm-denmark-rle.json',
      contours: ['data/contours-local.geojson', 'data/contours-denmark-coarse.geojson'],
      note: 'Tiles are generated from the bundled DDM-derived raster/contour files. No placeholder or synthetic depths are included.'
    },
    grid: {
      bounds: rawGrid.bounds,
      step: rawGrid.step,
      rows: rawGrid.rows,
      cols: rawGrid.cols,
      tileSize: TILE_SIZE,
      depthUnit: rawGrid.depthUnit || 'm',
      crs: rawGrid.crs || 'EPSG:4326'
    },
    tileRoot: './data/tiles',
    regions,
    tiles
  };

  writeJson(path.join(TILE_DIR, 'ddm-tile-manifest.json'), manifest);
  writeJson(path.join(DATA_DIR, 'ddm-tile-verification.json'), {
    version: VERSION,
    generated: manifest.generated,
    tileCount: tiles.length,
    contourTileCount: tiles.filter(tile => tile.contourFile).length,
    totalValidCells: tiles.reduce((sum, tile) => sum + tile.validCells, 0),
    totalWaterCells: tiles.reduce((sum, tile) => sum + tile.waterCells, 0),
    regions: regions.map(region => ({
      id: region.id,
      name: region.name,
      installed: region.installed,
      tileCount: region.tileIds.length
    }))
  });

  console.log(`Generated ${tiles.length} depth tiles and ${tiles.filter(tile => tile.contourFile).length} contour tiles.`);
}

function resetOutputDirectory() {
  fs.rmSync(TILE_DIR, { recursive: true, force: true });
  fs.mkdirSync(DEPTH_DIR, { recursive: true });
  fs.mkdirSync(CONTOUR_DIR, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function decodeRleGrid(raw) {
  const data = raw.dataRle.map(row => {
    const out = [];
    for (const pair of row) {
      const n = pair[0];
      const value = pair[1] === null ? null : Number(pair[1]);
      for (let i = 0; i < n; i++) out.push(value);
    }
    return out;
  });
  return { ...raw, data };
}

function encodeRleRow(row) {
  const out = [];
  let prev = normalizeDepth(row[0]);
  let count = 0;
  for (const raw of row) {
    const value = normalizeDepth(raw);
    if (sameDepth(value, prev)) {
      count++;
    } else {
      out.push([count, prev]);
      prev = value;
      count = 1;
    }
  }
  out.push([count, prev]);
  return out;
}

function normalizeDepth(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function sameDepth(a, b) {
  return a === b || (a === null && b === null);
}

function tileId(row0, col0) {
  const r = String(Math.floor(row0 / TILE_SIZE)).padStart(2, '0');
  const c = String(Math.floor(col0 / TILE_SIZE)).padStart(2, '0');
  return `r${r}_c${c}`;
}

function tileBounds(bounds, step, row0, col0, rows, cols) {
  return {
    latMin: roundCoord(bounds.latMin + row0 * step),
    latMax: roundCoord(bounds.latMin + (row0 + rows - 1) * step),
    lngMin: roundCoord(bounds.lngMin + col0 * step),
    lngMax: roundCoord(bounds.lngMin + (col0 + cols - 1) * step)
  };
}

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

function boundsIntersect(a, b) {
  return a.latMin <= b.latMax && a.latMax >= b.latMin && a.lngMin <= b.lngMax && a.lngMax >= b.lngMin;
}

function readContourSources() {
  const sources = [
    { file: 'contours-local.geojson', scope: 'local' },
    { file: 'contours-denmark-coarse.geojson', scope: 'denmark' }
  ];
  const out = [];
  for (const source of sources) {
    const geo = readJson(path.join(DATA_DIR, source.file));
    for (const feature of geo.features || []) {
      const lines = geometryToLines(feature.geometry);
      if (!lines.length) continue;
      const properties = { ...(feature.properties || {}), scope: source.scope, tileSource: source.file };
      const bbox = linesBbox(lines);
      if (!bbox) continue;
      out.push({ properties, lines, bbox });
    }
  }
  return out;
}

function geometryToLines(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  if (geometry.type === 'GeometryCollection') return geometry.geometries.flatMap(geometryToLines);
  return [];
}

function linesBbox(lines) {
  let lngMin = Infinity;
  let lngMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;
  for (const line of lines) {
    for (const coord of line) {
      if (!Array.isArray(coord) || coord.length < 2) continue;
      const lng = Number(coord[0]);
      const lat = Number(coord[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
      if (lng < lngMin) lngMin = lng;
      if (lng > lngMax) lngMax = lng;
    }
  }
  if (!Number.isFinite(latMin)) return null;
  return { latMin, latMax, lngMin, lngMax };
}

function contourFeaturesForTile(contours, bounds) {
  const padded = {
    latMin: bounds.latMin - 0.000001,
    latMax: bounds.latMax + 0.000001,
    lngMin: bounds.lngMin - 0.000001,
    lngMax: bounds.lngMax + 0.000001
  };
  const features = [];
  for (const contour of contours) {
    if (!boundsIntersect(contour.bbox, padded)) continue;
    for (const line of contour.lines) {
      const parts = clipLine(line, padded);
      for (const coords of parts) {
        if (coords.length < 2) continue;
        features.push({
          type: 'Feature',
          properties: contour.properties,
          geometry: { type: 'LineString', coordinates: coords }
        });
      }
    }
  }
  return features;
}

function clipLine(line, bounds) {
  const parts = [];
  let current = [];
  for (let i = 1; i < line.length; i++) {
    const clipped = clipSegment(line[i - 1], line[i], bounds);
    if (!clipped) {
      if (current.length > 1) parts.push(current);
      current = [];
      continue;
    }

    const coords = clipped.map(([lng, lat]) => [roundCoord(lng), roundCoord(lat)]);
    if (coords[0][0] === coords[1][0] && coords[0][1] === coords[1][1]) continue;

    if (!current.length) {
      current.push(coords[0], coords[1]);
    } else if (sameCoord(current[current.length - 1], coords[0])) {
      current.push(coords[1]);
    } else {
      if (current.length > 1) parts.push(current);
      current = [coords[0], coords[1]];
    }
  }
  if (current.length > 1) parts.push(current);
  return parts;
}

function sameCoord(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1];
}

function clipSegment(a, b, bounds) {
  let x0 = Number(a[0]);
  let y0 = Number(a[1]);
  let x1 = Number(b[0]);
  let y1 = Number(b[1]);
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;

  let code0 = clipCode(x0, y0, bounds);
  let code1 = clipCode(x1, y1, bounds);

  while (true) {
    if (!(code0 | code1)) return [[x0, y0], [x1, y1]];
    if (code0 & code1) return null;

    const outCode = code0 || code1;
    let x;
    let y;

    if (outCode & 8) {
      if (y1 === y0) return null;
      x = x0 + (x1 - x0) * (bounds.latMax - y0) / (y1 - y0);
      y = bounds.latMax;
    } else if (outCode & 4) {
      if (y1 === y0) return null;
      x = x0 + (x1 - x0) * (bounds.latMin - y0) / (y1 - y0);
      y = bounds.latMin;
    } else if (outCode & 2) {
      if (x1 === x0) return null;
      y = y0 + (y1 - y0) * (bounds.lngMax - x0) / (x1 - x0);
      x = bounds.lngMax;
    } else {
      if (x1 === x0) return null;
      y = y0 + (y1 - y0) * (bounds.lngMin - x0) / (x1 - x0);
      x = bounds.lngMin;
    }

    if (outCode === code0) {
      x0 = x;
      y0 = y;
      code0 = clipCode(x0, y0, bounds);
    } else {
      x1 = x;
      y1 = y;
      code1 = clipCode(x1, y1, bounds);
    }
  }
}

function clipCode(lng, lat, bounds) {
  let code = 0;
  if (lng < bounds.lngMin) code |= 1;
  else if (lng > bounds.lngMax) code |= 2;
  if (lat < bounds.latMin) code |= 4;
  else if (lat > bounds.latMax) code |= 8;
  return code;
}

main();
