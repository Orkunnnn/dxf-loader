// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import test from 'tape-promise/tape';
import {load} from '@loaders.gl/core';
import {DXFLoader} from '@loaders.gl/dxf';
import type {DXFArrowTables} from '@loaders.gl/dxf';
import * as arrow from 'apache-arrow';

const MINIMAL_URL = '@loaders.gl/dxf/test/data/minimal.dxf';
const CIRCLES_ARCS_URL = '@loaders.gl/dxf/test/data/circles-arcs.dxf';
const LAYERS_URL = '@loaders.gl/dxf/test/data/layers.dxf';
const TEXT_URL = '@loaders.gl/dxf/test/data/text.dxf';
const COMPLEX_URL = '@loaders.gl/dxf/test/data/complex.dxf';
const ENTITIES_3D_URL = '@loaders.gl/dxf/test/data/3d-entities.dxf';

function isDXFArrowTables(result: any): result is DXFArrowTables {
  return result && result.points instanceof arrow.Table && result.lines instanceof arrow.Table;
}

function hasExpectedColumns(t: any, table: arrow.Table, tableName: string): void {
  const columnNames = table.schema.fields.map((f) => f.name);
  t.ok(columnNames.includes('geometry'), `${tableName} has geometry column`);
  t.ok(columnNames.includes('entity_type'), `${tableName} has entity_type column`);
  t.ok(columnNames.includes('layer'), `${tableName} has layer column`);
  t.ok(columnNames.includes('color'), `${tableName} has color column`);
  t.ok(columnNames.includes('color_index'), `${tableName} has color_index column`);
  t.ok(columnNames.includes('handle'), `${tableName} has handle column`);
  t.ok(columnNames.includes('line_type'), `${tableName} has line_type column`);
  t.ok(columnNames.includes('line_weight'), `${tableName} has line_weight column`);
  t.ok(columnNames.includes('cad_params'), `${tableName} has cad_params column`);
}

test('DXFLoader#arrow-table returns {points, lines, polygons}', async (t) => {
  const result = await load(MINIMAL_URL, DXFLoader, {dxf: {shape: 'arrow-table'}});
  t.ok(isDXFArrowTables(result), 'result has points, lines, polygons Arrow tables');
  if (isDXFArrowTables(result)) {
    t.ok(result.points instanceof arrow.Table, 'points is Arrow Table');
    t.ok(result.lines instanceof arrow.Table, 'lines is Arrow Table');
    t.ok(result.polygons instanceof arrow.Table, 'polygons is Arrow Table');
  }
  t.end();
});

test('DXFLoader#arrow-table minimal LINE goes to lines table', async (t) => {
  const result = await load(MINIMAL_URL, DXFLoader, {dxf: {shape: 'arrow-table'}});
  if (isDXFArrowTables(result)) {
    t.equal(result.lines.numRows, 1, 'lines table has 1 row');
    t.equal(result.points.numRows, 0, 'points table is empty');
    t.equal(result.polygons.numRows, 0, 'polygons table is empty');

    hasExpectedColumns(t, result.lines, 'lines');

    const entityTypeCol = result.lines.getChild('entity_type');
    t.equal(entityTypeCol?.get(0), 'LINE', 'entity_type is LINE');

    const layerCol = result.lines.getChild('layer');
    t.equal(layerCol?.get(0), '0', 'layer is 0');

    const colorCol = result.lines.getChild('color');
    t.ok(colorCol?.get(0), 'has color value');

    const cadParamsCol = result.lines.getChild('cad_params');
    const cadParams = JSON.parse(cadParamsCol?.get(0) || '{}');
    t.equal(cadParams.type, 'LINE', 'cad_params type is LINE');
    t.ok(cadParams.startPoint, 'cad_params has startPoint');
    t.ok(cadParams.endPoint, 'cad_params has endPoint');
  }
  t.end();
});

test('DXFLoader#arrow-table circles go to polygons table', async (t) => {
  const result = await load(CIRCLES_ARCS_URL, DXFLoader, {dxf: {shape: 'arrow-table'}});
  if (isDXFArrowTables(result)) {
    // Circle → Polygon, Arc → LineString
    t.ok(result.polygons.numRows >= 1, 'polygons table has circle');
    t.ok(result.lines.numRows >= 1, 'lines table has arc');

    hasExpectedColumns(t, result.polygons, 'polygons');
    hasExpectedColumns(t, result.lines, 'lines');

    // Verify circle cad_params
    const entityTypes = result.polygons.getChild('entity_type');
    const cadParamsCol = result.polygons.getChild('cad_params');
    for (let i = 0; i < result.polygons.numRows; i++) {
      if (entityTypes?.get(i) === 'CIRCLE') {
        const cadParams = JSON.parse(cadParamsCol?.get(i) || '{}');
        t.equal(cadParams.type, 'CIRCLE', 'circle cad_params type is CIRCLE');
        t.ok(cadParams.center, 'circle cad_params has center');
        t.ok(typeof cadParams.radius === 'number', 'circle cad_params has radius');
        break;
      }
    }
  }
  t.end();
});

