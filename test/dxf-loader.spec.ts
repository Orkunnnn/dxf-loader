// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import test from 'tape-promise/tape';
import {validateLoader} from 'test/common/conformance';
import {load} from '@loaders.gl/core';
import {DXFLoader} from '@loaders.gl/dxf';

const MINIMAL_URL = '@loaders.gl/dxf/test/data/minimal.dxf';
const POLYLINES_URL = '@loaders.gl/dxf/test/data/polylines.dxf';
const CIRCLES_ARCS_URL = '@loaders.gl/dxf/test/data/circles-arcs.dxf';
const BLOCKS_URL = '@loaders.gl/dxf/test/data/blocks.dxf';
const LAYERS_URL = '@loaders.gl/dxf/test/data/layers.dxf';
const TEXT_URL = '@loaders.gl/dxf/test/data/text.dxf';
const ENTITIES_3D_URL = '@loaders.gl/dxf/test/data/3d-entities.dxf';
const COMPLEX_URL = '@loaders.gl/dxf/test/data/complex.dxf';
const AUTO_2018_URL = '@loaders.gl/dxf/test/data/auto_2018.dxf';

test('DXFLoader#loader conformance', (t) => {
  validateLoader(t, DXFLoader, 'DXFLoader');
  t.end();
});

test('DXFLoader#parse minimal LINE', async (t) => {
  const table = await load(MINIMAL_URL, DXFLoader);
  t.equal(table.shape, 'geojson-table', 'returns geojson-table by default');
  if (table.shape === 'geojson-table') {
    t.equal(table.features.length, 1, 'has 1 feature');
    const feature = table.features[0];
    t.equal(feature.geometry.type, 'LineString', 'geometry is LineString');
    t.deepEqual(
      feature.geometry.coordinates,
      [
        [0, 0],
        [10, 5]
      ],
      'has correct coordinates'
    );
    t.equal(feature.properties.entityType, 'LINE', 'entityType is LINE');
    t.equal(feature.properties.layer, '0', 'layer is 0');
    t.ok(feature.properties.color, 'has color property');
  }
  t.end();
});

test('DXFLoader#parse polylines', async (t) => {
  const table = await load(POLYLINES_URL, DXFLoader);
  if (table.shape === 'geojson-table') {
    t.equal(table.features.length, 2, 'has 2 features');

    // First polyline: open, no bulge
    const openPolyline = table.features[0];
    t.equal(openPolyline.geometry.type, 'LineString', 'open polyline is LineString');
    t.equal(openPolyline.geometry.coordinates.length, 4, 'has 4 vertices');

    // Second polyline: closed, with bulge on first vertex
    const closedPolyline = table.features[1];
    t.equal(closedPolyline.geometry.type, 'Polygon', 'closed polyline is Polygon');
    t.ok(
      closedPolyline.geometry.coordinates[0].length > 4,
      'has additional arc interpolation points'
    );
  }
  t.end();
});

test('DXFLoader#parse circles and arcs', async (t) => {
  const table = await load(CIRCLES_ARCS_URL, DXFLoader);
  if (table.shape === 'geojson-table') {
    t.equal(table.features.length, 2, 'has 2 features');

    const circle = table.features[0];
    t.equal(circle.geometry.type, 'Polygon', 'circle is Polygon');
    t.equal(circle.geometry.coordinates[0].length, 73, 'circle has 72 segments + closing point');

    const arc = table.features[1];
    t.equal(arc.geometry.type, 'LineString', 'arc is LineString');
    t.ok(arc.geometry.coordinates.length > 2, 'arc has tessellated points');
  }
  t.end();
});

test('DXFLoader#parse blocks with INSERT', async (t) => {
  const table = await load(BLOCKS_URL, DXFLoader);
  if (table.shape === 'geojson-table') {
    // Each INSERT expands 2 lines from block, so 2 INSERT = 4 features
    t.equal(table.features.length, 4, 'has 4 features from 2 block insertions');

    // First INSERT: scale=2, rotation=0, position=(5,5)
    const firstLine = table.features[0];
    t.equal(firstLine.geometry.type, 'LineString', 'is LineString');
    // The block line (0,0)-(1,0) scaled by 2 and translated to (5,5)
    const coords = firstLine.geometry.coordinates;
    t.ok(Math.abs(coords[0][0] - 5) < 0.01, 'x start is transformed');
    t.ok(Math.abs(coords[0][1] - 5) < 0.01, 'y start is transformed');
  }
  t.end();
});

