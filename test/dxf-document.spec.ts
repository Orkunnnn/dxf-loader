// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import test from 'tape-promise/tape';
import {load} from '@loaders.gl/core';
import {DXFLoader} from '@loaders.gl/dxf';
import type {DXFDocument} from '@loaders.gl/dxf';

const MINIMAL_URL = '@loaders.gl/dxf/test/data/minimal.dxf';
const CIRCLES_ARCS_URL = '@loaders.gl/dxf/test/data/circles-arcs.dxf';
const LAYERS_URL = '@loaders.gl/dxf/test/data/layers.dxf';
const COMPLEX_URL = '@loaders.gl/dxf/test/data/complex.dxf';

function isDXFDocument(result: any): result is DXFDocument {
  return result && Array.isArray(result.entities) && result.tables && result.header !== undefined;
}

test('DXFLoader#dxf-document returns DXFDocument', async (t) => {
  const result = await load(MINIMAL_URL, DXFLoader, {dxf: {shape: 'dxf-document'}});
  t.ok(isDXFDocument(result), 'result is DXFDocument');
  if (isDXFDocument(result)) {
    t.ok(result.header, 'has header');
    t.ok(result.tables, 'has tables');
    t.ok(result.blocks instanceof Map, 'blocks is Map');
    t.ok(Array.isArray(result.entities), 'entities is array');
    t.equal(result.entities.length, 1, 'has 1 entity');
    t.equal(result.entities[0].type, 'LINE', 'entity is LINE');
  }
  t.end();
});

test('DXFLoader#dxf-document preserves entity details', async (t) => {
  const result = await load(CIRCLES_ARCS_URL, DXFLoader, {dxf: {shape: 'dxf-document'}});
  if (isDXFDocument(result)) {
    t.equal(result.entities.length, 2, 'has 2 entities');

    const circle = result.entities.find((e) => e.type === 'CIRCLE');
    t.ok(circle, 'has CIRCLE entity');
    if (circle && circle.type === 'CIRCLE') {
      t.ok(circle.center, 'circle has center');
      t.ok(typeof circle.radius === 'number', 'circle has radius');
    }

    const arc = result.entities.find((e) => e.type === 'ARC');
    t.ok(arc, 'has ARC entity');
    if (arc && arc.type === 'ARC') {
      t.ok(arc.center, 'arc has center');
      t.ok(typeof arc.radius === 'number', 'arc has radius');
      t.ok(typeof arc.startAngle === 'number', 'arc has startAngle');
      t.ok(typeof arc.endAngle === 'number', 'arc has endAngle');
    }
  }
  t.end();
});

test('DXFLoader#dxf-document preserves layers', async (t) => {
  const result = await load(LAYERS_URL, DXFLoader, {dxf: {shape: 'dxf-document'}});
  if (isDXFDocument(result)) {
    t.ok(result.tables.layers instanceof Map, 'layers is Map');
    t.ok(result.tables.layers.size > 0, 'has layers');
  }
  t.end();
});

test('DXFLoader#dxf-document complex drawing', async (t) => {
  const result = await load(COMPLEX_URL, DXFLoader, {dxf: {shape: 'dxf-document'}});
  if (isDXFDocument(result)) {
    t.ok(result.entities.length >= 8, `has ${result.entities.length} entities`);

    const entityTypes = new Set(result.entities.map((e) => e.type));
    t.ok(entityTypes.has('LINE'), 'has LINE entities');
    t.ok(entityTypes.has('ARC'), 'has ARC entities');
    t.ok(entityTypes.has('CIRCLE'), 'has CIRCLE entities');
  }
  t.end();
});