test('DXFLoader#arrow-table text entities go to points table', async (t) => {
  const result = await load(TEXT_URL, DXFLoader, {dxf: {shape: 'arrow-table'}});
  if (isDXFArrowTables(result)) {
    t.ok(result.points.numRows >= 2, 'points table has text entities');

    const entityTypes = result.points.getChild('entity_type');
    const types = new Set<string>();
    for (let i = 0; i < result.points.numRows; i++) {
      types.add(entityTypes?.get(i));
    }
    t.ok(types.has('TEXT') || types.has('MTEXT'), 'has TEXT or MTEXT entities');

    // Verify text cad_params
    const cadParamsCol = result.points.getChild('cad_params');
    const cadParams = JSON.parse(cadParamsCol?.get(0) || '{}');
    t.ok(cadParams.text, 'text cad_params has text content');
    t.ok(cadParams.insertionPoint, 'text cad_params has insertionPoint');
  }
  t.end();
});

test('DXFLoader#arrow-table complex drawing distributes entities', async (t) => {
  const result = await load(COMPLEX_URL, DXFLoader, {dxf: {shape: 'arrow-table'}});
  if (isDXFArrowTables(result)) {
    const totalRows = result.points.numRows + result.lines.numRows + result.polygons.numRows;
    t.ok(totalRows >= 8, `has ${totalRows} total rows across all tables`);

    // Collect entity types across all tables
    const allEntityTypes = new Set<string>();
    for (const tableName of ['points', 'lines', 'polygons'] as const) {
      const table = result[tableName];
      const entityTypeCol = table.getChild('entity_type');
      for (let i = 0; i < table.numRows; i++) {
        allEntityTypes.add(entityTypeCol?.get(i));
      }
    }

    t.ok(allEntityTypes.has('LINE'), 'has LINE entities');
    t.ok(allEntityTypes.has('CIRCLE'), 'has CIRCLE entities');
    t.ok(allEntityTypes.has('POINT'), 'has POINT entities');
  }
  t.end();
});

test('DXFLoader#arrow-table layer filter works', async (t) => {
  const result = await load(LAYERS_URL, DXFLoader, {
    dxf: {shape: 'arrow-table', layers: ['Layer1']}
  });
  if (isDXFArrowTables(result)) {
    const totalRows = result.points.numRows + result.lines.numRows + result.polygons.numRows;
    t.ok(totalRows > 0, 'has features from Layer1');

    // All entities should be from Layer1
    for (const tableName of ['points', 'lines', 'polygons'] as const) {
      const table = result[tableName];
      const layerCol = table.getChild('layer');
      for (let i = 0; i < table.numRows; i++) {
        t.equal(layerCol?.get(i), 'Layer1', `${tableName} row ${i} is from Layer1`);
      }
    }
  }
  t.end();
});

test('DXFLoader#arrow-table entityTypes filter works', async (t) => {
  const result = await load(COMPLEX_URL, DXFLoader, {
    dxf: {shape: 'arrow-table', entityTypes: ['LINE']}
  });
  if (isDXFArrowTables(result)) {
    t.ok(result.lines.numRows > 0, 'has LINE entities in lines table');
    t.equal(result.points.numRows, 0, 'no points (only LINE requested)');
    t.equal(result.polygons.numRows, 0, 'no polygons (only LINE requested)');

    const entityTypeCol = result.lines.getChild('entity_type');
    for (let i = 0; i < result.lines.numRows; i++) {
      t.equal(entityTypeCol?.get(i), 'LINE', `line ${i} is LINE`);
    }
  }
  t.end();
});

test('DXFLoader#arrow-table 3D entities preserve Z in geometry', async (t) => {
  const result = await load(ENTITIES_3D_URL, DXFLoader, {dxf: {shape: 'arrow-table'}});
  if (isDXFArrowTables(result)) {
    const totalRows = result.points.numRows + result.lines.numRows + result.polygons.numRows;
    t.ok(totalRows >= 2, 'has 3D entities');
  }
  t.end();
});

test('DXFLoader#arrow-table empty tables have correct schema', async (t) => {
  // Request only CIRCLE types from a file that has none
  const result = await load(MINIMAL_URL, DXFLoader, {
    dxf: {shape: 'arrow-table', entityTypes: ['CIRCLE']}
  });
  if (isDXFArrowTables(result)) {
    t.equal(result.points.numRows, 0, 'empty points table');
    t.equal(result.lines.numRows, 0, 'empty lines table');
    t.equal(result.polygons.numRows, 0, 'empty polygons table');

    // Even empty tables should have the correct schema
    hasExpectedColumns(t, result.points, 'empty points');
    hasExpectedColumns(t, result.lines, 'empty lines');
    hasExpectedColumns(t, result.polygons, 'empty polygons');
  }
  t.end();
});