test('DXFLoader#parse layers', async (t) => {
  // Without frozen layer filtering (default)
  const table = await load(LAYERS_URL, DXFLoader);
  if (table.shape === 'geojson-table') {
    t.equal(table.features.length, 3, 'has 3 features (frozen layer excluded)');

    const layers = table.features.map((f) => f.properties.layer);
    t.ok(layers.includes('Layer1'), 'has Layer1 entity');
    t.ok(layers.includes('Layer2'), 'has Layer2 entity');
    t.ok(!layers.includes('FrozenLayer'), 'FrozenLayer is excluded');
  }

  // Include frozen layers
  const tableWithFrozen = await load(LAYERS_URL, DXFLoader, {
    dxf: {includeFrozenLayers: true}
  });
  if (tableWithFrozen.shape === 'geojson-table') {
    t.equal(tableWithFrozen.features.length, 4, 'has 4 features with frozen layers');
  }

  // Filter by specific layers
  const filteredTable = await load(LAYERS_URL, DXFLoader, {dxf: {layers: ['Layer1']}});
  if (filteredTable.shape === 'geojson-table') {
    t.equal(filteredTable.features.length, 2, 'has 2 features from Layer1');
    t.ok(
      filteredTable.features.every((f) => f.properties.layer === 'Layer1'),
      'all from Layer1'
    );
  }
  t.end();
});

test('DXFLoader#parse text entities', async (t) => {
  const table = await load(TEXT_URL, DXFLoader);
  if (table.shape === 'geojson-table') {
    t.equal(table.features.length, 2, 'has 2 features');

    const textFeature = table.features[0];
    t.equal(textFeature.geometry.type, 'Point', 'TEXT is Point');
    t.equal(textFeature.properties.text, 'Hello World', 'has correct text');
    t.equal(textFeature.properties.textHeight, 0.5, 'has correct text height');

    const mtextFeature = table.features[1];
    t.equal(mtextFeature.geometry.type, 'Point', 'MTEXT is Point');
    t.equal(mtextFeature.properties.text, 'Multi-line text', 'has correct MTEXT content');
  }
  t.end();
});

test('DXFLoader#parse 3D entities', async (t) => {
  const table = await load(ENTITIES_3D_URL, DXFLoader);
  if (table.shape === 'geojson-table') {
    t.equal(table.features.length, 2, 'has 2 features');

    const face = table.features[0];
    t.equal(face.geometry.type, 'Polygon', '3DFACE is Polygon');
    // Check Z coordinates are preserved
    const ring = face.geometry.coordinates[0];
    t.equal(ring[2][2], 5, 'Z coordinate preserved');

    const line = table.features[1];
    t.equal(line.geometry.type, 'LineString', 'LINE is LineString');
    t.equal(line.geometry.coordinates[1][2], 10, '3D line Z preserved');
  }

  // Test with include3D=false
  const table2D = await load(ENTITIES_3D_URL, DXFLoader, {dxf: {include3D: false}});
  if (table2D.shape === 'geojson-table') {
    const face2D = table2D.features[0];
    const ring2D = face2D.geometry.coordinates[0];
    t.equal(ring2D[0].length, 2, '2D mode strips Z coordinates');
  }
  t.end();
});

test('DXFLoader#parse complex drawing', async (t) => {
  const table = await load(COMPLEX_URL, DXFLoader);
  if (table.shape === 'geojson-table') {
    t.ok(table.features.length >= 8, 'has multiple features from mixed entity types');

    const entityTypes = table.features.map((f) => f.properties.entityType);
    t.ok(entityTypes.includes('LINE'), 'has LINE entities');
    t.ok(entityTypes.includes('ARC'), 'has ARC entities');
    t.ok(entityTypes.includes('CIRCLE'), 'has CIRCLE entities');
    t.ok(entityTypes.includes('POINT'), 'has POINT entities');
    t.ok(entityTypes.includes('TEXT'), 'has TEXT entities');
  }
  t.end();
});

test('DXFLoader#object-row-table shape', async (t) => {
  const table = await load(MINIMAL_URL, DXFLoader, {dxf: {shape: 'object-row-table'}});
  t.equal(table.shape, 'object-row-table', 'returns object-row-table');
  if (table.shape === 'object-row-table') {
    t.equal(table.data.length, 1, 'has 1 row');
    t.ok(table.data[0].geometry, 'row has geometry');
  }
  t.end();
});

test('DXFLoader#entityTypes filter', async (t) => {
  const table = await load(COMPLEX_URL, DXFLoader, {dxf: {entityTypes: ['LINE']}});
  if (table.shape === 'geojson-table') {
    t.ok(
      table.features.every((f) => f.properties.entityType === 'LINE'),
      'only LINE entities returned'
    );
    t.equal(table.features.length, 4, 'has 4 LINE features');
  }
  t.end();
});

test('DXFLoader#parse real AutoCAD 2018 file', async (t) => {
  const table = await load(AUTO_2018_URL, DXFLoader);
  t.equal(table.shape, 'geojson-table', 'returns geojson-table');
  if (table.shape === 'geojson-table') {
    t.ok(table.features.length > 1000, `has many features (${table.features.length})`);

    // Check entity types present
    const entityTypeCounts: Record<string, number> = {};
    for (const feature of table.features) {
      const entityType = feature.properties?.entityType as string;
      entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;
    }

    t.ok(entityTypeCounts.LINE > 0, `has LINE entities (${entityTypeCounts.LINE})`);
    t.ok(entityTypeCounts.ARC > 0, `has ARC entities (${entityTypeCounts.ARC})`);
    t.ok(entityTypeCounts.CIRCLE > 0, `has CIRCLE entities (${entityTypeCounts.CIRCLE})`);
    t.ok(entityTypeCounts.TEXT > 0, `has TEXT entities (${entityTypeCounts.TEXT})`);
    t.ok(entityTypeCounts.MTEXT > 0, `has MTEXT entities (${entityTypeCounts.MTEXT})`);
    t.ok(
      entityTypeCounts.LWPOLYLINE > 0,
      `has LWPOLYLINE entities (${entityTypeCounts.LWPOLYLINE})`
    );

    // Check all features have valid properties
    for (const feature of table.features) {
      t.ok(feature.properties?.layer, 'feature has layer');
      t.ok(feature.properties?.entityType, 'feature has entityType');
      t.ok(feature.properties?.color, 'feature has color');
      t.ok(feature.geometry, 'feature has geometry');
      t.ok(feature.geometry.type, 'geometry has type');
      break; // Just check first feature to avoid extremely long output
    }

    // Check that layer filtering works on the real file
    const layers = new Set(table.features.map((f) => f.properties?.layer as string));
    t.ok(layers.size > 1, `has multiple layers (${layers.size})`);
  }
  t.end();
});

test('DXFLoader#AutoCAD 2018 with layer filter', async (t) => {
  // Get all features first to find a valid layer name
  const fullTable = await load(AUTO_2018_URL, DXFLoader);
  if (fullTable.shape === 'geojson-table' && fullTable.features.length > 0) {
    const firstLayer = fullTable.features[0].properties?.layer as string;

    // Load with layer filter
    const filteredTable = await load(AUTO_2018_URL, DXFLoader, {
      dxf: {layers: [firstLayer]}
    });
    if (filteredTable.shape === 'geojson-table') {
      t.ok(filteredTable.features.length > 0, 'filtered table has features');
      t.ok(
        filteredTable.features.length < fullTable.features.length,
        'filtered table has fewer features'
      );
      t.ok(
        filteredTable.features.every((f) => f.properties?.layer === firstLayer),
        `all features on layer "${firstLayer}"`
      );
    }
  }
  t.end();
});

test('DXFLoader#AutoCAD 2018 entity type filter', async (t) => {
  const table = await load(AUTO_2018_URL, DXFLoader, {
    dxf: {entityTypes: ['CIRCLE']}
  });
  if (table.shape === 'geojson-table') {
    t.ok(table.features.length > 0, `has CIRCLE features (${table.features.length})`);
    t.ok(
      table.features.every((f) => f.properties?.entityType === 'CIRCLE'),
      'all features are CIRCLEs'
    );
    t.ok(
      table.features.every((f) => f.geometry.type === 'Polygon'),
      'all circles are Polygons'
    );
  }
  t.end();
});

test('DXFLoader#AutoCAD 2018 as object-row-table', async (t) => {
  const table = await load(AUTO_2018_URL, DXFLoader, {
    dxf: {shape: 'object-row-table', entityTypes: ['LINE']}
  });
  t.equal(table.shape, 'object-row-table', 'returns object-row-table');
  if (table.shape === 'object-row-table') {
    t.ok(table.data.length > 0, `has data rows (${table.data.length})`);
    t.ok(table.data[0].geometry, 'first row has geometry');
    t.ok(table.data[0].properties, 'first row has properties');
  }
  t.end();
});
